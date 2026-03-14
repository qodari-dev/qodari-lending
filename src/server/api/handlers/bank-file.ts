import {
  accountingDistributionLines,
  accountingEntries,
  banks,
  db,
  loanInstallments,
  loanPayments,
  loans,
  paymentFrequencies,
  portfolioEntries,
} from '@/server/db';
import { UnifiedAuthContext } from '@/server/utils/auth-context';
import { logAudit } from '@/server/utils/audit-logger';
import { genericTsRestErrorResponse, throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { getClientIp } from '@/server/utils/get-client-ip';
import {
  buildDisbursementAdjustmentDocumentCode,
} from '@/server/utils/accounting-utils';
import { recordLoanDisbursementEvent } from '@/server/utils/loan-disbursement-events';
import { buildLoanLiquidationArtifacts } from '@/server/utils/loan-liquidation-artifacts';
import { applyPortfolioDeltas } from '@/server/utils/portfolio-utils';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { getRequiredUserContext } from '@/server/utils/required-user-context';
import { formatDateOnly, roundMoney, toDecimalString, toNumber } from '@/server/utils/value-utils';
import {
  PreviewBankNoveltyBodySchema,
  ProcessBankNoveltyBodySchema,
} from '@/schemas/bank-file';
import type { PaymentScheduleMode } from '@/schemas/payment-frequency';
import {
  buildDueDates,
  calculateCreditSimulation,
  findInsuranceRateRange,
  resolveInsuranceFactorFromRange,
} from '@/utils/credit-simulation';
import { resolvePaymentFrequencyIntervalDays } from '@/utils/payment-frequency';
import { getThirdPartyLabel } from '@/utils/third-party';
import { tsr } from '@ts-rest/serverless/next';
import { and, asc, eq, inArray, ne } from 'drizzle-orm';
import { contract } from '../contracts';
import { z } from 'zod';

type BankFileLoanRow = {
  id: number;
  creditNumber: string;
  disbursementAmount: string | null;
  bankAccountType: 'SAVINGS' | 'CHECKING' | null;
  bankAccountNumber: string | null;
  disbursementStatus: 'SENT_TO_ACCOUNTING' | 'SENT_TO_BANK' | 'DISBURSED' | 'LIQUIDATED' | 'REJECTED';
  firstCollectionDate: string | null;
  maturityDate: string;
  disbursementParty: {
    documentNumber: string;
    firstName: string | null;
    secondName: string | null;
    firstLastName: string | null;
    secondLastName: string | null;
    businessName: string | null;
  } | null;
};

type PreviewNoveltyRecord = z.infer<typeof PreviewBankNoveltyBodySchema>['records'][number];
type ProcessNoveltyRecord = z.infer<typeof ProcessBankNoveltyBodySchema>['records'][number];

type BankNoveltyLoanRow = {
  id: number;
  creditNumber: string;
  status: 'GENERATED' | 'ACCOUNTED' | 'VOID' | 'REFINANCED' | 'PAID';
  disbursementStatus: 'SENT_TO_ACCOUNTING' | 'SENT_TO_BANK' | 'DISBURSED' | 'LIQUIDATED' | 'REJECTED';
  disbursementAmount: string | null;
  firstCollectionDate: string | null;
  maturityDate: string;
  installments: number;
  creditStartDate: string;
  hasPendingDisbursementAdjustment: boolean;
  paymentFrequency: {
    id: number;
    scheduleMode: PaymentScheduleMode;
    intervalDays: number;
    dayOfMonth: number | null;
    semiMonthDay1: number | null;
    semiMonthDay2: number | null;
    useEndOfMonthFallback: boolean | null;
  } | null;
  disbursementParty: {
    personType: 'NATURAL' | 'LEGAL';
    documentNumber: string;
    firstName: string | null;
    secondName: string | null;
    firstLastName: string | null;
    secondLastName: string | null;
    businessName: string | null;
  } | null;
};

type BankNoveltyPreviewRow = {
  rowNumber: number;
  creditNumber: string;
  loanId: number | null;
  thirdPartyName: string | null;
  amount: number | null;
  fileStatus: 'DISBURSED' | 'REJECTED';
  responseDate: string;
  note: string | null;
  currentLoanStatus: string | null;
  currentDisbursementStatus: string | null;
  currentFirstCollectionDate: string | null;
  matched: boolean;
  canProcess: boolean;
  requiresDateAdjustment: boolean;
  validationMessage: string | null;
};

type AdjustmentEntryLike = {
  id: number;
  glAccountId: number;
  costCenterId: number | null;
  thirdPartyId: number | null;
  description: string;
  nature: 'DEBIT' | 'CREDIT';
  amount: string;
  loanId: number | null;
  installmentNumber: number | null;
  dueDate: string | null;
  status: 'DRAFT' | 'ACCOUNTED' | 'VOIDED';
};

function getNormalizedCreditNumber(value: string) {
  return value.trim().toUpperCase();
}

function buildNoveltyPreviewSummary(rows: BankNoveltyPreviewRow[]) {
  return {
    totalRecords: rows.length,
    totalAmount: roundMoney(rows.reduce((sum, row) => sum + (row.amount ?? 0), 0)),
    matchedRecords: rows.filter((row) => row.matched).length,
    invalidRecords: rows.filter((row) => !row.canProcess).length,
    disbursedRecords: rows.filter((row) => row.fileStatus === 'DISBURSED').length,
    rejectedRecords: rows.filter((row) => row.fileStatus === 'REJECTED').length,
  };
}

function buildNoveltyPreviewRows(
  records: PreviewNoveltyRecord[],
  loansByCreditNumber: Map<string, BankNoveltyLoanRow>
) {
  const duplicateMap = new Map<string, number>();

  for (const record of records) {
    const key = getNormalizedCreditNumber(record.creditNumber);
    duplicateMap.set(key, (duplicateMap.get(key) ?? 0) + 1);
  }

  const rows: BankNoveltyPreviewRow[] = records.map((record) => {
    const normalizedCreditNumber = getNormalizedCreditNumber(record.creditNumber);
    const loan = loansByCreditNumber.get(normalizedCreditNumber) ?? null;
    const parsedAmount = record.amount ?? null;
    const effectiveAmount = parsedAmount ?? (loan ? roundMoney(toNumber(loan.disbursementAmount ?? '0')) : null);

    let validationMessage: string | null = null;

    if ((duplicateMap.get(normalizedCreditNumber) ?? 0) > 1) {
      validationMessage = 'El crédito está repetido en el archivo.';
    } else if (!loan) {
      validationMessage = 'Crédito no encontrado.';
    } else if (loan.status !== 'ACCOUNTED') {
      validationMessage = 'El crédito no está contabilizado.';
    } else if (loan.disbursementStatus !== 'SENT_TO_BANK') {
      validationMessage = 'El crédito no está pendiente de respuesta del banco.';
    } else if (parsedAmount !== null) {
      const disbursementAmount = roundMoney(toNumber(loan.disbursementAmount ?? '0'));
      if (Math.abs(disbursementAmount - parsedAmount) > 0.01) {
        validationMessage = 'El valor del archivo no coincide con el valor neto de desembolso.';
      }
    }

    return {
      rowNumber: record.rowNumber,
      creditNumber: record.creditNumber,
      loanId: loan?.id ?? null,
      thirdPartyName: loan ? getThirdPartyLabel(loan.disbursementParty) : null,
      amount: effectiveAmount,
      fileStatus: record.fileStatus,
      responseDate: record.responseDate,
      note: record.note?.trim() || null,
      currentLoanStatus: loan?.status ?? null,
      currentDisbursementStatus: loan?.disbursementStatus ?? null,
      currentFirstCollectionDate: loan?.firstCollectionDate ?? null,
      matched: Boolean(loan),
      canProcess: !validationMessage,
      requiresDateAdjustment: false,
      validationMessage,
    };
  });

  return {
    rows,
    summary: buildNoveltyPreviewSummary(rows),
  };
}

function resolveNewDueDates(loan: BankNoveltyLoanRow, newFirstCollectionDate: string) {
  if (!loan.paymentFrequency) {
    throwHttpError({
      status: 400,
      code: 'BAD_REQUEST',
      message: `El crédito ${loan.creditNumber} no tiene periodicidad de pago configurada.`,
    });
  }

  const paymentFrequencyIntervalDays = resolvePaymentFrequencyIntervalDays({
    scheduleMode: loan.paymentFrequency.scheduleMode,
    intervalDays: loan.paymentFrequency.intervalDays,
    dayOfMonth: loan.paymentFrequency.dayOfMonth,
    semiMonthDay1: loan.paymentFrequency.semiMonthDay1,
    semiMonthDay2: loan.paymentFrequency.semiMonthDay2,
  });

  if (paymentFrequencyIntervalDays <= 0) {
    throwHttpError({
      status: 400,
      code: 'BAD_REQUEST',
      message: `La periodicidad del crédito ${loan.creditNumber} no es válida.`,
    });
  }

  const dueDates = buildDueDates({
    financingType: 'FIXED_AMOUNT',
    principal: 0,
    annualRatePercent: 0,
    installments: loan.installments,
    firstPaymentDate: new Date(`${newFirstCollectionDate}T00:00:00`),
    disbursementDate: new Date(`${loan.creditStartDate}T00:00:00`),
    daysInterval: paymentFrequencyIntervalDays,
    paymentScheduleMode: loan.paymentFrequency.scheduleMode,
    dayOfMonth: loan.paymentFrequency.dayOfMonth,
    semiMonthDay1: loan.paymentFrequency.semiMonthDay1,
    semiMonthDay2: loan.paymentFrequency.semiMonthDay2,
    useEndOfMonthFallback: loan.paymentFrequency.useEndOfMonthFallback ?? true,
  });

  return dueDates.map((item) => formatDateOnly(item));
}

function buildEntryValueSignature(entries: Array<AdjustmentEntryLike | typeof accountingEntries.$inferInsert>) {
  return entries
    .map((entry) =>
      [
        entry.glAccountId,
        entry.nature,
        entry.installmentNumber ?? 'null',
        roundMoney(toNumber(entry.amount)),
      ].join(':')
    )
    .sort();
}

function areEntryValuesEquivalent(
  currentEntries: AdjustmentEntryLike[],
  nextEntries: Array<typeof accountingEntries.$inferInsert>
) {
  const currentSignature = buildEntryValueSignature(currentEntries);
  const nextSignature = buildEntryValueSignature(nextEntries);

  if (currentSignature.length !== nextSignature.length) return false;
  return currentSignature.every((value, index) => value === nextSignature[index]);
}

async function loadNoveltyLoans(creditNumbers: string[]) {
  const normalizedCreditNumbers = Array.from(new Set(creditNumbers.map(getNormalizedCreditNumber)));

  if (!normalizedCreditNumbers.length) {
    return new Map<string, BankNoveltyLoanRow>();
  }

  const foundLoans = await db.query.loans.findMany({
    where: inArray(loans.creditNumber, normalizedCreditNumbers),
    columns: {
      id: true,
      creditNumber: true,
      status: true,
      disbursementStatus: true,
      disbursementAmount: true,
      firstCollectionDate: true,
      maturityDate: true,
      installments: true,
      creditStartDate: true,
      hasPendingDisbursementAdjustment: true,
    },
    with: {
      paymentFrequency: {
        columns: {
          id: true,
          scheduleMode: true,
          intervalDays: true,
          dayOfMonth: true,
          semiMonthDay1: true,
          semiMonthDay2: true,
          useEndOfMonthFallback: true,
        },
      },
      disbursementParty: {
        columns: {
          personType: true,
          documentNumber: true,
          firstName: true,
          secondName: true,
          firstLastName: true,
          secondLastName: true,
          businessName: true,
        },
      },
    },
  });

  return new Map(
    foundLoans.map((loan) => [getNormalizedCreditNumber(loan.creditNumber), loan as BankNoveltyLoanRow])
  );
}

async function buildRecalculatedSchedule(args: {
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0];
  loanId: number;
  newFirstCollectionDate: string;
}) {
  const fullLoan = await args.tx.query.loans.findFirst({
    where: eq(loans.id, args.loanId),
    columns: {
      id: true,
      creditNumber: true,
      principalAmount: true,
      installments: true,
      creditStartDate: true,
      costCenterId: true,
      thirdPartyId: true,
      firstCollectionDate: true,
      maturityDate: true,
      initialTotalAmount: true,
      insuranceValue: true,
    },
    with: {
      paymentFrequency: {
        columns: {
          id: true,
          scheduleMode: true,
          intervalDays: true,
          dayOfMonth: true,
          semiMonthDay1: true,
          semiMonthDay2: true,
          useEndOfMonthFallback: true,
        },
      },
      loanApplication: {
        columns: {
          financingFactor: true,
          approvedAmount: true,
          insuranceCompanyId: true,
          isInsuranceApproved: true,
        },
        with: {
          creditProduct: {
            columns: {
              financingType: true,
              interestRateType: true,
              interestDayCountConvention: true,
              insuranceAccrualMethod: true,
              paysInsurance: true,
              insuranceRangeMetric: true,
              capitalDistributionId: true,
            },
          },
          insuranceCompany: {
            columns: {
              minimumValue: true,
            },
            with: {
              insuranceRateRanges: true,
            },
          },
        },
      },
      loanBillingConcepts: {
        with: {
          glAccount: true,
          billingConcept: true,
        },
      },
    },
  });

  if (!fullLoan || !fullLoan.paymentFrequency || !fullLoan.loanApplication?.creditProduct) {
    throwHttpError({
      status: 400,
      code: 'BAD_REQUEST',
      message: 'No fue posible cargar la configuración completa del crédito para recalcular el desembolso.',
    });
  }

  const paymentFrequencyIntervalDays = resolvePaymentFrequencyIntervalDays({
    scheduleMode: fullLoan.paymentFrequency.scheduleMode,
    intervalDays: fullLoan.paymentFrequency.intervalDays,
    dayOfMonth: fullLoan.paymentFrequency.dayOfMonth,
    semiMonthDay1: fullLoan.paymentFrequency.semiMonthDay1,
    semiMonthDay2: fullLoan.paymentFrequency.semiMonthDay2,
  });

  if (paymentFrequencyIntervalDays <= 0) {
    throwHttpError({
      status: 400,
      code: 'BAD_REQUEST',
      message: `La periodicidad del crédito ${fullLoan.creditNumber} no es válida.`,
    });
  }

  let insuranceRatePercent = 0;
  let insuranceFixedAmount = 0;
  let insuranceMinimumAmount = 0;

  const product = fullLoan.loanApplication.creditProduct;
  if (
    product.paysInsurance &&
    fullLoan.loanApplication.isInsuranceApproved &&
    fullLoan.loanApplication.insuranceCompany &&
    fullLoan.loanApplication.insuranceCompanyId
  ) {
    const metricValue =
      product.insuranceRangeMetric === 'INSTALLMENT_COUNT'
        ? fullLoan.installments
        : toNumber(fullLoan.loanApplication.approvedAmount ?? '0');

    const insuranceRange = findInsuranceRateRange({
      ranges: fullLoan.loanApplication.insuranceCompany.insuranceRateRanges,
      rangeMetric: product.insuranceRangeMetric,
      metricValue,
    });

    if (!insuranceRange) {
      throwHttpError({
        status: 400,
        code: 'BAD_REQUEST',
        message: `La aseguradora configurada para el crédito ${fullLoan.creditNumber} no tiene rango válido para recalcular el seguro.`,
      });
    }

    const resolvedInsurance = resolveInsuranceFactorFromRange({
      range: insuranceRange,
      minimumValue: fullLoan.loanApplication.insuranceCompany.minimumValue,
    });

    insuranceRatePercent = resolvedInsurance.insuranceRatePercent;
    insuranceFixedAmount = resolvedInsurance.insuranceFixedAmount;
    insuranceMinimumAmount = resolvedInsurance.insuranceMinimumAmount;
  }

  const schedule = calculateCreditSimulation({
    financingType: product.financingType,
    principal: roundMoney(toNumber(fullLoan.principalAmount)),
    annualRatePercent: toNumber(fullLoan.loanApplication.financingFactor),
    installments: fullLoan.installments,
    firstPaymentDate: new Date(`${args.newFirstCollectionDate}T00:00:00`),
    disbursementDate: new Date(`${fullLoan.creditStartDate}T00:00:00`),
    daysInterval: paymentFrequencyIntervalDays,
    paymentScheduleMode: fullLoan.paymentFrequency.scheduleMode,
    dayOfMonth: fullLoan.paymentFrequency.dayOfMonth,
    semiMonthDay1: fullLoan.paymentFrequency.semiMonthDay1,
    semiMonthDay2: fullLoan.paymentFrequency.semiMonthDay2,
    useEndOfMonthFallback: fullLoan.paymentFrequency.useEndOfMonthFallback ?? true,
    interestRateType: product.interestRateType,
    interestDayCountConvention: product.interestDayCountConvention,
    insuranceAccrualMethod: product.insuranceAccrualMethod,
    insuranceRatePercent,
    insuranceFixedAmount,
    insuranceMinimumAmount,
  });

  const distributionLines = await args.tx.query.accountingDistributionLines.findMany({
    where: eq(accountingDistributionLines.accountingDistributionId, product.capitalDistributionId),
    with: {
      glAccount: true,
    },
    orderBy: [asc(accountingDistributionLines.id)],
  });

  if (!distributionLines.length) {
    throwHttpError({
      status: 400,
      code: 'BAD_REQUEST',
      message: `El crédito ${fullLoan.creditNumber} no tiene líneas de distribución contable configuradas para reliquidar.`,
    });
  }

  return {
    fullLoan,
    schedule,
    distributionLines,
  };
}

