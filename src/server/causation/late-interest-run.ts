import {
  accountingDistributionLines,
  accountingEntries,
  creditProductAccounts,
  creditProductLateInterestRules,
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
import { and, asc, desc, eq, inArray, isNull, lte, gte, or, sql } from 'drizzle-orm';
import type { LateInterestRunSummary } from './types';

type LoanCandidate = {
  id: number;
  creditNumber: string;
  thirdPartyId: number;
  costCenterId: number | null;
  categoryCode: 'A' | 'B' | 'C' | 'D';
  creditProductId: number;
  ageBasis: 'OLDEST_OVERDUE_INSTALLMENT' | 'EACH_INSTALLMENT';
  lateInterestAccrualMethod: 'DAILY' | 'MONTHLY';
  lateInterestRateType:
    | 'EFFECTIVE_ANNUAL'
    | 'EFFECTIVE_MONTHLY'
    | 'NOMINAL_MONTHLY'
    | 'NOMINAL_ANNUAL'
    | 'MONTHLY_FLAT';
  lateInterestDayCountConvention: '30_360' | 'ACTUAL_360' | 'ACTUAL_365' | 'ACTUAL_ACTUAL';
  lateInterestDistributionId: number;
};

type LateRule = {
  id: number;
  creditProductId: number;
  categoryCode: 'A' | 'B' | 'C' | 'D';
  daysFrom: number;
  daysTo: number | null;
  lateFactor: string;
  priority: number;
};

type OverdueInstallment = {
  installmentNumber: number;
  dueDate: string;
  balance: number;
  daysPastDue: number;
};

function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

function maxDate(a: Date, b: Date): Date {
  return a.getTime() >= b.getTime() ? a : b;
}

function getYearBaseDays(convention: LoanCandidate['lateInterestDayCountConvention']): number {
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
  interestRateType: LoanCandidate['lateInterestRateType'];
  dayCountConvention: LoanCandidate['lateInterestDayCountConvention'];
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

function pickLateRule(rules: LateRule[], daysPastDue: number): LateRule | undefined {
  return rules.find(
    (rule) => daysPastDue >= rule.daysFrom && (rule.daysTo === null || daysPastDue <= rule.daysTo)
  );
}

function allocateAmountByWeight<T>(args: {
  totalAmount: number;
  items: T[];
  getWeight: (item: T) => number;
}): Map<T, number> {
  const map = new Map<T, number>();
  if (!args.items.length) return map;

  const weights = args.items.map((item) => Math.max(0, args.getWeight(item)));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (totalWeight <= 0 || args.totalAmount <= 0) {
    for (const item of args.items) map.set(item, 0);
    return map;
  }

  let accumulated = 0;
  for (let index = 0; index < args.items.length; index += 1) {
    const item = args.items[index];
    if (index === args.items.length - 1) {
      map.set(item, roundMoney(args.totalAmount - accumulated));
      break;
    }

    const amount = roundMoney((args.totalAmount * weights[index]!) / totalWeight);
    map.set(item, amount);
    accumulated = roundMoney(accumulated + amount);
  }

  return map;
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
      categoryCode: loanApplications.categoryCode,
      creditProductId: loanApplications.creditProductId,
      ageBasis: creditProducts.ageBasis,
      lateInterestAccrualMethod: creditProducts.lateInterestAccrualMethod,
      lateInterestRateType: creditProducts.lateInterestRateType,
      lateInterestDayCountConvention: creditProducts.lateInterestDayCountConvention,
      lateInterestDistributionId: creditProducts.lateInterestDistributionId,
    })
    .from(loans)
    .innerJoin(loanApplications, eq(loans.loanApplicationId, loanApplications.id))
    .innerJoin(creditProducts, eq(loanApplications.creditProductId, creditProducts.id))
    .where(and(...conditions))
    .orderBy(asc(loans.id));
}

