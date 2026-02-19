import {
  accountingDistributionLines,
  accountingEntries,
  creditProductAccounts,
  creditProducts,
  db,
  loanApplications,
  loanBillingConcepts,
  loanInstallments,
  loanProcessStates,
  loans,
  portfolioEntries,
  processRuns,
} from '@/server/db';
import {
  allocateAmountByPercentage,
  buildProcessRunDocumentCode,
  calculateBillingConceptAmount,
} from '@/server/utils/accounting-utils';
import { throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { applyPortfolioDeltas } from '@/server/utils/portfolio-utils';
import { roundMoney, toDecimalString, toNumber } from '@/server/utils/value-utils';
import { addDays } from 'date-fns';
import { and, asc, eq, inArray, lte, sql } from 'drizzle-orm';
import type { BillingConceptsRunSummary } from './types';

type LoanCandidate = {
  id: number;
  creditNumber: string;
  thirdPartyId: number;
  costCenterId: number | null;
  principalAmount: string;
  creditProductId: number;
  capitalDistributionId: number;
  capitalGlAccountId: number | null;
};

type InstallmentCandidate = {
  installmentNumber: number;
  dueDate: string;
  installmentAmount: number;
};

type DebitDistributionLine = typeof accountingDistributionLines.$inferSelect & {
  glAccount: { detailType: 'RECEIVABLE' | 'PAYABLE' | 'NONE' } | null;
};

function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

function isEndOfMonth(value: Date) {
  const nextDay = addDays(value, 1);
  return nextDay.getDate() === 1;
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
      principalAmount: loans.principalAmount,
      creditProductId: loanApplications.creditProductId,
      capitalDistributionId: creditProducts.capitalDistributionId,
      capitalGlAccountId: creditProductAccounts.capitalGlAccountId,
    })
    .from(loans)
    .innerJoin(loanApplications, eq(loans.loanApplicationId, loanApplications.id))
    .innerJoin(creditProducts, eq(loanApplications.creditProductId, creditProducts.id))
    .leftJoin(creditProductAccounts, eq(creditProductAccounts.creditProductId, creditProducts.id))
    .where(and(...conditions))
    .orderBy(asc(loans.id));
}

async function getLoanInstallments(loanId: number) {
  const rows = await db
    .select({
      installmentNumber: loanInstallments.installmentNumber,
      dueDate: loanInstallments.dueDate,
      principalAmount: loanInstallments.principalAmount,
      interestAmount: loanInstallments.interestAmount,
      insuranceAmount: loanInstallments.insuranceAmount,
    })
    .from(loanInstallments)
    .where(
      and(
        eq(loanInstallments.loanId, loanId),
        inArray(loanInstallments.status, ['GENERATED', 'ACCOUNTED'])
      )
    )
    .orderBy(asc(loanInstallments.dueDate), asc(loanInstallments.installmentNumber));

  return rows.map((row) => ({
    installmentNumber: row.installmentNumber,
    dueDate: row.dueDate,
    installmentAmount: roundMoney(
      toNumber(row.principalAmount) + toNumber(row.interestAmount) + toNumber(row.insuranceAmount)
    ),
  })) as InstallmentCandidate[];
}

async function getOutstandingPrincipal(loanId: number, capitalGlAccountId: number) {
  const rows = await db
    .select({
      balance: sql<string>`coalesce(sum(${portfolioEntries.balance}), 0)`,
    })
    .from(portfolioEntries)
    .where(
      and(
        eq(portfolioEntries.loanId, loanId),
        eq(portfolioEntries.glAccountId, capitalGlAccountId),
        eq(portfolioEntries.status, 'OPEN'),
        sql`${portfolioEntries.balance} > 0`
      )
    );

  return roundMoney(toNumber(rows[0]?.balance ?? '0'));
}

