import {
  accountingDistributionLines,
  accountingEntries,
  creditProductAccounts,
  creditProducts,
  db,
  loanApplications,
  loanProcessStates,
  loans,
  portfolioEntries,
  processRuns,
} from '@/server/db';
import {
  allocateAmountByPercentage,
  buildProcessRunDocumentCode,
} from '@/server/utils/accounting-utils';
import { throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { applyPortfolioDeltas } from '@/server/utils/portfolio-utils';
import { roundMoney, toDecimalString, toNumber } from '@/server/utils/value-utils';
import { addDays, differenceInCalendarDays, startOfMonth } from 'date-fns';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import type { CurrentInterestRunSummary } from './types';

type LoanCandidate = {
  id: number;
  creditNumber: string;
  thirdPartyId: number;
  costCenterId: number | null;
  financingFactor: string;
  creditProductId: number;
  interestAccrualMethod: 'DAILY' | 'MONTHLY';
  interestRateType:
    | 'EFFECTIVE_ANNUAL'
    | 'EFFECTIVE_MONTHLY'
    | 'NOMINAL_MONTHLY'
    | 'NOMINAL_ANNUAL'
    | 'MONTHLY_FLAT';
  interestDayCountConvention: '30_360' | 'ACTUAL_360' | 'ACTUAL_365' | 'ACTUAL_ACTUAL';
  interestDistributionId: number;
};

function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

function maxDate(a: Date, b: Date): Date {
  return a.getTime() >= b.getTime() ? a : b;
}

function getYearBaseDays(convention: LoanCandidate['interestDayCountConvention']): number {
  switch (convention) {
    case 'ACTUAL_365':
      return 365;
    case 'ACTUAL_ACTUAL':
      return 365.25;
    case '30_360':
    case 'ACTUAL_360':
    default:
      return 360;
  }
}

function calculatePeriodRate(args: {
  ratePercent: number;
  daysInterval: number;
  interestRateType: LoanCandidate['interestRateType'];
  dayCountConvention: LoanCandidate['interestDayCountConvention'];
}): number {
  const rateDecimal = args.ratePercent / 100;
  if (rateDecimal === 0) return 0;

  const monthFraction = args.daysInterval / 30;
  const yearFraction = args.daysInterval / getYearBaseDays(args.dayCountConvention);

  switch (args.interestRateType) {
    case 'EFFECTIVE_ANNUAL':
      return Math.pow(1 + rateDecimal, yearFraction) - 1;
    case 'EFFECTIVE_MONTHLY':
      return Math.pow(1 + rateDecimal, monthFraction) - 1;
    case 'NOMINAL_MONTHLY':
    case 'MONTHLY_FLAT':
      return rateDecimal * monthFraction;
    case 'NOMINAL_ANNUAL':
    default:
      return rateDecimal * yearFraction;
  }
}

function isEndOfMonth(value: Date) {
  const nextDay = addDays(value, 1);
  return nextDay.getDate() === 1;
}

function isSameYearMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message.trim();
  }
  return fallback;
}

async function getLoanCandidates(run: typeof processRuns.$inferSelect): Promise<LoanCandidate[]> {
  const conditions = [inArray(loans.status, ['ACTIVE', 'ACCOUNTED'])];

  if (run.scopeType === 'LOAN') {
    conditions.push(eq(loans.id, run.scopeId));
  }
  if (run.scopeType === 'CREDIT_PRODUCT') {
    conditions.push(eq(loanApplications.creditProductId, run.scopeId));
  }

  return db
    .select({
      id: loans.id,
      creditNumber: loans.creditNumber,
      thirdPartyId: loans.thirdPartyId,
      costCenterId: loans.costCenterId,
      financingFactor: loanApplications.financingFactor,
      creditProductId: loanApplications.creditProductId,
      interestAccrualMethod: creditProducts.interestAccrualMethod,
      interestRateType: creditProducts.interestRateType,
      interestDayCountConvention: creditProducts.interestDayCountConvention,
      interestDistributionId: creditProducts.interestDistributionId,
    })
    .from(loans)
    .innerJoin(loanApplications, eq(loans.loanApplicationId, loanApplications.id))
    .innerJoin(creditProducts, eq(loanApplications.creditProductId, creditProducts.id))
    .where(and(...conditions))
    .orderBy(asc(loans.id));
}