async function getActiveRulesByProduct(processDate: string, creditProductIds: number[]) {
  if (!creditProductIds.length) {
    return new Map<string, LateRule[]>();
  }

  const rules = await db
    .select({
      id: creditProductLateInterestRules.id,
      creditProductId: creditProductLateInterestRules.creditProductId,
      categoryCode: creditProductLateInterestRules.categoryCode,
      daysFrom: creditProductLateInterestRules.daysFrom,
      daysTo: creditProductLateInterestRules.daysTo,
      lateFactor: creditProductLateInterestRules.lateFactor,
      priority: creditProductLateInterestRules.priority,
    })
    .from(creditProductLateInterestRules)
    .where(
      and(
        inArray(creditProductLateInterestRules.creditProductId, creditProductIds),
        eq(creditProductLateInterestRules.isActive, true),
        or(
          isNull(creditProductLateInterestRules.effectiveFrom),
          lte(creditProductLateInterestRules.effectiveFrom, processDate)
        ),
        or(
          isNull(creditProductLateInterestRules.effectiveTo),
          gte(creditProductLateInterestRules.effectiveTo, processDate)
        )
      )
    )
    .orderBy(
      asc(creditProductLateInterestRules.creditProductId),
      asc(creditProductLateInterestRules.categoryCode),
      desc(creditProductLateInterestRules.priority),
      desc(creditProductLateInterestRules.daysFrom),
      desc(creditProductLateInterestRules.id)
    );

  const map = new Map<string, LateRule[]>();
  for (const rule of rules) {
    const key = `${rule.creditProductId}:${rule.categoryCode}`;
    const list = map.get(key) ?? [];
    list.push(rule);
    map.set(key, list);
  }

  return map;
}

async function getOverdueInstallments(loanId: number, capitalGlAccountId: number, processDate: string) {
  const rows = await db
    .select({
      installmentNumber: portfolioEntries.installmentNumber,
      dueDate: portfolioEntries.dueDate,
      balance: portfolioEntries.balance,
    })
    .from(portfolioEntries)
    .where(
      and(
        eq(portfolioEntries.loanId, loanId),
        eq(portfolioEntries.glAccountId, capitalGlAccountId),
        eq(portfolioEntries.status, 'OPEN'),
        sql`${portfolioEntries.balance} > 0`,
        lte(portfolioEntries.dueDate, processDate)
      )
    )
    .orderBy(asc(portfolioEntries.dueDate), asc(portfolioEntries.installmentNumber));

  const processDateValue = parseDateOnly(processDate);
  const installments = rows
    .map((row) => {
      const daysPastDue = differenceInCalendarDays(processDateValue, parseDateOnly(row.dueDate));
      const balance = roundMoney(toNumber(row.balance));
      return {
        installmentNumber: row.installmentNumber,
        dueDate: row.dueDate,
        balance,
        daysPastDue,
      } satisfies OverdueInstallment;
    })
    .filter((row) => row.balance > 0.01 && row.daysPastDue > 0);

  return installments;
}

