import {
  accountingDistributionLines,
  accountingEntries,
  db,
  insuranceCompanies,
  loanApplications,
  loanInstallments,
  loanProcessStates,
  loans,
  processRuns,
} from '@/server/db';
import {
  allocateAmountByPercentage,
  buildProcessRunDocumentCode,
} from '@/server/utils/accounting-utils';
import { throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { applyPortfolioDeltas } from '@/server/utils/portfolio-utils';
import { roundMoney, toDecimalString, toNumber } from '@/server/utils/value-utils';
import { and, asc, eq, gt, inArray, lte } from 'drizzle-orm';
import type { CurrentInsuranceRunSummary } from './types';

type LoanCandidate = {
  id: number;
  creditNumber: string;
  thirdPartyId: number;
  costCenterId: number | null;
  insuranceCompanyId: number | null;
  insuranceValue: string | null;
  creditProductId: number;
};

type InstallmentInsuranceCharge = {
  installmentNumber: number;
  dueDate: string;
  amount: number;
};

function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00`);
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
      insuranceCompanyId: loans.insuranceCompanyId,
      insuranceValue: loans.insuranceValue,
      creditProductId: loanApplications.creditProductId,
    })
    .from(loans)
    .innerJoin(loanApplications, eq(loans.loanApplicationId, loanApplications.id))
    .where(and(...conditions))
    .orderBy(asc(loans.id));
}

async function getInstallmentCharges(args: {
  loanId: number;
  processDate: string;
  previousStateDate: string | null;
}) {
  const whereParts = [
    eq(loanInstallments.loanId, args.loanId),
    inArray(loanInstallments.status, ['GENERATED', 'ACCOUNTED']),
    lte(loanInstallments.dueDate, args.processDate),
  ];

  if (args.previousStateDate) {
    whereParts.push(gt(loanInstallments.dueDate, args.previousStateDate));
  }

  const rows = await db
    .select({
      installmentNumber: loanInstallments.installmentNumber,
      dueDate: loanInstallments.dueDate,
      insuranceAmount: loanInstallments.insuranceAmount,
    })
    .from(loanInstallments)
    .where(and(...whereParts))
    .orderBy(asc(loanInstallments.dueDate), asc(loanInstallments.installmentNumber));

  return rows
    .map((row) => ({
      installmentNumber: row.installmentNumber,
      dueDate: row.dueDate,
      amount: roundMoney(toNumber(row.insuranceAmount)),
    }))
    .filter((row) => row.amount > 0.01) as InstallmentInsuranceCharge[];
}

export async function executeCurrentInsuranceProcessRun(
  processRunId: number
): Promise<CurrentInsuranceRunSummary> {
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

  if (run.processType !== 'INSURANCE') {
    throwHttpError({
      status: 400,
      message: `El lote ${processRunId} no corresponde a seguro`,
      code: 'BAD_REQUEST',
    });
  }

  const documentCode = buildProcessRunDocumentCode('INSURANCE', run.id);
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
  const summary: CurrentInsuranceRunSummary = {
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
            eq(loanProcessStates.processType, 'INSURANCE')
          ),
        })
      : [];
  const stateByLoanId = new Map(processStates.map((item) => [item.loanId, item]));

  const distributionIdByInsuranceCompany = new Map<number, number>();
  const distributionLinesByInsuranceCompany = new Map<
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
      if (!loan.insuranceCompanyId) {
        continue;
      }

      const totalInsurance = roundMoney(toNumber(loan.insuranceValue ?? '0'));
      if (totalInsurance <= 0.01) {
        continue;
      }

      const previousState = stateByLoanId.get(loan.id);
      if (previousState && parseDateOnly(previousState.lastProcessedDate) >= processDate) {
        continue;
      }

      const installmentCharges = await getInstallmentCharges({
        loanId: loan.id,
        processDate: run.processDate,
        previousStateDate: previousState?.lastProcessedDate ?? null,
      });
      if (!installmentCharges.length) {
        continue;
      }

      let distributionId = distributionIdByInsuranceCompany.get(loan.insuranceCompanyId);
      if (!distributionId) {
        const company = await db.query.insuranceCompanies.findFirst({
          where: eq(insuranceCompanies.id, loan.insuranceCompanyId),
          columns: {
            distributionId: true,
          },
        });
        if (!company) {
          throwHttpError({
            status: 400,
            message: `No existe aseguradora configurada para crédito ${loan.creditNumber}`,
            code: 'BAD_REQUEST',
          });
        }

        distributionId = company.distributionId;
        distributionIdByInsuranceCompany.set(loan.insuranceCompanyId, distributionId);
      }

      let distributionLines = distributionLinesByInsuranceCompany.get(loan.insuranceCompanyId);
      if (!distributionLines) {
        distributionLines = await db.query.accountingDistributionLines.findMany({
          where: eq(accountingDistributionLines.accountingDistributionId, distributionId),
          with: {
            glAccount: {
              columns: {
                detailType: true,
              },
            },
          },
        });
        distributionLinesByInsuranceCompany.set(loan.insuranceCompanyId, distributionLines);
      }

      if (!distributionLines.length) {
        throwHttpError({
          status: 400,
          message: `La distribución de seguro del crédito ${loan.creditNumber} no tiene líneas`,
          code: 'BAD_REQUEST',
        });
      }

      const debitLines = distributionLines.filter((line) => line.nature === 'DEBIT');
      const creditLines = distributionLines.filter((line) => line.nature === 'CREDIT');
      if (!debitLines.length || !creditLines.length) {
        throwHttpError({
          status: 400,
          message: `La distribución de seguro del crédito ${loan.creditNumber} debe tener débito y crédito`,
          code: 'BAD_REQUEST',
        });
      }

      const receivableDebitLines = debitLines.filter(
        (line) => line.glAccount?.detailType === 'RECEIVABLE'
      );
      if (!receivableDebitLines.length) {
        throwHttpError({
          status: 400,
          message: `La distribución de seguro del crédito ${loan.creditNumber} no debita cuenta de cartera`,
          code: 'BAD_REQUEST',
        });
      }

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

      for (const installment of installmentCharges) {
        const installmentAmount = installment.amount;
        loanAccruedAmount = roundMoney(loanAccruedAmount + installmentAmount);

        const debitAllocations = allocateAmountByPercentage({
          totalAmount: installmentAmount,
          lines: debitLines.map((line) => ({ id: line.id, percentage: line.percentage })),
        });
        const creditAllocations = allocateAmountByPercentage({
          totalAmount: installmentAmount,
          lines: creditLines.map((line) => ({ id: line.id, percentage: line.percentage })),
        });

        for (const line of debitLines) {
          const amount = roundMoney(debitAllocations.get(line.id) ?? 0);
          if (amount <= 0) continue;

          entriesPayload.push({
            processType: 'INSURANCE',
            documentCode,
            sequence,
            entryDate: movementDate,
            glAccountId: line.glAccountId,
            costCenterId: loan.costCenterId,
            thirdPartyId: loan.thirdPartyId,
            description: `Causación seguro crédito ${loan.creditNumber}`.slice(0, 255),
            nature: 'DEBIT',
            amount: toDecimalString(amount),
            loanId: loan.id,
            installmentNumber: installment.installmentNumber,
            dueDate: installment.dueDate,
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
              installmentNumber: installment.installmentNumber,
              dueDate: installment.dueDate,
              chargeDelta: amount,
              paymentDelta: 0,
            });
          }
        }

        for (const line of creditLines) {
          const amount = roundMoney(creditAllocations.get(line.id) ?? 0);
          if (amount <= 0) continue;

          entriesPayload.push({
            processType: 'INSURANCE',
            documentCode,
            sequence,
            entryDate: movementDate,
            glAccountId: line.glAccountId,
            costCenterId: loan.costCenterId,
            thirdPartyId: loan.thirdPartyId,
            description: `Causación seguro crédito ${loan.creditNumber}`.slice(0, 255),
            nature: 'CREDIT',
            amount: toDecimalString(amount),
            loanId: loan.id,
            installmentNumber: installment.installmentNumber,
            dueDate: installment.dueDate,
            status: 'DRAFT',
            statusDate: movementDate,
            sourceType: 'PROCESS_RUN',
            sourceId: String(run.id),
            processRunId: run.id,
          });
          sequence += 1;
        }
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
            processType: 'INSURANCE',
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
