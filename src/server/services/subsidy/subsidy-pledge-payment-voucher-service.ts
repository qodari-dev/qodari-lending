import { env } from '@/env';
import {
  creditsSettings,
  db,
  loanPayments,
  loans,
  paymentTenderTypes,
  subsidyPledgePaymentVoucherItems,
  subsidyPledgePaymentVouchers,
  userPaymentReceiptTypes,
} from '@/server/db';
import {
  getSubsidyPaymentsByPeriod,
  getSubsidyPledgeByMarkDocument,
} from '@/server/services/subsidy/subsidy-service';
import { extractUnknownErrorMessage } from '@/server/utils/error-utils';
import { throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { createLoanPaymentTx } from '@/server/utils/loan-payment-create';
import { normalizeUpperCase } from '@/server/utils/string-utils';
import { formatDateOnly, roundMoney, toDecimalString, toNumber } from '@/server/utils/value-utils';
import { and, desc, eq } from 'drizzle-orm';

type VoucherItemStatus = 'PROCESSED' | 'SKIPPED' | 'ERROR';

function toMoney(value: string | number | null | undefined) {
  return roundMoney(toNumber(value ?? 0));
}

function mapVoucherRow(item: typeof subsidyPledgePaymentVoucherItems.$inferSelect) {
  return {
    workerDocumentNumber: item.workerDocumentNumber,
    mark: item.subsidyMark,
    documentNumber: item.subsidyDocument,
    creditNumber: item.creditNumber,
    loanId: item.loanId,
    loanPaymentId: item.loanPaymentId,
    discountedAmount: toMoney(item.discountedAmount),
    appliedAmount: toMoney(item.appliedAmount),
    status: item.status,
    message: item.message ?? '',
  };
}

function mapVoucherSummary(item: typeof subsidyPledgePaymentVouchers.$inferSelect) {
  return {
    voucherId: item.id,
    period: item.period,
    movementGenerationDate: item.movementGenerationDate,
    subsidySource: item.subsidySource,
    status: item.status,
    totalRows: item.totalRows,
    processedCredits: item.processedCredits,
    processedPayments: item.processedPayments,
    skippedRows: item.skippedRows,
    errorRows: item.errorRows,
    totalDiscountedAmount: toMoney(item.totalDiscountedAmount),
    totalAppliedAmount: toMoney(item.totalAppliedAmount),
    message: item.message ?? '',
    startedAt: item.startedAt?.toISOString() ?? null,
    finishedAt: item.finishedAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
  };
}

async function insertVoucherItem(params: {
  voucherId: number;
  sourceFingerprint: string;
  workerDocumentNumber: string | null;
  subsidyMark: string | null;
  subsidyDocument: string | null;
  subsidyCrossDocumentNumber: string | null;
  creditNumber: string | null;
  loanId: number | null;
  loanPaymentId: number | null;
  discountedAmount: number;
  appliedAmount: number;
  status: VoucherItemStatus;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  await db.insert(subsidyPledgePaymentVoucherItems).values({
    voucherId: params.voucherId,
    sourceFingerprint: params.sourceFingerprint,
    workerDocumentNumber: params.workerDocumentNumber,
    subsidyMark: params.subsidyMark,
    subsidyDocument: params.subsidyDocument,
    subsidyCrossDocumentNumber: params.subsidyCrossDocumentNumber,
    creditNumber: params.creditNumber,
    loanId: params.loanId,
    loanPaymentId: params.loanPaymentId,
    discountedAmount: toDecimalString(params.discountedAmount),
    appliedAmount: params.appliedAmount > 0 ? toDecimalString(params.appliedAmount) : null,
    status: params.status,
    message: params.message,
    metadata: params.metadata ?? null,
  });
}

export async function enqueueSubsidyPledgePaymentVoucher(input: {
  period: string;
  movementGenerationDate: Date;
  userId: string;
  userName: string;
}) {
  const normalizedPeriod = normalizeUpperCase(input.period);
  const movementGenerationDate = formatDateOnly(input.movementGenerationDate);

  const settings = await db.query.creditsSettings.findFirst({
    where: eq(creditsSettings.appSlug, env.IAM_APP_SLUG),
    columns: {
      pledgePaymentReceiptTypeId: true,
      pledgeSubsidyGlAccountId: true,
    },
  });

  if (!settings?.pledgePaymentReceiptTypeId) {
    throwHttpError({
      status: 400,
      message: 'Debe configurar el tipo de recibo para pignoracion de subsidio',
      code: 'BAD_REQUEST',
    });
  }

  if (!settings?.pledgeSubsidyGlAccountId) {
    throwHttpError({
      status: 400,
      message: 'Debe configurar el auxiliar contable para pignoracion de subsidio',
      code: 'BAD_REQUEST',
    });
  }

  const assignedReceiptType = await db.query.userPaymentReceiptTypes.findFirst({
    where: and(
      eq(userPaymentReceiptTypes.userId, input.userId),
      eq(userPaymentReceiptTypes.paymentReceiptTypeId, settings.pledgePaymentReceiptTypeId)
    ),
    with: {
      paymentReceiptType: {
        columns: {
          movementType: true,
          isActive: true,
        },
      },
    },
  });

  if (!assignedReceiptType?.paymentReceiptType || !assignedReceiptType.paymentReceiptType.isActive) {
    throwHttpError({
      status: 400,
      message: 'El tipo de recibo configurado para pignoracion no esta habilitado para el usuario actual',
      code: 'BAD_REQUEST',
    });
  }

  if (assignedReceiptType.paymentReceiptType.movementType !== 'PLEDGE') {
    throwHttpError({
      status: 400,
      message: 'El tipo de recibo configurado para pignoracion no corresponde a pignoracion',
      code: 'BAD_REQUEST',
    });
  }

  const existingActive = await db.query.subsidyPledgePaymentVouchers.findFirst({
    where: and(
      eq(subsidyPledgePaymentVouchers.period, normalizedPeriod),
      eq(subsidyPledgePaymentVouchers.movementGenerationDate, movementGenerationDate),
      eq(subsidyPledgePaymentVouchers.status, 'RUNNING')
    ),
  });

  if (existingActive) {
    throwHttpError({
      status: 409,
      message: 'Ya existe una corrida de pignoracion en ejecucion para ese periodo y fecha',
      code: 'CONFLICT',
    });
  }

  const [voucher] = await db
    .insert(subsidyPledgePaymentVouchers)
    .values({
      period: normalizedPeriod,
      movementGenerationDate,
      subsidySource: 'SYSEU',
      status: 'QUEUED',
      message: 'Lote encolado para procesamiento.',
      createdByUserId: input.userId,
      createdByUserName: input.userName || input.userId,
    })
    .returning();

  return voucher;
}

export async function executeSubsidyPledgePaymentVoucher(voucherId: number) {
  const voucher = await db.query.subsidyPledgePaymentVouchers.findFirst({
    where: eq(subsidyPledgePaymentVouchers.id, voucherId),
  });

  if (!voucher) {
    throw new Error(`Lote de pignoracion ${voucherId} no encontrado`);
  }

  await db
    .update(subsidyPledgePaymentVouchers)
    .set({
      status: 'RUNNING',
      startedAt: new Date(),
      finishedAt: null,
      message: 'Procesando giros de subsidio.',
    })
    .where(eq(subsidyPledgePaymentVouchers.id, voucherId));

  const settings = await db.query.creditsSettings.findFirst({
    where: eq(creditsSettings.appSlug, env.IAM_APP_SLUG),
    columns: {
      pledgePaymentReceiptTypeId: true,
      pledgeSubsidyGlAccountId: true,
    },
  });

  if (!settings?.pledgePaymentReceiptTypeId || !settings?.pledgeSubsidyGlAccountId) {
    throw new Error('La configuración de pignoración de subsidio está incompleta');
  }

  const transferTender = await db.query.paymentTenderTypes.findFirst({
    where: and(eq(paymentTenderTypes.type, 'TRANSFER'), eq(paymentTenderTypes.isActive, true)),
    columns: { id: true },
  });

  if (!transferTender) {
    throw new Error('No existe una forma de pago activa de tipo transferencia');
  }

  const subsidyPaymentsResult = await getSubsidyPaymentsByPeriod(voucher.period);

  if (!subsidyPaymentsResult) {
    throw new Error('No fue posible consultar giros de subsidio para el periodo');
  }

  const candidateRows = subsidyPaymentsResult.payments.filter(
    (item) => !item.isVoided && roundMoney(item.discountedCreditValue) > 0
  );

  await db
    .update(subsidyPledgePaymentVouchers)
    .set({
      subsidySource: subsidyPaymentsResult.source,
      totalRows: candidateRows.length,
    })
    .where(eq(subsidyPledgePaymentVouchers.id, voucherId));

  const processedLoanIds = new Set<number>();
  let processedPayments = 0;
  let skippedRows = 0;
  let errorRows = 0;
  let totalDiscountedAmount = 0;
  let totalAppliedAmount = 0;

  const buildFingerprint = (item: (typeof candidateRows)[number]) =>
    [
      voucher.period,
      item.workerDocumentNumber ?? '',
      item.mark ?? '',
      item.documentNumber ?? '',
      item.beneficiaryCode ?? '',
      item.installmentNumber ?? '',
      roundMoney(item.discountedCreditValue).toFixed(2),
    ].join('|');

  for (const row of candidateRows) {
    const discountedAmount = roundMoney(row.discountedCreditValue);
    totalDiscountedAmount = roundMoney(totalDiscountedAmount + discountedAmount);
    const sourceFingerprint = buildFingerprint(row);

    const existingProcessedItem = await db.query.subsidyPledgePaymentVoucherItems.findFirst({
      where: and(
        eq(subsidyPledgePaymentVoucherItems.sourceFingerprint, sourceFingerprint),
        eq(subsidyPledgePaymentVoucherItems.status, 'PROCESSED')
      ),
      columns: {
        id: true,
        creditNumber: true,
        loanId: true,
        loanPaymentId: true,
      },
    });

    if (existingProcessedItem) {
      skippedRows += 1;
      await insertVoucherItem({
        voucherId,
        sourceFingerprint,
        workerDocumentNumber: row.workerDocumentNumber,
        subsidyMark: row.mark,
        subsidyDocument: row.documentNumber,
        subsidyCrossDocumentNumber: existingProcessedItem.creditNumber ?? null,
        creditNumber: existingProcessedItem.creditNumber ?? null,
        loanId: existingProcessedItem.loanId ?? null,
        loanPaymentId: existingProcessedItem.loanPaymentId ?? null,
        discountedAmount,
        appliedAmount: 0,
        status: 'SKIPPED',
        message: 'La fila de subsidio ya fue procesada anteriormente',
        metadata: {
          duplicateOfItemId: existingProcessedItem.id,
        },
      });
      continue;
    }

    if (!row.mark || !row.documentNumber) {
      errorRows += 1;
      await insertVoucherItem({
        voucherId,
        sourceFingerprint,
        workerDocumentNumber: row.workerDocumentNumber,
        subsidyMark: row.mark,
        subsidyDocument: row.documentNumber,
        subsidyCrossDocumentNumber: null,
        creditNumber: null,
        loanId: null,
        loanPaymentId: null,
        discountedAmount,
        appliedAmount: 0,
        status: 'ERROR',
        message: 'El giro de subsidio no trae marca-documento para identificar la pignoracion',
        metadata: { subsidyPayment: row },
      });
      continue;
    }

    const pledgeResult = await getSubsidyPledgeByMarkDocument(row.mark, row.documentNumber);
    const pledge = pledgeResult?.pledge ?? null;
    const creditNumber = pledge?.crossDocumentNumber?.trim()
      ? normalizeUpperCase(pledge.crossDocumentNumber)
      : null;

    if (!creditNumber) {
      errorRows += 1;
      await insertVoucherItem({
        voucherId,
        sourceFingerprint,
        workerDocumentNumber: row.workerDocumentNumber,
        subsidyMark: row.mark,
        subsidyDocument: row.documentNumber,
        subsidyCrossDocumentNumber: null,
        creditNumber: null,
        loanId: null,
        loanPaymentId: null,
        discountedAmount,
        appliedAmount: 0,
        status: 'ERROR',
        message: 'No fue posible resolver el numero de credito desde la pignoracion',
        metadata: {
          subsidyPayment: row,
          pledge,
        },
      });
      continue;
    }

    const loan = await db.query.loans.findFirst({
      where: eq(loans.creditNumber, creditNumber),
      columns: {
        id: true,
        creditNumber: true,
        status: true,
        disbursementStatus: true,
      },
    });

    if (!loan) {
      errorRows += 1;
      await insertVoucherItem({
        voucherId,
        sourceFingerprint,
        workerDocumentNumber: row.workerDocumentNumber,
        subsidyMark: row.mark,
        subsidyDocument: row.documentNumber,
        subsidyCrossDocumentNumber: creditNumber,
        creditNumber,
        loanId: null,
        loanPaymentId: null,
        discountedAmount,
        appliedAmount: 0,
        status: 'ERROR',
        message: `No existe un credito con numero ${creditNumber}`,
        metadata: {
          subsidyPayment: row,
          pledge,
        },
      });
      continue;
    }

    if (loan.status !== 'ACCOUNTED' || loan.disbursementStatus !== 'DISBURSED') {
      errorRows += 1;
      await insertVoucherItem({
        voucherId,
        sourceFingerprint,
        workerDocumentNumber: row.workerDocumentNumber,
        subsidyMark: row.mark,
        subsidyDocument: row.documentNumber,
        subsidyCrossDocumentNumber: creditNumber,
        creditNumber,
        loanId: loan.id,
        loanPaymentId: null,
        discountedAmount,
        appliedAmount: 0,
        status: 'ERROR',
        message: 'El credito debe estar contabilizado y desembolsado para recibir abonos de pignoracion',
        metadata: {
          subsidyPayment: row,
          pledge,
          loanStatus: loan.status,
          loanDisbursementStatus: loan.disbursementStatus,
        },
      });
      continue;
    }

    try {
      const createdPayment = await db.transaction(async (tx) => {
        const payment = await createLoanPaymentTx(tx, {
          userId: voucher.createdByUserId,
          userName: voucher.createdByUserName,
          receiptTypeId: settings.pledgePaymentReceiptTypeId!,
          paymentDate: new Date(voucher.movementGenerationDate),
          loanId: loan.id,
          description: `Abono pignoracion subsidio periodo ${voucher.period} credito ${creditNumber}`.slice(
            0,
            1000
          ),
          amount: discountedAmount,
          glAccountId: settings.pledgeSubsidyGlAccountId!,
          note: `Pignoracion subsidio ${row.mark}-${row.documentNumber} periodo ${voucher.period}`.slice(
            0,
            1000
          ),
          loanPaymentMethodAllocations: [
            {
              collectionMethodId: transferTender.id,
              tenderReference: `${row.mark}-${row.documentNumber}`.slice(0, 50),
              amount: discountedAmount,
            },
          ],
        });

        const [updatedPayment] = await tx
          .update(loanPayments)
          .set({
            subsiCode: row.mark!.slice(0, 2),
            subsiDocument: row.documentNumber!.slice(0, 8),
          })
          .where(eq(loanPayments.id, payment.id))
          .returning();

        return updatedPayment;
      });

      processedPayments += 1;
      processedLoanIds.add(loan.id);
      totalAppliedAmount = roundMoney(totalAppliedAmount + discountedAmount);

      await insertVoucherItem({
        voucherId,
        sourceFingerprint,
        workerDocumentNumber: row.workerDocumentNumber,
        subsidyMark: row.mark,
        subsidyDocument: row.documentNumber,
        subsidyCrossDocumentNumber: creditNumber,
        creditNumber,
        loanId: loan.id,
        loanPaymentId: createdPayment.id,
        discountedAmount,
        appliedAmount: discountedAmount,
        status: 'PROCESSED',
        message: `Abono ${createdPayment.paymentNumber} generado correctamente`,
        metadata: {
          subsidyPayment: row,
          pledge,
          loanPaymentNumber: createdPayment.paymentNumber,
        },
      });
    } catch (error) {
      errorRows += 1;
      await insertVoucherItem({
        voucherId,
        sourceFingerprint,
        workerDocumentNumber: row.workerDocumentNumber,
        subsidyMark: row.mark,
        subsidyDocument: row.documentNumber,
        subsidyCrossDocumentNumber: creditNumber,
        creditNumber,
        loanId: loan.id,
        loanPaymentId: null,
        discountedAmount,
        appliedAmount: 0,
        status: 'ERROR',
        message: extractUnknownErrorMessage(error, 'Error al generar abono de pignoracion'),
        metadata: {
          subsidyPayment: row,
          pledge,
        },
      });
    }
  }

  const processedCredits = processedLoanIds.size;
  const finalStatus =
    processedPayments === 0 && errorRows > 0
      ? 'FAILED'
      : errorRows > 0
        ? 'PARTIAL'
        : 'COMPLETED';
  const message =
    processedPayments === 0 && skippedRows === 0 && errorRows === 0
      ? 'No se encontraron giros con descuento a credito para el periodo.'
      : finalStatus === 'COMPLETED'
        ? 'Comprobante de abonos de pignoracion generado correctamente.'
        : finalStatus === 'PARTIAL'
          ? 'El comprobante se genero con filas omitidas o con error.'
          : 'No fue posible aplicar ningun abono del periodo.';

  await db
    .update(subsidyPledgePaymentVouchers)
    .set({
      processedCredits,
      processedPayments,
      skippedRows,
      errorRows,
      totalDiscountedAmount: toDecimalString(totalDiscountedAmount),
      totalAppliedAmount: toDecimalString(totalAppliedAmount),
      status: finalStatus,
      message,
      finishedAt: new Date(),
    })
    .where(eq(subsidyPledgePaymentVouchers.id, voucherId));

  return getSubsidyPledgePaymentVoucherById(voucherId);
}

export async function listSubsidyPledgePaymentVouchers(limit = 10) {
  const items = await db.query.subsidyPledgePaymentVouchers.findMany({
    orderBy: [desc(subsidyPledgePaymentVouchers.createdAt)],
    limit,
  });

  return items.map(mapVoucherSummary);
}

export async function getSubsidyPledgePaymentVoucherById(id: number) {
  const voucher = await db.query.subsidyPledgePaymentVouchers.findFirst({
    where: eq(subsidyPledgePaymentVouchers.id, id),
    with: {
      items: {
        orderBy: [desc(subsidyPledgePaymentVoucherItems.id)],
      },
    },
  });

  if (!voucher) {
    throwHttpError({
      status: 404,
      message: `Lote de pignoracion ${id} no encontrado`,
      code: 'NOT_FOUND',
    });
  }

  return {
    ...mapVoucherSummary(voucher),
    rows: voucher.items.map(mapVoucherRow),
  };
}