export async function executeCurrentInterestProcessRun(processRunId: number): Promise<CurrentInterestRunSummary> {
  const run = await db.query.processRuns.findFirst({
    where: eq(processRuns.id, processRunId),
  });

  if (!run) {
    throwHttpError({
      status: 404,
      message: `Lote de proceso ${processRunId} no encontrado`,
      code: 'NOT_FOUND',
    });
  }

  if (run.processType !== 'INTEREST') {
    throwHttpError({
      status: 400,
      message: `El lote ${processRunId} no corresponde a interes corriente`,
      code: 'BAD_REQUEST',
    });
  }

  const documentCode = buildProcessRunDocumentCode('INTEREST', run.id);
  const processDate = parseDateOnly(run.processDate);
  const movementDate = run.transactionDate;

  await db
    .update(processRuns)
    .set({
      status: 'RUNNING',
      startedAt: new Date(),
      note: 'Proceso en ejecución',
    })
    .where(eq(processRuns.id, run.id));

  let sequence = 1;
  const summary: CurrentInterestRunSummary = {
    reviewedCredits: 0,
    accruedCredits: 0,
    failedCredits: 0,
    totalAccruedAmount: 0,
    errors: [],
  };

  const candidates = await getLoanCandidates(run);
  if (run.scopeType !== 'GENERAL' && !candidates.length) {
    throwHttpError({
      status: 404,
      message: 'No se encontraron créditos para el alcance seleccionado',
      code: 'NOT_FOUND',
    });
  }

  const loanIds = candidates.map((item) => item.id);
  const processStates =
    loanIds.length > 0
      ? await db.query.loanProcessStates.findMany({
          where: and(
            inArray(loanProcessStates.loanId, loanIds),
            eq(loanProcessStates.processType, 'INTEREST')
          ),
        })
      : [];
  const stateByLoanId = new Map(processStates.map((item) => [item.loanId, item]));

  const accountByProduct = new Map<number, { capitalGlAccountId: number }>();
  const distributionLinesByProduct = new Map<
    number,
    Array<
      typeof accountingDistributionLines.$inferSelect & {
        glAccount: { detailType: 'RECEIVABLE' | 'PAYABLE' | 'NONE' } | null;
      }
    >
  >();

  for (const loan of candidates) {
    summary.reviewedCredits += 1;

    try {
      const previousState = stateByLoanId.get(loan.id);
      const previousStateDate = previousState
        ? parseDateOnly(previousState.lastProcessedDate)
        : null;

      let effectiveStartDate = processDate;
      let effectiveEndDate = processDate;
      if (loan.interestAccrualMethod === 'MONTHLY') {
        if (!isEndOfMonth(processDate)) {
          continue;
        }

        if (previousStateDate && isSameYearMonth(previousStateDate, processDate)) {
          continue;
        }

        const monthStartDate = startOfMonth(processDate);
        const minStartDateByState = previousStateDate ? addDays(previousStateDate, 1) : monthStartDate;
        effectiveStartDate = maxDate(monthStartDate, minStartDateByState);
        effectiveEndDate = processDate;
      } else {
        if (previousStateDate && previousStateDate >= processDate) {
          continue;
        }

        const minStartDateByState = previousStateDate ? addDays(previousStateDate, 1) : processDate;
        effectiveStartDate = minStartDateByState;
        effectiveEndDate = processDate;
      }

      if (effectiveStartDate > effectiveEndDate) {
        continue;
      }

      let account = accountByProduct.get(loan.creditProductId);
      if (!account) {
        const accountRow = await db.query.creditProductAccounts.findFirst({
          where: eq(creditProductAccounts.creditProductId, loan.creditProductId),
          columns: { capitalGlAccountId: true },
        });

        if (!accountRow) {
          throwHttpError({
            status: 400,
            message: `La línea de crédito del crédito ${loan.creditNumber} no tiene auxiliares configurados`,
            code: 'BAD_REQUEST',
          });
        }

        account = accountRow;
        accountByProduct.set(loan.creditProductId, accountRow);
      }

      const balanceRows = await db
        .select({
          balance: sql<string>`coalesce(sum(${portfolioEntries.balance}), 0)`,
        })
        .from(portfolioEntries)
        .where(
          and(
            eq(portfolioEntries.loanId, loan.id),
            eq(portfolioEntries.glAccountId, account.capitalGlAccountId),
            eq(portfolioEntries.status, 'OPEN'),
            sql`${portfolioEntries.balance} > 0`
          )
        );

      const outstandingPrincipal = roundMoney(toNumber(balanceRows[0]?.balance ?? '0'));
      if (outstandingPrincipal <= 0.01) {
        continue;
      }

      const ratePercent = toNumber(loan.financingFactor);
      if (ratePercent <= 0) {
        continue;
      }

      const daysToAccrue = Math.max(
        1,
        differenceInCalendarDays(effectiveEndDate, effectiveStartDate) + 1
      );

      const periodRate = calculatePeriodRate({
        ratePercent,
        daysInterval: daysToAccrue,
        interestRateType: loan.interestRateType,
        dayCountConvention: loan.interestDayCountConvention,
      });
      const accruedAmount = roundMoney(outstandingPrincipal * periodRate);
      if (accruedAmount <= 0.01) {
        continue;
      }

      let distributionLines = distributionLinesByProduct.get(loan.creditProductId);
      if (!distributionLines) {
        distributionLines = await db.query.accountingDistributionLines.findMany({
          where: eq(
            accountingDistributionLines.accountingDistributionId,
            loan.interestDistributionId
          ),
          with: {
            glAccount: {
              columns: {
                detailType: true,
              },
            },
          },
        });
        distributionLinesByProduct.set(loan.creditProductId, distributionLines);
      }

      if (!distributionLines.length) {
        throwHttpError({
          status: 400,
          message: `La distribución de interés del crédito ${loan.creditNumber} no tiene líneas`,
          code: 'BAD_REQUEST',
        });
      }

      const debitLines = distributionLines.filter((line) => line.nature === 'DEBIT');
      const creditLines = distributionLines.filter((line) => line.nature === 'CREDIT');
      if (!debitLines.length || !creditLines.length) {
        throwHttpError({
          status: 400,
          message: `La distribución de interés del crédito ${loan.creditNumber} debe tener débito y crédito`,
          code: 'BAD_REQUEST',
        });
      }

      const receivableDebitLines = debitLines.filter(
        (line) => line.glAccount?.detailType === 'RECEIVABLE'
      );
      if (!receivableDebitLines.length) {
        throwHttpError({
          status: 400,
          message: `La distribución de interés del crédito ${loan.creditNumber} no debita cuenta de cartera`,
          code: 'BAD_REQUEST',
        });
      }

      const referenceRow = await db.query.portfolioEntries.findFirst({
        where: and(
          eq(portfolioEntries.loanId, loan.id),
          eq(portfolioEntries.glAccountId, account.capitalGlAccountId),
          eq(portfolioEntries.status, 'OPEN'),
          sql`${portfolioEntries.balance} > 0`
        ),
        orderBy: [asc(portfolioEntries.dueDate), asc(portfolioEntries.installmentNumber)],
      });

      const targetInstallmentNumber = referenceRow?.installmentNumber ?? 1;
      const targetDueDate = referenceRow?.dueDate ?? movementDate;

      const debitAllocations = allocateAmountByPercentage({
        totalAmount: accruedAmount,
        lines: debitLines.map((line) => ({ id: line.id, percentage: line.percentage })),
      });
      const creditAllocations = allocateAmountByPercentage({
        totalAmount: accruedAmount,
        lines: creditLines.map((line) => ({ id: line.id, percentage: line.percentage })),
      });

      const entriesPayload: Array<typeof accountingEntries.$inferInsert> = [];
      const portfolioDeltas: Array<{
        glAccountId: number;
        thirdPartyId: number;
        loanId: number;
        installmentNumber: number;
        dueDate: string;
        chargeDelta: number;
        paymentDelta: number;
      }> = [];

      for (const line of debitLines) {
        const amount = roundMoney(debitAllocations.get(line.id) ?? 0);
        if (amount <= 0) continue;

        entriesPayload.push({
          processType: 'INTEREST',
          documentCode,
          sequence,
          entryDate: movementDate,
          glAccountId: line.glAccountId,
          costCenterId: loan.costCenterId,
          thirdPartyId: loan.thirdPartyId,
          description: `Causación interés crédito ${loan.creditNumber}`.slice(0, 255),
          nature: 'DEBIT',
          amount: toDecimalString(amount),
          loanId: loan.id,
          installmentNumber: targetInstallmentNumber,
          dueDate: targetDueDate,
          status: 'DRAFT',
          statusDate: movementDate,
          sourceType: 'PROCESS_RUN',
          sourceId: String(run.id),
          processRunId: run.id,
        });
        sequence += 1;

        if (line.glAccount?.detailType === 'RECEIVABLE') {
          portfolioDeltas.push({
            glAccountId: line.glAccountId,
            thirdPartyId: loan.thirdPartyId,
            loanId: loan.id,
            installmentNumber: targetInstallmentNumber,
            dueDate: targetDueDate,
            chargeDelta: amount,
            paymentDelta: 0,
          });
        }
      }

      for (const line of creditLines) {
        const amount = roundMoney(creditAllocations.get(line.id) ?? 0);
        if (amount <= 0) continue;

        entriesPayload.push({
          processType: 'INTEREST',
          documentCode,
          sequence,
          entryDate: movementDate,
          glAccountId: line.glAccountId,
          costCenterId: loan.costCenterId,
          thirdPartyId: loan.thirdPartyId,
          description: `Causación interés crédito ${loan.creditNumber}`.slice(0, 255),
          nature: 'CREDIT',
          amount: toDecimalString(amount),
          loanId: loan.id,
          installmentNumber: targetInstallmentNumber,
          dueDate: targetDueDate,
          status: 'DRAFT',
          statusDate: movementDate,
          sourceType: 'PROCESS_RUN',
          sourceId: String(run.id),
          processRunId: run.id,
        });
        sequence += 1;
      }

      const debitTotal = roundMoney(
        entriesPayload
          .filter((entry) => entry.nature === 'DEBIT')
          .reduce((acc, entry) => acc + toNumber(entry.amount), 0)
      );
      const creditTotal = roundMoney(
        entriesPayload
          .filter((entry) => entry.nature === 'CREDIT')
          .reduce((acc, entry) => acc + toNumber(entry.amount), 0)
      );

      if (Math.abs(debitTotal - creditTotal) > 0.01) {
        throwHttpError({
          status: 400,
          message: `Causación descuadrada para crédito ${loan.creditNumber}`,
          code: 'BAD_REQUEST',
        });
      }

      await db.transaction(async (tx) => {
        await tx.insert(accountingEntries).values(entriesPayload);

        await applyPortfolioDeltas(tx, {
          movementDate,
          deltas: portfolioDeltas,
        });

        await tx
          .insert(loanProcessStates)
          .values({
            loanId: loan.id,
            processType: 'INTEREST',
            lastProcessedDate: run.processDate,
            lastProcessRunId: run.id,
            lastError: null,
          })
          .onConflictDoUpdate({
            target: [loanProcessStates.loanId, loanProcessStates.processType],
            set: {
              lastProcessedDate: run.processDate,
              lastProcessRunId: run.id,
              lastError: null,
            },
          });
      });

      summary.accruedCredits += 1;
      summary.totalAccruedAmount = roundMoney(summary.totalAccruedAmount + accruedAmount);
    } catch (error) {
      summary.failedCredits += 1;
      summary.errors.push({
        loanId: loan.id,
        creditNumber: loan.creditNumber,
        reason: toErrorMessage(error, 'No fue posible procesar el crédito'),
      });
    }
  }

  summary.totalAccruedAmount = roundMoney(summary.totalAccruedAmount);

  await db
    .update(processRuns)
    .set({
      status: 'COMPLETED',
      finishedAt: new Date(),
      summary: summary as unknown as Record<string, unknown>,
      note: `Proceso finalizado. Créditos causados: ${summary.accruedCredits}. Créditos con error: ${summary.failedCredits}.`,
    })
    .where(eq(processRuns.id, run.id));

  return summary;
}