function getThirdPartyName(party: BankFileLoanRow['disbursementParty']): string {
  if (!party) return '';

  const naturalName = [
    party.firstName,
    party.secondName,
    party.firstLastName,
    party.secondLastName,
  ]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(' ');

  return party.businessName?.trim() || naturalName;
}

function buildBankFileContent(args: {
  bankCode: string | null;
  liquidationDate: string;
  rows: Array<{
    creditNumber: string;
    beneficiaryDocument: string;
    beneficiaryName: string;
    amount: number;
    accountType: string;
    accountNumber: string;
  }>;
  totalAmount: number;
}) {
  const code = (args.bankCode ?? 'GEN').toUpperCase();
  const header = [
    'BANCO',
    code,
    'FECHA_LIQUIDACION',
    args.liquidationDate,
    'CREDITOS',
    String(args.rows.length),
    'TOTAL',
    args.totalAmount.toFixed(2),
  ].join('|');
  const detailHeader =
    'CREDITO|DOCUMENTO_BENEFICIARIO|BENEFICIARIO|VALOR_DESEMBOLSO|TIPO_CUENTA|CUENTA';
  const details = args.rows.map((row) =>
    [
      row.creditNumber,
      row.beneficiaryDocument,
      row.beneficiaryName,
      row.amount.toFixed(2),
      row.accountType,
      row.accountNumber,
    ].join('|')
  );

  return [header, detailHeader, ...details].join('\n');
}

