import { Contract } from '@/server/api/contracts';
import { ClientInferResponseBody } from '@ts-rest/core';
import { z } from 'zod';

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

export const ProcessCausationCurrentInterestBodySchema = buildCausationProcessBodySchema();

export const ProcessCausationCurrentInterestResponseSchema = z.object({
  processType: z.literal('CURRENT_INTEREST'),
  periodStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reviewedCredits: z.number().int().nonnegative(),
  accruedCredits: z.number().int().nonnegative(),
  totalAccruedAmount: z.number().nonnegative(),
  message: z.string(),
});

export type ProcessCausationCurrentInterestResult = ClientInferResponseBody<
  Contract['causation']['processCurrentInterest'],
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
