import { sendResendGenericEmail } from '@/server/clients/resend';
import {
  agreementBillingEmailDispatchItems,
  agreementBillingEmailDispatches,
  billingCycleProfileCycles,
  billingCycleProfiles,
  db,
  loanInstallments,
  loans,
} from '@/server/db';
import { enqueueAgreementBillingEmailJob } from '@/server/queues/agreement-billing-email';
import { throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { getLoanBalanceSummary } from '@/server/utils/loan-statement';
import { formatDateOnly, roundMoney, toDecimalString, toNumber } from '@/server/utils/value-utils';
import type { BillingEmailTemplateVariable } from '@/utils/billing-email-template-variables';
import { getThirdPartyLabel } from '@/utils/third-party';
import { replaceVariablesInTemplate } from '@/utils/replace-vaiables-in-template';
import { addDays, getDaysInMonth, isSaturday, isSunday, startOfDay, subDays } from 'date-fns';
import { and, asc, desc, eq, gte, inArray, isNotNull, lt, sql } from 'drizzle-orm';
import { Workbook } from 'exceljs';

type TriggerSource = 'CRON' | 'MANUAL' | 'RETRY';

type EnqueueAgreementBillingEmailsInput = {
  agreementId?: number | null;
  triggerSource: TriggerSource;
  forceResend?: boolean;
  runDate?: Date;
};

type DispatchItemRow = {
  loanId: number;
  creditNumber: string;
  borrowerName: string;
  borrowerDocument: string;
  currentBalance: number;
  installmentValue: number;
  overdueAmount: number;
  daysPastDue: number;
};

function normalizeToDateOnly(value: Date) {
  return startOfDay(value);
}

function buildPeriod(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function buildAgreementLabel(agreement: { agreementCode: string; businessName: string }) {
  return `${agreement.agreementCode} - ${agreement.businessName}`;
}

function moveToBusinessDay(date: Date, direction: 'PREVIOUS' | 'NEXT') {
  let cursor = new Date(date);
  while (isSaturday(cursor) || isSunday(cursor)) {
    cursor = direction === 'PREVIOUS' ? subDays(cursor, 1) : addDays(cursor, 1);
  }
  return cursor;
}

function resolveCycleRunDateInMonth(params: {
  runDay: number;
  weekendPolicy: 'KEEP' | 'PREVIOUS_BUSINESS_DAY' | 'NEXT_BUSINESS_DAY';
  referenceDate: Date;
}) {
  const year = params.referenceDate.getFullYear();
  const month = params.referenceDate.getMonth();
  const maxDay = getDaysInMonth(new Date(year, month, 1));
  const normalizedRunDay = Math.min(Math.max(params.runDay, 1), maxDay);
  const baseDate = new Date(year, month, normalizedRunDay);

  if (params.weekendPolicy === 'KEEP') return baseDate;
  if (params.weekendPolicy === 'PREVIOUS_BUSINESS_DAY') {
    return moveToBusinessDay(baseDate, 'PREVIOUS');
  }
  return moveToBusinessDay(baseDate, 'NEXT');
}

async function getInstallmentValue(loanId: number, runDate: string) {
  const nextInstallment = await db.query.loanInstallments.findFirst({
    where: and(
      eq(loanInstallments.loanId, loanId),
      inArray(loanInstallments.status, ['GENERATED', 'ACCOUNTED']),
      gte(loanInstallments.dueDate, runDate)
    ),
    columns: {
      principalAmount: true,
      interestAmount: true,
      insuranceAmount: true,
    },
    orderBy: [asc(loanInstallments.dueDate), asc(loanInstallments.installmentNumber)],
  });

  if (nextInstallment) {
    return roundMoney(
      toNumber(nextInstallment.principalAmount) +
        toNumber(nextInstallment.interestAmount) +
        toNumber(nextInstallment.insuranceAmount)
    );
  }

  const latestInstallment = await db.query.loanInstallments.findFirst({
    where: and(
      eq(loanInstallments.loanId, loanId),
      inArray(loanInstallments.status, ['GENERATED', 'ACCOUNTED'])
    ),
    columns: {
      principalAmount: true,
      interestAmount: true,
      insuranceAmount: true,
    },
    orderBy: [desc(loanInstallments.dueDate), desc(loanInstallments.installmentNumber)],
  });

  if (!latestInstallment) return 0;

  return roundMoney(
    toNumber(latestInstallment.principalAmount) +
      toNumber(latestInstallment.interestAmount) +
      toNumber(latestInstallment.insuranceAmount)
  );
}

function computeOverdueInfo(balanceSummary: { overdueBalance: string | number | null }) {
  const overdueAmount = roundMoney(toNumber(balanceSummary.overdueBalance));
  if (overdueAmount <= 0) return { overdueAmount: 0, daysPastDue: 0 };

  // daysPastDue: el cálculo exacto requeriría la fecha de la cuota más antigua vencida.
  // Por ahora se deja en 0; se puede enriquecer con balanceSummary.oldestOverdueDate.
  return { overdueAmount, daysPastDue: 0 };
}

async function buildLoansData(agreementId: number, runDate: string): Promise<DispatchItemRow[]> {
  const agreementLoans = await db.query.loans.findMany({
    where: and(eq(loans.agreementId, agreementId), inArray(loans.status, ['ACTIVE', 'ACCOUNTED'])),
    columns: {
      id: true,
      creditNumber: true,
    },
    with: {
      borrower: {
        columns: {
          personType: true,
          businessName: true,
          firstName: true,
          secondName: true,
          firstLastName: true,
          secondLastName: true,
          documentNumber: true,
        },
      },
    },
    orderBy: [asc(loans.creditNumber)],
  });

  return Promise.all(
    agreementLoans.map(async (loan) => {
      const [balanceSummary, installmentValue] = await Promise.all([
        getLoanBalanceSummary(loan.id),
        getInstallmentValue(loan.id, runDate),
      ]);

      const { overdueAmount, daysPastDue } = computeOverdueInfo(balanceSummary);

      return {
        loanId: loan.id,
        creditNumber: loan.creditNumber,
        borrowerName: getThirdPartyLabel(loan.borrower),
        borrowerDocument: loan.borrower.documentNumber,
        currentBalance: roundMoney(toNumber(balanceSummary.currentBalance)),
        installmentValue,
        overdueAmount,
        daysPastDue,
      };
    })
  );
}

function buildExcelAttachment(params: {
  rows: DispatchItemRow[];
  dispatchNumber: number;
  period: string;
  agreementCode: string;
}) {
  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet('Creditos');

  // Encabezado de instrucción
  worksheet.mergeCells('A1:F1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `Instrucción #${params.dispatchNumber} | Convenio: ${params.agreementCode} | Período: ${params.period}`;
  titleCell.font = { bold: true, size: 12 };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.getRow(1).height = 24;

  // Fila vacía de separación
  worksheet.addRow([]);

  // Definir columnas (a partir de fila 3)
  worksheet.columns = [
    { header: 'Numero credito', key: 'creditNumber', width: 22 },
    { header: 'Documento', key: 'borrowerDocument', width: 18 },
    { header: 'Tercero', key: 'borrowerName', width: 38 },
    { header: 'Saldo', key: 'currentBalance', width: 18, style: { numFmt: '#,##0.00' } },
    { header: 'Valor cuota', key: 'installmentValue', width: 18, style: { numFmt: '#,##0.00' } },
    { header: 'Mora', key: 'overdueAmount', width: 18, style: { numFmt: '#,##0.00' } },
  ];

  // Encabezados de tabla en fila 3
  const headerRowNum = 3;
  const headers = ['Numero credito', 'Documento', 'Tercero', 'Saldo', 'Valor cuota', 'Mora'];
  const headerRow = worksheet.getRow(headerRowNum);
  headers.forEach((h, i) => {
    headerRow.getCell(i + 1).value = h;
  });
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  // Datos
  let totalBalance = 0;
  let totalInstallment = 0;
  let totalOverdue = 0;

  for (const row of params.rows) {
    worksheet.addRow({
      creditNumber: row.creditNumber,
      borrowerDocument: row.borrowerDocument,
      borrowerName: row.borrowerName,
      currentBalance: row.currentBalance,
      installmentValue: row.installmentValue,
      overdueAmount: row.overdueAmount,
    });
    totalBalance = roundMoney(totalBalance + row.currentBalance);
    totalInstallment = roundMoney(totalInstallment + row.installmentValue);
    totalOverdue = roundMoney(totalOverdue + row.overdueAmount);
  }

  // Fila de totales
  const totalsRow = worksheet.addRow({
    creditNumber: '',
    borrowerDocument: '',
    borrowerName: 'TOTALES',
    currentBalance: totalBalance,
    installmentValue: totalInstallment,
    overdueAmount: totalOverdue,
  });
  totalsRow.font = { bold: true };

  return { workbook, totalInstallment };
}

async function getNextDispatchNumber(agreementId: number): Promise<number> {
  const [result] = await db
    .select({ maxNumber: sql<number>`COALESCE(MAX(${agreementBillingEmailDispatches.dispatchNumber}), 0)` })
    .from(agreementBillingEmailDispatches)
    .where(eq(agreementBillingEmailDispatches.agreementId, agreementId));

  return (result?.maxNumber ?? 0) + 1;
}

async function enqueueDispatch(params: {
  agreementId: number;
  billingCycleProfileId: number;
  billingCycleProfileCycleId: number;
  period: string;
  scheduledDate: string;
  triggerSource: TriggerSource;
  forceResend: boolean;
}) {
  const existing = await db.query.agreementBillingEmailDispatches.findFirst({
    where: and(
      eq(agreementBillingEmailDispatches.agreementId, params.agreementId),
      eq(agreementBillingEmailDispatches.billingCycleProfileId, params.billingCycleProfileId),
      eq(
        agreementBillingEmailDispatches.billingCycleProfileCycleId,
        params.billingCycleProfileCycleId
      ),
      eq(agreementBillingEmailDispatches.period, params.period)
    ),
  });

  if (existing) {
    if (existing.status === 'QUEUED' || existing.status === 'RUNNING') {
      return { queued: false as const };
    }

    if (existing.status === 'SENT' && !params.forceResend) {
      return { queued: false as const };
    }

    const [updated] = await db
      .update(agreementBillingEmailDispatches)
      .set({
        status: 'QUEUED',
        triggerSource: params.triggerSource,
        queuedAt: new Date(),
        startedAt: null,
        sentAt: null,
        failedAt: null,
        lastError: null,
        metadata: null,
      })
      .where(eq(agreementBillingEmailDispatches.id, existing.id))
      .returning();

    await enqueueAgreementBillingEmailJob({ dispatchId: updated.id });
    return { queued: true as const };
  }

  // Nuevo dispatch: asignar consecutivo
  const dispatchNumber = await getNextDispatchNumber(params.agreementId);

  const [created] = await db
    .insert(agreementBillingEmailDispatches)
    .values({
      agreementId: params.agreementId,
      billingCycleProfileId: params.billingCycleProfileId,
      billingCycleProfileCycleId: params.billingCycleProfileCycleId,
      period: params.period,
      scheduledDate: params.scheduledDate,
      triggerSource: params.triggerSource,
      status: 'QUEUED',
      queuedAt: new Date(),
      dispatchNumber,
    })
    .returning();

  await enqueueAgreementBillingEmailJob({ dispatchId: created.id });
  return { queued: true as const };
}

/**
 * Recupera dispatches que quedaron en RUNNING por más de 10 minutos
 * (posiblemente por un crash del worker). Los marca como FAILED.
 */
async function recoverStuckDispatches() {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  await db
    .update(agreementBillingEmailDispatches)
    .set({
      status: 'FAILED',
      failedAt: new Date(),
      lastError: 'Timeout: dispatch en RUNNING por más de 10 minutos',
    })
    .where(
      and(
        eq(agreementBillingEmailDispatches.status, 'RUNNING'),
        lt(agreementBillingEmailDispatches.startedAt, tenMinutesAgo)
      )
    );
}

export async function enqueueAgreementBillingEmails(input: EnqueueAgreementBillingEmailsInput) {
  // Recuperar dispatches stuck antes de procesar
  await recoverStuckDispatches();

  const runDate = normalizeToDateOnly(input.runDate ?? new Date());
  const runDateOnly = formatDateOnly(runDate);
  const period = buildPeriod(runDate);
  const forceResend = Boolean(input.forceResend);

  const profiles = await db.query.billingCycleProfiles.findMany({
    where: and(
      eq(billingCycleProfiles.isActive, true),
      isNotNull(billingCycleProfiles.agreementId),
      ...(input.agreementId ? [eq(billingCycleProfiles.agreementId, input.agreementId)] : [])
    ),
    with: {
      agreement: {
        with: {
          billingEmailTemplate: true,
        },
      },
      billingCycleProfileCycles: {
        where: eq(billingCycleProfileCycles.isActive, true),
        orderBy: [asc(billingCycleProfileCycles.cycleInMonth)],
      },
    },
  });

  let queuedCount = 0;
  let skippedCount = 0;

  for (const profile of profiles) {
    if (!profile.agreement || !profile.agreement.isActive) {
      skippedCount += 1;
      continue;
    }

    // Validar vigencia del convenio
    if (profile.agreement.endDate && profile.agreement.endDate < runDateOnly) {
      skippedCount += 1;
      continue;
    }

    if (!profile.agreement.billingEmailTemplateId || !profile.agreement.billingEmailTo) {
      skippedCount += 1;
      continue;
    }

    const cycles = profile.billingCycleProfileCycles ?? [];
    if (!cycles.length) {
      skippedCount += 1;
      continue;
    }

    const dueCycles = cycles.filter((cycle) => {
      const scheduledRunDate = resolveCycleRunDateInMonth({
        runDay: cycle.runDay,
        weekendPolicy: profile.weekendPolicy,
        referenceDate: runDate,
      });
      return formatDateOnly(scheduledRunDate) === runDateOnly;
    });

    const selectedCycles =
      input.triggerSource === 'CRON' ? dueCycles : dueCycles.length ? [dueCycles[0]] : [cycles[0]];

    if (!selectedCycles.length) {
      skippedCount += 1;
      continue;
    }

    for (const cycle of selectedCycles) {
      const enqueueResult = await enqueueDispatch({
        agreementId: profile.agreement.id,
        billingCycleProfileId: profile.id,
        billingCycleProfileCycleId: cycle.id,
        period,
        scheduledDate: runDateOnly,
        triggerSource: input.triggerSource,
        forceResend,
      });

      if (enqueueResult.queued) {
        queuedCount += 1;
      } else {
        skippedCount += 1;
      }
    }
  }

  return {
    queuedCount,
    skippedCount,
    message: `Correos en cola: ${queuedCount}. Omitidos: ${skippedCount}.`,
  };
}

export async function listAgreementBillingEmailDispatches(agreementId: number, limit: number) {
  return db.query.agreementBillingEmailDispatches.findMany({
    where: eq(agreementBillingEmailDispatches.agreementId, agreementId),
    columns: {
      id: true,
      agreementId: true,
      billingCycleProfileId: true,
      billingCycleProfileCycleId: true,
      period: true,
      scheduledDate: true,
      status: true,
      triggerSource: true,
      dispatchNumber: true,
      attempts: true,
      queuedAt: true,
      startedAt: true,
      sentAt: true,
      failedAt: true,
      resendMessageId: true,
      lastError: true,
      totalBilledAmount: true,
      totalCredits: true,
      createdAt: true,
    },
    orderBy: [
      desc(agreementBillingEmailDispatches.createdAt),
      desc(agreementBillingEmailDispatches.id),
    ],
    limit,
  });
}

export async function retryAgreementBillingEmailDispatch(dispatchId: number) {
  const [updated] = await db
    .update(agreementBillingEmailDispatches)
    .set({
      status: 'QUEUED',
      triggerSource: 'RETRY',
      queuedAt: new Date(),
      startedAt: null,
      sentAt: null,
      failedAt: null,
      lastError: null,
    })
    .where(
      and(
        eq(agreementBillingEmailDispatches.id, dispatchId),
        eq(agreementBillingEmailDispatches.status, 'FAILED')
      )
    )
    .returning();

  if (!updated) {
    const dispatch = await db.query.agreementBillingEmailDispatches.findFirst({
      where: eq(agreementBillingEmailDispatches.id, dispatchId),
      columns: {
        status: true,
      },
    });

    if (!dispatch) {
      throwHttpError({
        status: 404,
        message: `Despacho con ID ${dispatchId} no encontrado`,
        code: 'NOT_FOUND',
      });
    }

    throwHttpError({
      status: 409,
      message: `Solo se pueden reintentar despachos en estado FAILED. Estado actual: ${dispatch.status}`,
      code: 'CONFLICT',
    });
  }

  await enqueueAgreementBillingEmailJob({ dispatchId: updated.id });
  return updated;
}

async function markDispatchFailed(dispatchId: number, errorMessage: string) {
  await db
    .update(agreementBillingEmailDispatches)
    .set({
      status: 'FAILED',
      failedAt: new Date(),
      lastError: errorMessage,
    })
    .where(eq(agreementBillingEmailDispatches.id, dispatchId));
}

export async function processAgreementBillingEmailDispatch(dispatchId: number) {
  const dispatch = await db.query.agreementBillingEmailDispatches.findFirst({
    where: eq(agreementBillingEmailDispatches.id, dispatchId),
    with: {
      agreement: {
        with: {
          billingEmailTemplate: true,
        },
      },
      billingCycleProfile: true,
      billingCycleProfileCycle: true,
    },
  });

  if (!dispatch) {
    throw new Error(`Despacho ${dispatchId} no encontrado`);
  }

  const [runningDispatch] = await db
    .update(agreementBillingEmailDispatches)
    .set({
      status: 'RUNNING',
      startedAt: new Date(),
      attempts: dispatch.attempts + 1,
    })
    .where(
      and(
        eq(agreementBillingEmailDispatches.id, dispatch.id),
        eq(agreementBillingEmailDispatches.status, 'QUEUED')
      )
    )
    .returning();

  if (!runningDispatch) {
    return;
  }

  try {
    if (!dispatch.agreement) {
      throw new Error('Despacho sin convenio asociado');
    }
    if (!dispatch.billingCycleProfile || !dispatch.billingCycleProfileCycle) {
      throw new Error('Despacho sin ciclo de facturacion asociado');
    }

    const agreement = dispatch.agreement;
    const template = agreement.billingEmailTemplate;
    if (!template) {
      throw new Error('El convenio no tiene plantilla asignada');
    }
    if (!agreement.billingEmailTo) {
      throw new Error('El convenio no tiene correo principal configurado');
    }

    const variables: Record<BillingEmailTemplateVariable, string> = {
      nit: agreement.documentNumber,
      razon_social: agreement.businessName,
      direccion: agreement.address ?? '',
      telefono: agreement.phone ?? '',
      convenio_codigo: agreement.agreementCode,
      ciclo: String(dispatch.billingCycleProfileCycle.cycleInMonth),
      dia_corte: String(dispatch.billingCycleProfileCycle.cutoffDay),
      dia_envio: String(dispatch.billingCycleProfileCycle.runDay),
      dia_pago_esperado: dispatch.billingCycleProfileCycle.expectedPayDay
        ? String(dispatch.billingCycleProfileCycle.expectedPayDay)
        : '',
      periodo: dispatch.period,
      fecha_envio: formatDateOnly(new Date()),
      numero_instruccion: String(runningDispatch.dispatchNumber),
    };

    const subject = replaceVariablesInTemplate(template.subject, variables, { strict: true });
    const html = replaceVariablesInTemplate(template.htmlContent, variables, { strict: true });

    // Construir datos de créditos y Excel
    const rows = await buildLoansData(agreement.id, dispatch.scheduledDate);
    const { workbook, totalInstallment } = buildExcelAttachment({
      rows,
      dispatchNumber: runningDispatch.dispatchNumber,
      period: dispatch.period,
      agreementCode: agreement.agreementCode,
    });

    const content = await workbook.xlsx.writeBuffer();
    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
    const contentBase64 = buffer.toString('base64');

    // Guardar items del despacho (snapshot de lo cobrado)
    if (rows.length > 0) {
      await db.insert(agreementBillingEmailDispatchItems).values(
        rows.map((row) => ({
          dispatchId: runningDispatch.id,
          loanId: row.loanId,
          creditNumber: row.creditNumber,
          borrowerName: row.borrowerName,
          borrowerDocument: row.borrowerDocument,
          currentBalance: toDecimalString(row.currentBalance),
          installmentAmount: toDecimalString(row.installmentValue),
          overdueAmount: toDecimalString(row.overdueAmount),
          daysPastDue: row.daysPastDue,
        }))
      );
    }

    const resendResponse = await sendResendGenericEmail({
      from: template.fromEmail,
      to: [agreement.billingEmailTo],
      cc: agreement.billingEmailCc ? [agreement.billingEmailCc] : undefined,
      variables: {
        PREVIEW_TEXT: subject,
        SUBJECT: subject,
        HTML_CONTENT: html,
      },
      attachments: [
        {
          filename: `cartera-${agreement.agreementCode.toLowerCase()}-${dispatch.period}.xlsx`,
          content: contentBase64,
        },
      ],
    });

    await db
      .update(agreementBillingEmailDispatches)
      .set({
        status: 'SENT',
        sentAt: new Date(),
        failedAt: null,
        lastError: null,
        resendMessageId: resendResponse.id,
        totalBilledAmount: toDecimalString(totalInstallment),
        totalCredits: rows.length,
        metadata: {
          agreement: buildAgreementLabel(agreement),
          loansCount: rows.length,
        },
      })
      .where(eq(agreementBillingEmailDispatches.id, runningDispatch.id));
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim()
        ? error.message
        : 'No fue posible enviar el correo del convenio';
    await markDispatchFailed(runningDispatch.id, message);
    throw error;
  }
}