export const bankFile = tsr.router(contract.bankFile, {
  generate: async ({ body }, { request, appRoute, nextRequest }) => {
    let session: UnifiedAuthContext | undefined;
    const ipAddress = getClientIp(nextRequest);
    const userAgent = nextRequest.headers.get('user-agent');

    try {
      session = await getAuthContextAndValidatePermission(request, appRoute.metadata);
      if (!session) {
        throwHttpError({
          status: 401,
          code: 'UNAUTHENTICATED',
          message: 'Not authenticated',
        });
      }

      const { userId, userName } = getRequiredUserContext(session);

      const bank = await db.query.banks.findFirst({
        where: and(eq(banks.id, body.bankId), eq(banks.isActive, true)),
      });

      if (!bank) {
        throwHttpError({
          status: 404,
          code: 'NOT_FOUND',
          message: 'Banco no encontrado',
        });
      }

      const liquidationDate = formatDateOnly(body.liquidationDate);

      const eligibleLoans = await db.query.loans.findMany({
        where: and(
          eq(loans.bankId, body.bankId),
          eq(loans.status, 'ACCOUNTED'),
          inArray(loans.disbursementStatus, ['SENT_TO_ACCOUNTING', 'REJECTED']),
          eq(loans.creditStartDate, liquidationDate)
        ),
        columns: {
          id: true,
          creditNumber: true,
          disbursementAmount: true,
          bankAccountType: true,
          bankAccountNumber: true,
          disbursementStatus: true,
          firstCollectionDate: true,
          maturityDate: true,
        },
        with: {
          disbursementParty: {
            columns: {
              documentNumber: true,
              firstName: true,
              secondName: true,
              firstLastName: true,
              secondLastName: true,
              businessName: true,
            },
          },
        },
        orderBy: [asc(loans.creditNumber)],
      });

      if (!eligibleLoans.length) {
        throwHttpError({
          status: 404,
          code: 'NOT_FOUND',
          message:
            'No se encontraron créditos contabilizados pendientes de envío al banco para la fecha indicada',
        });
      }

      const normalizedRows = eligibleLoans.map((loan) => {
        const amount = roundMoney(toNumber(loan.disbursementAmount ?? '0'));
        const beneficiaryDocument = loan.disbursementParty?.documentNumber?.trim() ?? '';
        const beneficiaryName = getThirdPartyName(loan.disbursementParty);
        const accountNumber = loan.bankAccountNumber?.trim() ?? '';

        if (amount <= 0.01) {
          throwHttpError({
            status: 400,
            code: 'BAD_REQUEST',
            message: `El crédito ${loan.creditNumber} no tiene valor neto de desembolso`,
          });
        }

        if (!loan.bankAccountType || !accountNumber) {
          throwHttpError({
            status: 400,
            code: 'BAD_REQUEST',
            message: `El crédito ${loan.creditNumber} no tiene cuenta bancaria completa para envío`,
          });
        }

        if (!beneficiaryDocument) {
          throwHttpError({
            status: 400,
            code: 'BAD_REQUEST',
            message: `El crédito ${loan.creditNumber} no tiene documento del tercero de desembolso`,
          });
        }

        return {
          id: loan.id,
          creditNumber: loan.creditNumber,
          beneficiaryDocument,
          beneficiaryName: beneficiaryName || beneficiaryDocument,
          amount,
          accountType: loan.bankAccountType,
          accountNumber,
          previousDisbursementStatus: loan.disbursementStatus,
          previousFirstCollectionDate: loan.firstCollectionDate,
          previousMaturityDate: loan.maturityDate,
        };
      });

      const totalAmount = roundMoney(normalizedRows.reduce((sum, row) => sum + row.amount, 0));
      const fileName = `${(bank.asobancariaCode || bank.name)
        .toLowerCase()
        .replace(/\s+/g, '-')}-${liquidationDate}.txt`;

      const updatedLoans = await db.transaction(async (tx) => {
        const updated = await tx
          .update(loans)
          .set({
            disbursementStatus: 'SENT_TO_BANK',
            updatedAt: new Date(),
          })
          .where(
            and(
              inArray(
                loans.id,
                normalizedRows.map((row) => row.id)
              ),
              eq(loans.status, 'ACCOUNTED'),
              inArray(loans.disbursementStatus, ['SENT_TO_ACCOUNTING', 'REJECTED'])
            )
          )
          .returning({
            id: loans.id,
          });

        await Promise.all(
          normalizedRows.map((row) =>
            recordLoanDisbursementEvent(tx, {
              loanId: row.id,
              eventType: 'SENT_TO_BANK',
              eventDate: liquidationDate,
              fromDisbursementStatus: row.previousDisbursementStatus,
              toDisbursementStatus: 'SENT_TO_BANK',
              previousFirstCollectionDate: row.previousFirstCollectionDate,
              newFirstCollectionDate: row.previousFirstCollectionDate,
              previousMaturityDate: row.previousMaturityDate,
              newMaturityDate: row.previousMaturityDate,
              changedByUserId: userId,
              changedByUserName: userName || userId,
              note: 'Archivo de banco generado y crédito marcado como enviado al banco',
              metadata: {
                bankId: bank.id,
                bankCode: bank.asobancariaCode,
                fileName,
              },
            })
          )
        );

        return updated;
      });

      if (updatedLoans.length !== normalizedRows.length) {
        throwHttpError({
          status: 409,
          code: 'CONFLICT',
          message: 'Uno o más créditos cambiaron de estado durante la generación del archivo',
        });
      }

      const fileContent = buildBankFileContent({
        bankCode: bank.asobancariaCode,
        liquidationDate,
        rows: normalizedRows,
        totalAmount,
      });

      const responseBody = {
        bankId: bank.id,
        bankName: bank.name,
        bankCode: bank.asobancariaCode ?? null,
        liquidationDate,
        reviewedCredits: normalizedRows.length,
        totalAmount,
        fileName,
        fileContent,
        message: `Archivo generado. Se marcaron ${normalizedRows.length} créditos como enviados al banco.`,
      };

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'create',
        functionName: 'generate',
        status: 'success',
        metadata: {
          bankId: bank.id,
          liquidationDate,
          reviewedCredits: normalizedRows.length,
          totalAmount,
          loanIds: normalizedRows.map((row) => row.id),
          previousStatuses: normalizedRows.map((row) => ({
            loanId: row.id,
            from: row.previousDisbursementStatus,
            to: 'SENT_TO_BANK',
          })),
        },
        ipAddress,
        userAgent,
        userId,
        userName: userName || userId,
      });

      return {
        status: 200 as const,
        body: responseBody,
      };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: 'Error al generar archivo para banco',
      });

      if (session) {
        const { userId, userName } = getRequiredUserContext(session);
        await logAudit(session, {
          resourceKey: appRoute.metadata.permissionKey.resourceKey,
          actionKey: appRoute.metadata.permissionKey.actionKey,
          action: 'create',
          functionName: 'generate',
          status: 'failure',
          errorMessage: error.body.message,
          metadata: {
            body,
          },
          ipAddress,
          userAgent,
          userId,
          userName: userName || userId,
        });
      }

      return error;
    }
  },
  previewNoveltyFile: async ({ body }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const loansByCreditNumber = await loadNoveltyLoans(body.records.map((item) => item.creditNumber));
      const preview = buildNoveltyPreviewRows(body.records, loansByCreditNumber);

      return {
        status: 200 as const,
        body: {
          fileName: body.fileName,
          summary: preview.summary,
          rows: preview.rows,
          message: preview.summary.invalidRecords
            ? 'Se cargó el archivo con novedades. Revise las filas inválidas antes de procesar.'
            : 'Archivo listo para procesar.',
        },
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: 'Error al previsualizar novedades del banco',
      });
    }
  },
  processNoveltyFile: async ({ body }, { request, appRoute, nextRequest }) => {
    let session: UnifiedAuthContext | undefined;
    const ipAddress = getClientIp(nextRequest);
    const userAgent = nextRequest.headers.get('user-agent');

    try {
      session = await getAuthContextAndValidatePermission(request, appRoute.metadata);
      if (!session) {
        throwHttpError({
          status: 401,
          code: 'UNAUTHENTICATED',
          message: 'Not authenticated',
        });
      }

      const { userId, userName } = getRequiredUserContext(session);
      const loansByCreditNumber = await loadNoveltyLoans(body.records.map((item) => item.creditNumber));
      const preview = buildNoveltyPreviewRows(body.records, loansByCreditNumber);
      const invalidRows = preview.rows.filter((row) => !row.canProcess);

      if (!preview.rows.length) {
        throwHttpError({
          status: 400,
          code: 'BAD_REQUEST',
          message: 'El archivo no contiene registros para procesar.',
        });
      }

      if (invalidRows.length) {
        throwHttpError({
          status: 400,
          code: 'BAD_REQUEST',
          message: 'El archivo contiene filas inválidas. Corrija el preview antes de procesar.',
        });
      }

      const processByCredit = new Map(
        body.records.map((record) => [getNormalizedCreditNumber(record.creditNumber), record])
      );

      let valueChangedAdjustments = 0;

      const processedRows = await db.transaction(async (tx) => {
        const results: Array<
          BankNoveltyPreviewRow & {
            changedFirstCollectionDate: boolean;
            newFirstCollectionDate: string | null;
            processed: boolean;
            processedAction: 'DISBURSED' | 'REJECTED' | 'DISBURSED_WITH_DATE_CHANGE' | null;
          }
        > = [];

        for (const previewRow of preview.rows) {
          const loan = loansByCreditNumber.get(getNormalizedCreditNumber(previewRow.creditNumber));
          const record = processByCredit.get(getNormalizedCreditNumber(previewRow.creditNumber)) as
            | ProcessNoveltyRecord
            | undefined;

          if (!loan || !record) {
            continue;
          }

          const wantsDateChange =
            record.fileStatus === 'DISBURSED' &&
            Boolean(record.changeFirstCollectionDate) &&
            Boolean(record.newFirstCollectionDate) &&
            record.newFirstCollectionDate !== loan.firstCollectionDate;

          if (
            wantsDateChange &&
            record.newFirstCollectionDate &&
            record.newFirstCollectionDate < loan.creditStartDate
          ) {
            throwHttpError({
              status: 400,
              code: 'BAD_REQUEST',
              message: `La nueva fecha de primer recaudo del crédito ${loan.creditNumber} no puede ser anterior a la fecha del crédito.`,
            });
          }

          if (record.fileStatus === 'REJECTED') {
            await tx
              .update(loans)
              .set({
                disbursementStatus: 'REJECTED',
                hasPendingDisbursementAdjustment: false,
                updatedAt: new Date(),
              })
              .where(and(eq(loans.id, loan.id), eq(loans.status, 'ACCOUNTED'), eq(loans.disbursementStatus, 'SENT_TO_BANK')));

            await recordLoanDisbursementEvent(tx, {
              loanId: loan.id,
              eventType: 'REJECTED',
              eventDate: record.responseDate,
              fromDisbursementStatus: loan.disbursementStatus,
              toDisbursementStatus: 'REJECTED',
              previousFirstCollectionDate: loan.firstCollectionDate,
              newFirstCollectionDate: loan.firstCollectionDate,
              previousMaturityDate: loan.maturityDate,
              newMaturityDate: loan.maturityDate,
              changedByUserId: userId,
              changedByUserName: userName || userId,
              note: record.note?.trim() || 'Archivo de banco: desembolso rechazado',
              metadata: {
                source: 'BANK_NOVELTY_FILE',
                fileName: body.fileName,
                rowNumber: record.rowNumber,
                amount: previewRow.amount,
              },
            });

            results.push({
              ...previewRow,
              currentDisbursementStatus: 'REJECTED',
              changedFirstCollectionDate: false,
              newFirstCollectionDate: null,
              processed: true,
              processedAction: 'REJECTED',
            });
            continue;
          }

          let nextFirstCollectionDate = loan.firstCollectionDate;
          let nextMaturityDate = loan.maturityDate;
          let valueChangedAdjustment = false;

          if (wantsDateChange && record.newFirstCollectionDate) {
            const activePayments = await tx.query.loanPayments.findFirst({
              where: and(eq(loanPayments.loanId, loan.id), ne(loanPayments.status, 'VOID')),
              columns: { id: true },
            });

            if (activePayments) {
              throwHttpError({
                status: 400,
                code: 'BAD_REQUEST',
                message: `El crédito ${loan.creditNumber} ya tiene pagos registrados y no permite cambiar la primera fecha de recaudo desde la respuesta del banco.`,
              });
            }

            const { fullLoan, schedule, distributionLines } = await buildRecalculatedSchedule({
              tx,
              loanId: loan.id,
              newFirstCollectionDate: record.newFirstCollectionDate,
            });

            const nextInstallments = schedule.installments.map((installment) => ({
              installmentNumber: installment.installmentNumber,
              dueDate: installment.dueDate,
              principalAmount: toDecimalString(installment.principal),
              interestAmount: toDecimalString(installment.interest),
              insuranceAmount: toDecimalString(installment.insurance),
              remainingPrincipal: toDecimalString(installment.closingBalance),
            }));

            nextFirstCollectionDate = record.newFirstCollectionDate;
            nextMaturityDate =
              nextInstallments[nextInstallments.length - 1]?.dueDate ?? loan.maturityDate;

            const adjustmentDocumentCode = buildDisbursementAdjustmentDocumentCode(loan.id);
            const existingAdjustmentEntries = await tx.query.accountingEntries.findMany({
              where: and(
                eq(accountingEntries.processType, 'CREDIT'),
                eq(accountingEntries.documentCode, adjustmentDocumentCode)
              ),
              columns: {
                sequence: true,
              },
            });

            const currentActiveCreditEntries = await tx.query.accountingEntries.findMany({
              where: and(
                eq(accountingEntries.loanId, loan.id),
                eq(accountingEntries.processType, 'CREDIT'),
                inArray(accountingEntries.status, ['DRAFT', 'ACCOUNTED'])
              ),
              columns: {
                id: true,
                glAccountId: true,
                costCenterId: true,
                thirdPartyId: true,
                description: true,
                nature: true,
                amount: true,
                loanId: true,
                installmentNumber: true,
                dueDate: true,
                status: true,
              },
              orderBy: [asc(accountingEntries.sequence)],
            });

            const rebuiltArtifacts = buildLoanLiquidationArtifacts({
              loan: {
                id: fullLoan.id,
                creditNumber: fullLoan.creditNumber,
                costCenterId: fullLoan.costCenterId ?? null,
                thirdPartyId: fullLoan.thirdPartyId,
                creditStartDate: fullLoan.creditStartDate,
                principalAmount: fullLoan.principalAmount,
              },
              installments: nextInstallments.map((item) => ({
                installmentNumber: item.installmentNumber,
                dueDate: item.dueDate,
                principalAmount: item.principalAmount,
                interestAmount: item.interestAmount,
                insuranceAmount: item.insuranceAmount,
              })),
              distributionLines,
              loanConceptSnapshots: fullLoan.loanBillingConcepts,
              documentCode: adjustmentDocumentCode,
              entryDate: record.responseDate,
              sourceType: 'MANUAL_ADJUSTMENT',
              sourceId: String(loan.id),
              startingSequence:
                Math.max(0, ...existingAdjustmentEntries.map((item) => item.sequence)) +
                1 +
                currentActiveCreditEntries.length,
              freezeComputedOneTimeAmounts: true,
            });

            valueChangedAdjustment = !areEntryValuesEquivalent(
              currentActiveCreditEntries,
              rebuiltArtifacts.accountingEntriesPayload
            );

            if (!valueChangedAdjustment) {
              const dueDates = nextInstallments.map((item) => item.dueDate);

              for (let index = 0; index < dueDates.length; index++) {
                const installmentNumber = index + 1;
                const nextDueDate = dueDates[index]!;

                await tx
                  .update(loanInstallments)
                  .set({
                    dueDate: nextDueDate,
                    updatedAt: new Date(),
                  })
                  .where(
                    and(
                      eq(loanInstallments.loanId, loan.id),
                      eq(loanInstallments.installmentNumber, installmentNumber),
                      inArray(loanInstallments.status, ['ACCOUNTED', 'GENERATED', 'CAUSED'])
                    )
                  );

                await tx
                  .update(portfolioEntries)
                  .set({
                    dueDate: nextDueDate,
                    updatedAt: new Date(),
                  })
                  .where(
                    and(
                      eq(portfolioEntries.loanId, loan.id),
                      eq(portfolioEntries.installmentNumber, installmentNumber)
                    )
                  );

                await tx
                  .update(accountingEntries)
                  .set({
                    dueDate: nextDueDate,
                    updatedAt: new Date(),
                  })
                  .where(
                    and(
                      eq(accountingEntries.loanId, loan.id),
                      eq(accountingEntries.installmentNumber, installmentNumber),
                      eq(accountingEntries.processType, 'CREDIT'),
                      inArray(accountingEntries.status, ['DRAFT', 'ACCOUNTED'])
                    )
                  );
              }
            } else {
              valueChangedAdjustments += 1;

              const reversalEntries: Array<typeof accountingEntries.$inferInsert> =
                currentActiveCreditEntries.map((entry, index) => ({
                  processType: 'CREDIT',
                  documentCode: adjustmentDocumentCode,
                  sequence:
                    Math.max(0, ...existingAdjustmentEntries.map((item) => item.sequence)) + index + 1,
                  entryDate: record.responseDate,
                  glAccountId: entry.glAccountId,
                  costCenterId: entry.costCenterId,
                  thirdPartyId: entry.thirdPartyId ?? fullLoan.thirdPartyId,
                  description: `Reversa novedad desembolso ${fullLoan.creditNumber}`.slice(0, 255),
                  nature: entry.nature === 'DEBIT' ? 'CREDIT' : 'DEBIT',
                  amount: entry.amount,
                  loanId: entry.loanId,
                  installmentNumber: entry.installmentNumber,
                  dueDate: entry.dueDate,
                  status: 'DRAFT',
                  statusDate: record.responseDate,
                  sourceType: 'MANUAL_ADJUSTMENT',
                  sourceId: String(loan.id),
                  reversalOfEntryId: entry.id,
                  processRunId: null,
                }));

              const existingPortfolio = await tx.query.portfolioEntries.findMany({
                where: eq(portfolioEntries.loanId, loan.id),
              });

              await tx.insert(accountingEntries).values([
                ...reversalEntries,
                ...rebuiltArtifacts.accountingEntriesPayload,
              ]);

              await tx
                .update(accountingEntries)
                .set({
                  status: 'VOIDED',
                  statusDate: record.responseDate,
                })
                .where(
                  inArray(
                    accountingEntries.id,
                    currentActiveCreditEntries.map((item) => item.id)
                  )
                );

              await applyPortfolioDeltas(tx, {
                movementDate: record.responseDate,
                deltas: [
                  ...existingPortfolio.map((entry) => ({
                    glAccountId: entry.glAccountId,
                    thirdPartyId: entry.thirdPartyId,
                    loanId: entry.loanId,
                    installmentNumber: entry.installmentNumber,
                    dueDate: entry.dueDate,
                    chargeDelta: -toNumber(entry.chargeAmount),
                    paymentDelta: -toNumber(entry.paymentAmount),
                  })),
                  ...rebuiltArtifacts.portfolioDeltas,
                ],
              });

              for (const installment of nextInstallments) {
                await tx
                  .update(loanInstallments)
                  .set({
                    dueDate: installment.dueDate,
                    principalAmount: installment.principalAmount,
                    interestAmount: installment.interestAmount,
                    insuranceAmount: installment.insuranceAmount,
                    remainingPrincipal: installment.remainingPrincipal,
                    status: 'GENERATED',
                    updatedAt: new Date(),
                  })
                  .where(
                    and(
                      eq(loanInstallments.loanId, loan.id),
                      eq(loanInstallments.installmentNumber, installment.installmentNumber)
                    )
                  );
              }

              await tx
                .update(loans)
                .set({
                  initialTotalAmount: toDecimalString(schedule.summary.totalPayment),
                  insuranceValue: toDecimalString(schedule.summary.totalInsurance),
                  updatedAt: new Date(),
                })
                .where(eq(loans.id, loan.id));
            }
          }

          await tx
            .update(loans)
            .set({
              disbursementStatus: 'DISBURSED',
              firstCollectionDate: nextFirstCollectionDate,
              maturityDate: nextMaturityDate,
              hasPendingDisbursementAdjustment: wantsDateChange,
              updatedAt: new Date(),
            })
            .where(and(eq(loans.id, loan.id), eq(loans.status, 'ACCOUNTED'), eq(loans.disbursementStatus, 'SENT_TO_BANK')));

          await recordLoanDisbursementEvent(tx, {
            loanId: loan.id,
            eventType: 'DISBURSED',
            eventDate: record.responseDate,
            fromDisbursementStatus: loan.disbursementStatus,
            toDisbursementStatus: 'DISBURSED',
            previousFirstCollectionDate: loan.firstCollectionDate,
            newFirstCollectionDate: nextFirstCollectionDate,
            previousMaturityDate: loan.maturityDate,
            newMaturityDate: nextMaturityDate,
            changedByUserId: userId,
            changedByUserName: userName || userId,
            note: record.note?.trim() || 'Archivo de banco: desembolso confirmado',
            metadata: {
              source: 'BANK_NOVELTY_FILE',
              fileName: body.fileName,
              rowNumber: record.rowNumber,
              amount: previewRow.amount,
              changeFirstCollectionDate: wantsDateChange,
              adjustmentMode: wantsDateChange
                ? valueChangedAdjustment
                  ? 'VALUE_CHANGE'
                  : 'DATES_ONLY'
                : 'NONE',
            },
          });

          if (wantsDateChange) {
            await recordLoanDisbursementEvent(tx, {
              loanId: loan.id,
              eventType: 'DATES_UPDATED',
              eventDate: record.responseDate,
              fromDisbursementStatus: 'DISBURSED',
              toDisbursementStatus: 'DISBURSED',
              previousFirstCollectionDate: loan.firstCollectionDate,
              newFirstCollectionDate: nextFirstCollectionDate,
              previousMaturityDate: loan.maturityDate,
              newMaturityDate: nextMaturityDate,
              changedByUserId: userId,
              changedByUserName: userName || userId,
              note: 'Cambio de primera cuota registrado desde novedades del banco',
              metadata: {
                source: 'BANK_NOVELTY_FILE',
                fileName: body.fileName,
                rowNumber: record.rowNumber,
                previousFirstCollectionDate: loan.firstCollectionDate,
                newFirstCollectionDate: nextFirstCollectionDate,
                adjustmentMode: valueChangedAdjustment ? 'VALUE_CHANGE' : 'DATES_ONLY',
                previousInitialTotalAmount: valueChangedAdjustment
                  ? null
                  : undefined,
              },
            });
          }

          results.push({
            ...previewRow,
            currentDisbursementStatus: 'DISBURSED',
            currentFirstCollectionDate: nextFirstCollectionDate,
            requiresDateAdjustment: wantsDateChange,
            changedFirstCollectionDate: wantsDateChange,
            newFirstCollectionDate: wantsDateChange ? nextFirstCollectionDate : null,
            processed: true,
            processedAction: wantsDateChange ? 'DISBURSED_WITH_DATE_CHANGE' : 'DISBURSED',
          });
        }

        return results;
      });

      const summary = {
        ...buildNoveltyPreviewSummary(processedRows),
        processedRecords: processedRows.filter((row) => row.processed).length,
        disbursedProcessed: processedRows.filter((row) => row.processedAction === 'DISBURSED').length,
        rejectedProcessed: processedRows.filter((row) => row.processedAction === 'REJECTED').length,
        dateAdjustmentRecords: processedRows.filter(
          (row) => row.processedAction === 'DISBURSED_WITH_DATE_CHANGE'
        ).length,
      };

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'processNoveltyFile',
        status: 'success',
        metadata: {
          fileName: body.fileName,
          totalRecords: summary.totalRecords,
          processedRecords: summary.processedRecords,
          disbursedProcessed: summary.disbursedProcessed,
          rejectedProcessed: summary.rejectedProcessed,
          dateAdjustmentRecords: summary.dateAdjustmentRecords,
        },
        ipAddress,
        userAgent,
        userId,
        userName: userName || userId,
      });

      return {
        status: 200 as const,
        body: {
          fileName: body.fileName,
          summary,
          rows: processedRows,
          message: summary.dateAdjustmentRecords
            ? `Se procesaron ${summary.processedRecords} registros. ${summary.dateAdjustmentRecords} crédito(s) quedaron marcados como novedad de desembolso para ajuste contable${valueChangedAdjustments ? `, ${valueChangedAdjustments} con reliquidación de valores` : ''}.`
            : `Se procesaron ${summary.processedRecords} registros de novedades del banco.`,
        },
      };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: 'Error al procesar novedades del banco',
      });

      if (session) {
        const { userId, userName } = getRequiredUserContext(session);
        await logAudit(session, {
          resourceKey: appRoute.metadata.permissionKey.resourceKey,
          actionKey: appRoute.metadata.permissionKey.actionKey,
          action: 'update',
          functionName: 'processNoveltyFile',
          status: 'failure',
          errorMessage: error.body.message,
          metadata: {
            fileName: body.fileName,
            totalRecords: body.records.length,
          },
          ipAddress,
          userAgent,
          userId,
          userName: userName || userId,
        });
      }

      return error;
    }
  },
});