export async function executeBillingConceptsProcessRun(
  processRunId: number
): Promise<BillingConceptsRunSummary> {
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

  if (run.processType !== 'OTHER') {
    throwHttpError({
      status: 400,
      message: `El lote ${processRunId} no corresponde a otros conceptos`,
      code: 'BAD_REQUEST',
    });
  }

  const documentCode = buildProcessRunDocumentCode('OTHER', run.id);
  const processDate = parseDateOnly(run.processDate);
  const movementDate = run.transactionDate;

  await db
    .update(processRuns)
    .set({
      status: 'RUNNING',
      startedAt: new Date(),
      note: 'Proceso en ejecucion',
    })
    .where(eq(processRuns.id, run.id));

  let sequence = 1;
  const summary: BillingConceptsRunSummary = {
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
      message: 'No se encontraron creditos para el alcance seleccionado',
      code: 'NOT_FOUND',
    });
  }

  const loanIds = candidates.map((item) => item.id);
  const processStates =
    loanIds.length > 0
      ? await db.query.loanProcessStates.findMany({
          where: and(
            inArray(loanProcessStates.loanId, loanIds),
            eq(loanProcessStates.processType, 'OTHER')
          ),
        })
      : [];
  const stateByLoanId = new Map(processStates.map((item) => [item.loanId, item]));

  const debitLinesByProduct = new Map<number, DebitDistributionLine[]>();

  for (const loan of candidates) {
    summary.reviewedCredits += 1;

    try {
      if (!loan.capitalDistributionId || loan.capitalDistributionId <= 0) {
          throwHttpError({
            status: 400,
            message: `La linea de credito del credito ${loan.creditNumber} no tiene distribucion de capital`,
            code: 'BAD_REQUEST',
          });
      }

      const concepts = await db.query.loanBillingConcepts.findMany({
        where: eq(loanBillingConcepts.loanId, loan.id),
        with: {
          billingConcept: {
            columns: {
              name: true,
            },
          },
          glAccount: {
            columns: {
              detailType: true,
            },
          },
        },
      });

      const processableConcepts = concepts.filter(
        (item) =>
          item.financingMode === 'BILLED_SEPARATELY' &&
          (item.frequency === 'MONTHLY' || item.frequency === 'PER_INSTALLMENT')
      );
      if (!processableConcepts.length) {
        continue;
      }

      const previousState = stateByLoanId.get(loan.id);
      const installments = await getLoanInstallments(loan.id);
      if (!installments.length) {
        throwHttpError({
          status: 400,
          message: `El credito ${loan.creditNumber} no tiene cuotas activas`,
          code: 'BAD_REQUEST',
        });
      }

      const firstInstallment = installments[0];
      const dueInstallments = installments.filter((item) => {
        if (item.dueDate > run.processDate) return false;
        if (!previousState) return true;
        return item.dueDate > previousState.lastProcessedDate;
      });
      const monthlyReferenceInstallment =
        [...installments].reverse().find((item) => item.dueDate <= run.processDate) ??
        firstInstallment;

      let debitLines = debitLinesByProduct.get(loan.creditProductId);
      if (!debitLines) {
        const distributionLines = await db.query.accountingDistributionLines.findMany({
          where: eq(
            accountingDistributionLines.accountingDistributionId,
            loan.capitalDistributionId
          ),
          with: {
            glAccount: {
              columns: {
                detailType: true,
              },
            },
          },
        });

        const lines = distributionLines.filter((line) => line.nature === 'DEBIT');
        if (!lines.length) {
          throwHttpError({
            status: 400,
            message: `La distribucion de capital del credito ${loan.creditNumber} no tiene lineas debito`,
            code: 'BAD_REQUEST',
          });
        }

        const receivableLines = lines.filter((line) => line.glAccount?.detailType === 'RECEIVABLE');
        if (!receivableLines.length) {
          throwHttpError({
            status: 400,
            message: `La distribucion de capital del credito ${loan.creditNumber} no debita cuenta de cartera`,
            code: 'BAD_REQUEST',
          });
        }

        debitLinesByProduct.set(loan.creditProductId, lines);
        debitLines = lines;
      }

      const shouldProcessMonthly = isEndOfMonth(processDate);

      const principal = roundMoney(toNumber(loan.principalAmount));
      let outstandingPrincipal: number | null = null;

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
      let loanAccruedAmount = 0;

      for (const concept of processableConcepts) {
        if (!concept.glAccountId || concept.glAccountId <= 0) {
          throwHttpError({
            status: 400,
            message: `Concepto ${concept.billingConceptId} - ${concept.billingConcept.name} sin auxiliar configurado`,
            code: 'BAD_REQUEST',
          });
        }

        if (concept.glAccount?.detailType === 'RECEIVABLE') {
          throwHttpError({
            status: 400,
            message: `Concepto ${concept.billingConceptId} - ${concept.billingConcept.name} no puede acreditar cartera`,
            code: 'BAD_REQUEST',
          });
        }
        const conceptGlAccountId = concept.glAccountId;

        const requiresOutstandingBase = concept.baseAmount === 'OUTSTANDING_BALANCE';
        if (requiresOutstandingBase) {
          if (!loan.capitalGlAccountId || loan.capitalGlAccountId <= 0) {
            throwHttpError({
              status: 400,
              message: `La linea de credito del credito ${loan.creditNumber} no tiene auxiliar de capital`,
              code: 'BAD_REQUEST',
            });
          }
          if (outstandingPrincipal === null) {
            outstandingPrincipal = await getOutstandingPrincipal(loan.id, loan.capitalGlAccountId);
          }
        }

        const appendCharge = (args: {
          amount: number;
          installmentNumber: number;
          dueDate: string;
        }) => {
          const conceptAmount = roundMoney(args.amount);
          if (conceptAmount <= 0.01) return;

          loanAccruedAmount = roundMoney(loanAccruedAmount + conceptAmount);

          const debitAllocations = allocateAmountByPercentage({
            totalAmount: conceptAmount,
            lines: debitLines.map((line) => ({ id: line.id, percentage: line.percentage })),
          });

          for (const line of debitLines) {
            const lineAmount = roundMoney(debitAllocations.get(line.id) ?? 0);
            if (lineAmount <= 0) continue;

            entriesPayload.push({
              processType: 'OTHER',
              documentCode,
              sequence,
              entryDate: movementDate,
              glAccountId: line.glAccountId,
              costCenterId: loan.costCenterId,
              thirdPartyId: loan.thirdPartyId,
              description: `Causacion concepto ${concept.billingConceptId} credito ${loan.creditNumber}`.slice(
                0,
                255
              ),
              nature: 'DEBIT',
              amount: toDecimalString(lineAmount),
              loanId: loan.id,
              installmentNumber: args.installmentNumber,
              dueDate: args.dueDate,
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
                installmentNumber: args.installmentNumber,
                dueDate: args.dueDate,
                chargeDelta: lineAmount,
                paymentDelta: 0,
              });
            }
          }

          entriesPayload.push({
            processType: 'OTHER',
            documentCode,
            sequence,
            entryDate: movementDate,
            glAccountId: conceptGlAccountId,
            costCenterId: loan.costCenterId,
            thirdPartyId: loan.thirdPartyId,
            description: `Causacion concepto ${concept.billingConceptId} credito ${loan.creditNumber}`.slice(
              0,
              255
            ),
            nature: 'CREDIT',
            amount: toDecimalString(conceptAmount),
            loanId: loan.id,
            installmentNumber: args.installmentNumber,
            dueDate: args.dueDate,
            status: 'DRAFT',
            statusDate: movementDate,
            sourceType: 'PROCESS_RUN',
            sourceId: String(run.id),
            processRunId: run.id,
          });
          sequence += 1;
        };

        if (concept.frequency === 'PER_INSTALLMENT') {
          for (const installment of dueInstallments) {
            const amount = calculateBillingConceptAmount({
              concept: {
                calcMethod: concept.calcMethod,
                baseAmount: concept.baseAmount,
                rate: concept.rate,
                amount: concept.amount,
                minAmount: concept.minAmount,
                maxAmount: concept.maxAmount,
                roundingMode: concept.roundingMode,
                roundingDecimals: concept.roundingDecimals,
              },
              baseValues: {
                DISBURSED_AMOUNT: principal,
                PRINCIPAL: principal,
                OUTSTANDING_BALANCE: outstandingPrincipal ?? principal,
                INSTALLMENT_AMOUNT: installment.installmentAmount,
              },
            });
            appendCharge({
              amount,
              installmentNumber: installment.installmentNumber,
              dueDate: installment.dueDate,
            });
          }
        } else if (concept.frequency === 'MONTHLY' && shouldProcessMonthly) {
          const amount = calculateBillingConceptAmount({
            concept: {
              calcMethod: concept.calcMethod,
              baseAmount: concept.baseAmount,
              rate: concept.rate,
              amount: concept.amount,
              minAmount: concept.minAmount,
              maxAmount: concept.maxAmount,
              roundingMode: concept.roundingMode,
              roundingDecimals: concept.roundingDecimals,
            },
            baseValues: {
              DISBURSED_AMOUNT: principal,
              PRINCIPAL: principal,
              OUTSTANDING_BALANCE: outstandingPrincipal ?? principal,
              INSTALLMENT_AMOUNT: monthlyReferenceInstallment.installmentAmount,
            },
          });
          appendCharge({
            amount,
            installmentNumber: monthlyReferenceInstallment.installmentNumber,
            dueDate: monthlyReferenceInstallment.dueDate,
          });
        }
      }

      if (!entriesPayload.length) {
        continue;
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
          message: `Causacion descuadrada para credito ${loan.creditNumber}`,
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
            processType: 'OTHER',
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
      summary.totalAccruedAmount = roundMoney(summary.totalAccruedAmount + loanAccruedAmount);
    } catch (error) {
      summary.failedCredits += 1;
      summary.errors.push({
        loanId: loan.id,
        creditNumber: loan.creditNumber,
        reason: toErrorMessage(error, 'No fue posible procesar el credito'),
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
      note: `Proceso finalizado. Creditos causados: ${summary.accruedCredits}. Creditos con error: ${summary.failedCredits}.`,
    })
    .where(eq(processRuns.id, run.id));

  return summary;
}
