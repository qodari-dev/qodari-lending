import { accountingPeriods, creditProducts, db, loans, processRuns } from '@/server/db';
import { enqueueBillingConceptsJob } from '@/server/queues/billing-concepts-queue';
import { throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { formatDateOnly } from '@/server/utils/value-utils';
import { and, eq } from 'drizzle-orm';
import type { BillingConceptsRunSummary, CausationScopeType } from './types';

type CreateBillingConceptsRunInput = {
  processDate: Date;
  transactionDate: Date;
  scopeType: CausationScopeType;
  creditProductId?: number | null;
  loanId?: number | null;
  executedByUserId: string;
  executedByUserName: string;
  triggerSource: 'MANUAL' | 'CRON';
};

function resolveScopeId(input: {
  scopeType: CausationScopeType;
  creditProductId?: number | null;
  loanId?: number | null;
}): number {
  if (input.scopeType === 'GENERAL') return 0;
  if (input.scopeType === 'CREDIT_PRODUCT') {
    const scopeId = Number(input.creditProductId);
    if (!Number.isFinite(scopeId) || scopeId <= 0) {
      throwHttpError({
        status: 400,
        message: 'Debe seleccionar linea de credito para alcance por linea',
        code: 'BAD_REQUEST',
      });
    }
    return scopeId;
  }

  const scopeId = Number(input.loanId);
  if (!Number.isFinite(scopeId) || scopeId <= 0) {
    throwHttpError({
      status: 400,
      message: 'Debe seleccionar credito para alcance por credito',
      code: 'BAD_REQUEST',
    });
  }

  return scopeId;
}

async function validateScopeTarget(scopeType: CausationScopeType, scopeId: number) {
  if (scopeType === 'GENERAL') return;

  if (scopeType === 'CREDIT_PRODUCT') {
    const exists = await db.query.creditProducts.findFirst({
      where: eq(creditProducts.id, scopeId),
      columns: { id: true },
    });
    if (!exists) {
      throwHttpError({
        status: 404,
        message: `Linea de credito con ID ${scopeId} no encontrada`,
        code: 'NOT_FOUND',
      });
    }
    return;
  }

  const exists = await db.query.loans.findFirst({
    where: eq(loans.id, scopeId),
    columns: { id: true },
  });
  if (!exists) {
    throwHttpError({
      status: 404,
      message: `Credito con ID ${scopeId} no encontrado`,
      code: 'NOT_FOUND',
    });
  }
}

function getOpenAccountingPeriod(date: Date) {
  return db.query.accountingPeriods.findFirst({
    where: and(
      eq(accountingPeriods.year, date.getFullYear()),
      eq(accountingPeriods.month, date.getMonth() + 1),
      eq(accountingPeriods.isClosed, false)
    ),
  });
}

export async function createAndQueueBillingConceptsRun(input: CreateBillingConceptsRunInput) {
  const processDate = formatDateOnly(input.processDate);
  const transactionDate = formatDateOnly(input.transactionDate);
  const scopeId = resolveScopeId(input);
  await validateScopeTarget(input.scopeType, scopeId);

  const accountingPeriod = await getOpenAccountingPeriod(input.processDate);
  if (!accountingPeriod) {
    throwHttpError({
      status: 400,
      message: 'No existe periodo contable abierto para la fecha seleccionada',
      code: 'BAD_REQUEST',
    });
  }

  const existingRun = await db.query.processRuns.findFirst({
    where: and(
      eq(processRuns.processType, 'OTHER'),
      eq(processRuns.processDate, processDate),
      eq(processRuns.scopeType, input.scopeType),
      eq(processRuns.scopeId, scopeId)
    ),
    columns: {
      id: true,
      status: true,
    },
  });

  if (existingRun) {
    throwHttpError({
      status: 409,
      message: `Ya existe una corrida para este proceso/fecha/alcance (run #${existingRun.id}, estado ${existingRun.status})`,
      code: 'CONFLICT',
    });
  }

  const [createdRun] = await db
    .insert(processRuns)
    .values({
      processType: 'OTHER',
      scopeType: input.scopeType,
      scopeId,
      accountingPeriodId: accountingPeriod.id,
      processDate,
      transactionDate,
      triggerSource: input.triggerSource,
      executedByUserId: input.executedByUserId,
      executedByUserName: input.executedByUserName,
      executedAt: new Date(),
      status: 'QUEUED',
      note: 'Corrida encolada para procesamiento asincrono',
      summary: null,
    })
    .returning();

  try {
    await enqueueBillingConceptsJob({
      processRunId: createdRun.id,
    });
  } catch (error) {
    await db
      .update(processRuns)
      .set({
        status: 'FAILED',
        finishedAt: new Date(),
        note: `No fue posible encolar la corrida: ${error instanceof Error ? error.message : 'Error inesperado'}`,
      })
      .where(eq(processRuns.id, createdRun.id));

    throwHttpError({
      status: 500,
      message: 'No fue posible encolar la corrida de causacion',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }

  return createdRun;
}

function toSummary(value: unknown): BillingConceptsRunSummary {
  const fallback: BillingConceptsRunSummary = {
    reviewedCredits: 0,
    accruedCredits: 0,
    failedCredits: 0,
    totalAccruedAmount: 0,
    errors: [],
  };

  if (typeof value !== 'object' || value === null) return fallback;
  const summary = value as Partial<BillingConceptsRunSummary>;

  return {
    reviewedCredits: Number(summary.reviewedCredits ?? 0),
    accruedCredits: Number(summary.accruedCredits ?? 0),
    failedCredits: Number(summary.failedCredits ?? 0),
    totalAccruedAmount: Number(summary.totalAccruedAmount ?? 0),
    errors: Array.isArray(summary.errors) ? summary.errors : [],
  };
}

export async function getBillingConceptsRunStatus(processRunId: number) {
  const run = await db.query.processRuns.findFirst({
    where: eq(processRuns.id, processRunId),
  });

  if (!run) {
    throwHttpError({
      status: 404,
      message: `Corrida ${processRunId} no encontrada`,
      code: 'NOT_FOUND',
    });
  }

  if (run.processType !== 'OTHER') {
    throwHttpError({
      status: 400,
      message: 'La corrida solicitada no corresponde a otros conceptos',
      code: 'BAD_REQUEST',
    });
  }

  const summary = toSummary(run.summary);

  return {
    id: run.id,
    processType: 'BILLING_CONCEPTS' as const,
    status: run.status,
    scopeType: run.scopeType,
    scopeId: run.scopeId,
    processDate: run.processDate,
    transactionDate: run.transactionDate,
    reviewedCredits: summary.reviewedCredits,
    accruedCredits: summary.accruedCredits,
    failedCredits: summary.failedCredits,
    totalAccruedAmount: summary.totalAccruedAmount,
    errors: summary.errors,
    startedAt: run.startedAt ? run.startedAt.toISOString() : null,
    finishedAt: run.finishedAt ? run.finishedAt.toISOString() : null,
    message: run.note ?? '',
  };
}