export async function executeLateInterestProcessRun(processRunId: number): Promise<LateInterestRunSummary> {
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

  if (run.processType !== 'LATE_INTEREST') {
    throwHttpError({
      status: 400,
      message: `El lote ${processRunId} no corresponde a interes mora`,
      code: 'BAD_REQUEST',
    });
  }

  const documentCode = buildProcessRunDocumentCode('LATE_INTEREST', run.id);
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
  const summary: LateInterestRunSummary = {
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
            eq(loanProcessStates.processType, 'LATE_INTEREST')
          ),
        })
      : [];
  const stateByLoanId = new Map(processStates.map((item) => [item.loanId, item]));

  const productIds = Array.from(new Set(candidates.map((item) => item.creditProductId)));
  const rulesByProductAndCategory = await getActiveRulesByProduct(run.processDate, productIds);

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
      if (loan.lateInterestAccrualMethod === 'MONTHLY') {
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

      const overdueInstallments = await getOverdueInstallments(
        loan.id,
        account.capitalGlAccountId,
        run.processDate
      );
      if (!overdueInstallments.length) {
        continue;
      }

      const daysToAccrue = Math.max(
        1,
        differenceInCalendarDays(effectiveEndDate, effectiveStartDate) + 1
      );

      const rulesKey = `${loan.creditProductId}:${loan.categoryCode}`;
      const rules = rulesByProductAndCategory.get(rulesKey) ?? [];
      if (!rules.length) {
        throwHttpError({
          status: 400,
          message: `No hay reglas activas de mora para crédito ${loan.creditNumber} (${loan.categoryCode})`,
          code: 'BAD_REQUEST',
        });
      }

      const accruedByInstallment = new Map<string, number>();
      let totalAccruedAmount = 0;

      if (loan.ageBasis === 'OLDEST_OVERDUE_INSTALLMENT') {
        const maxDaysPastDue = Math.max(...overdueInstallments.map((item) => item.daysPastDue));
        const selectedRule = pickLateRule(rules, maxDaysPastDue);
        if (!selectedRule) {
          throwHttpError({
            status: 400,
            message: `No hay regla de mora para ${maxDaysPastDue} días en crédito ${loan.creditNumber}`,
            code: 'BAD_REQUEST',
          });
        }

        const ratePercent = toNumber(selectedRule.lateFactor);
        if (ratePercent <= 0) {
          continue;
        }

        const periodRate = calculatePeriodRate({
          ratePercent,
          daysInterval: daysToAccrue,
          interestRateType: loan.lateInterestRateType,
          dayCountConvention: loan.lateInterestDayCountConvention,
        });

        const totalPastDueBalance = roundMoney(
          overdueInstallments.reduce((sum, item) => sum + item.balance, 0)
        );
        const accruedTotal = roundMoney(totalPastDueBalance * periodRate);
        if (accruedTotal <= 0.01) {
          continue;
        }

        const splitByInstallment = allocateAmountByWeight({
          totalAmount: accruedTotal,
          items: overdueInstallments,
          getWeight: (item) => item.balance,
        });
        for (const installment of overdueInstallments) {
          const amount = roundMoney(splitByInstallment.get(installment) ?? 0);
          if (amount <= 0.01) continue;
          accruedByInstallment.set(
            `${installment.installmentNumber}:${installment.dueDate}`,
            amount
          );
          totalAccruedAmount = roundMoney(totalAccruedAmount + amount);
        }
      } else {
        for (const installment of overdueInstallments) {
          const selectedRule = pickLateRule(rules, installment.daysPastDue);
          if (!selectedRule) {
            throwHttpError({
              status: 400,
              message: `No hay regla de mora para cuota ${installment.installmentNumber} (${installment.daysPastDue} días) del crédito ${loan.creditNumber}`,
              code: 'BAD_REQUEST',
            });
          }

          const ratePercent = toNumber(selectedRule.lateFactor);
          if (ratePercent <= 0) {
            continue;
          }

          const periodRate = calculatePeriodRate({
            ratePercent,
            daysInterval: daysToAccrue,
            interestRateType: loan.lateInterestRateType,
            dayCountConvention: loan.lateInterestDayCountConvention,
          });
          const accruedAmount = roundMoney(installment.balance * periodRate);
          if (accruedAmount <= 0.01) {
            continue;
          }

          accruedByInstallment.set(
            `${installment.installmentNumber}:${installment.dueDate}`,
            accruedAmount
          );
          totalAccruedAmount = roundMoney(totalAccruedAmount + accruedAmount);
        }
      }

      if (totalAccruedAmount <= 0.01) {
        continue;
      }

      let distributionLines = distributionLinesByProduct.get(loan.creditProductId);
      if (!distributionLines) {
        distributionLines = await db.query.accountingDistributionLines.findMany({
          where: eq(
            accountingDistributionLines.accountingDistributionId,
            loan.lateInterestDistributionId
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
          message: `La distribución de mora del crédito ${loan.creditNumber} no tiene líneas`,
          code: 'BAD_REQUEST',
        });
      }

      const debitLines = distributionLines.filter((line) => line.nature === 'DEBIT');
      const creditLines = distributionLines.filter((line) => line.nature === 'CREDIT');
      if (!debitLines.length || !creditLines.length) {
        throwHttpError({
          status: 400,
          message: `La distribución de mora del crédito ${loan.creditNumber} debe tener débito y crédito`,
          code: 'BAD_REQUEST',
        });
      }

      const receivableDebitLines = debitLines.filter(
        (line) => line.glAccount?.detailType === 'RECEIVABLE'
      );
      if (!receivableDebitLines.length) {
        throwHttpError({
          status: 400,
          message: `La distribución de mora del crédito ${loan.creditNumber} no debita cuenta de cartera`,
          code: 'BAD_REQUEST',
        });
      }

      const firstInstallment = overdueInstallments[0] ?? {
        installmentNumber: 1,
        dueDate: movementDate,
      };

      const debitAllocations = allocateAmountByPercentage({
        totalAmount: totalAccruedAmount,
        lines: debitLines.map((line) => ({ id: line.id, percentage: line.percentage })),
      });
      const creditAllocations = allocateAmountByPercentage({
        totalAmount: totalAccruedAmount,
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

      const installmentRefs = Array.from(accruedByInstallment.entries()).map(([key, amount]) => {
        const [installmentPart, dueDate] = key.split(':');
        return {
          installmentNumber: Number(installmentPart),
          dueDate,
          amount,
        };
      });

      for (const line of debitLines) {
        const amount = roundMoney(debitAllocations.get(line.id) ?? 0);
        if (amount <= 0) continue;

        entriesPayload.push({
          processType: 'LATE_INTEREST',
          documentCode,
          sequence,
          entryDate: movementDate,
          glAccountId: line.glAccountId,
          costCenterId: loan.costCenterId,
          thirdPartyId: loan.thirdPartyId,
          description: `Causación interés mora crédito ${loan.creditNumber}`.slice(0, 255),
          nature: 'DEBIT',
          amount: toDecimalString(amount),
          loanId: loan.id,
          installmentNumber: firstInstallment.installmentNumber,
          dueDate: firstInstallment.dueDate,
          status: 'DRAFT',
          statusDate: movementDate,
          sourceType: 'PROCESS_RUN',
          sourceId: String(run.id),
          processRunId: run.id,
        });
        sequence += 1;

        if (line.glAccount?.detailType === 'RECEIVABLE') {
          const splitByInstallment = allocateAmountByWeight({
            totalAmount: amount,
            items: installmentRefs,
            getWeight: (item) => item.amount,
          });
          for (const installment of installmentRefs) {
            const installmentAmount = roundMoney(splitByInstallment.get(installment) ?? 0);
            if (installmentAmount <= 0) continue;
            portfolioDeltas.push({
              glAccountId: line.glAccountId,
              thirdPartyId: loan.thirdPartyId,
              loanId: loan.id,
              installmentNumber: installment.installmentNumber,
              dueDate: installment.dueDate,
              chargeDelta: installmentAmount,
              paymentDelta: 0,
            });
          }
        }
      }

      for (const line of creditLines) {
        const amount = roundMoney(creditAllocations.get(line.id) ?? 0);
        if (amount <= 0) continue;

        entriesPayload.push({
          processType: 'LATE_INTEREST',
          documentCode,
          sequence,
          entryDate: movementDate,
          glAccountId: line.glAccountId,
          costCenterId: loan.costCenterId,
          thirdPartyId: loan.thirdPartyId,
          description: `Causación interés mora crédito ${loan.creditNumber}`.slice(0, 255),
          nature: 'CREDIT',
          amount: toDecimalString(amount),
          loanId: loan.id,
          installmentNumber: firstInstallment.installmentNumber,
          dueDate: firstInstallment.dueDate,
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
            processType: 'LATE_INTEREST',
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
      summary.totalAccruedAmount = roundMoney(summary.totalAccruedAmount + totalAccruedAmount);
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
