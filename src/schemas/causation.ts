import { Contract } from '@/server/api/contracts';
import { ClientInferResponseBody } from '@ts-rest/core';
import { z } from 'zod';

export const CAUSATION_SCOPE_TYPE_OPTIONS = ['GENERAL', 'CREDIT_PRODUCT', 'LOAN'] as const;

function buildCausationProcessBodySchema() {
  return z
    .object({
      startDate: z.coerce.date(),
      endDate: z.coerce.date(),
      transactionDate: z.coerce.date(),
    })
    .superRefine((value, ctx) => {
      if (value.endDate < value.startDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['endDate'],
          message: 'La fecha final debe ser mayor o igual a la fecha inicial',
        });
      }
    });
}

export const ProcessCausationCurrentInterestBodySchema = z
  .object({
    processDate: z.coerce.date(),
    transactionDate: z.coerce.date(),
    scopeType: z.enum(CAUSATION_SCOPE_TYPE_OPTIONS).default('GENERAL'),
    creditProductId: z.number().int().positive().optional(),
    loanId: z.number().int().positive().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.scopeType === 'GENERAL') {
      return;
    }

    if (value.scopeType === 'CREDIT_PRODUCT' && !value.creditProductId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['creditProductId'],
        message: 'Debe seleccionar línea de crédito',
      });
    }

    if (value.scopeType === 'LOAN' && !value.loanId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['loanId'],
        message: 'Debe seleccionar crédito',
      });
    }
  });

export const ProcessCausationCurrentInterestResponseSchema = z.object({
  processRunId: z.number().int().positive(),
  processType: z.literal('CURRENT_INTEREST'),
  status: z.enum(['QUEUED', 'RUNNING']),
  message: z.string(),
});

export type ProcessCausationCurrentInterestResult = ClientInferResponseBody<
  Contract['causation']['processCurrentInterest'],
  200
>;

export const CausationRunErrorSchema = z.object({
  loanId: z.number().int().positive(),
  creditNumber: z.string(),
  reason: z.string(),
});

export const CausationCurrentInterestRunStatusResponseSchema = z.object({
  id: z.number().int().positive(),
  processType: z.literal('CURRENT_INTEREST'),
  status: z.enum(['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELED']),
  scopeType: z.enum(CAUSATION_SCOPE_TYPE_OPTIONS),
  scopeId: z.number().int().nonnegative(),
  processDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reviewedCredits: z.number().int().nonnegative(),
  accruedCredits: z.number().int().nonnegative(),
  failedCredits: z.number().int().nonnegative(),
  totalAccruedAmount: z.number().nonnegative(),
  errors: z.array(CausationRunErrorSchema),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  message: z.string(),
});

export type CausationCurrentInterestRunStatusResult = ClientInferResponseBody<
  Contract['causation']['getCurrentInterestRun'],
  200
>;

export const ProcessCausationLateInterestBodySchema = buildCausationProcessBodySchema();

export const ProcessCausationLateInterestResponseSchema = z.object({
  processType: z.literal('LATE_INTEREST'),
  periodStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reviewedCredits: z.number().int().nonnegative(),
  accruedCredits: z.number().int().nonnegative(),
  totalAccruedAmount: z.number().nonnegative(),
  message: z.string(),
});

export type ProcessCausationLateInterestResult = ClientInferResponseBody<
  Contract['causation']['processLateInterest'],
  200
>;

export const ProcessCausationCurrentInsuranceBodySchema = buildCausationProcessBodySchema();

export const ProcessCausationCurrentInsuranceResponseSchema = z.object({
  processType: z.literal('CURRENT_INSURANCE'),
  periodStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reviewedCredits: z.number().int().nonnegative(),
  accruedCredits: z.number().int().nonnegative(),
  totalAccruedAmount: z.number().nonnegative(),
  message: z.string(),
});

export type ProcessCausationCurrentInsuranceResult = ClientInferResponseBody<
  Contract['causation']['processCurrentInsurance'],
  200
>;

export const CloseCausationPeriodBodySchema = z.object({
  accountingPeriodId: z.number().int().positive(),
});

export const CloseCausationPeriodResponseSchema = z.object({
  accountingPeriodId: z.number().int().positive(),
  periodLabel: z.string().min(1),
  closedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  insertedAgingSnapshots: z.number().int().nonnegative(),
  insertedProvisionSnapshots: z.number().int().nonnegative(),
  insertedAccrualSnapshots: z.number().int().nonnegative(),
  message: z.string(),
});

export type CloseCausationPeriodResult = ClientInferResponseBody<
  Contract['causation']['closePeriod'],
  200
>;
