import { Contract } from '@/server/api/contracts';
import { ClientInferResponseBody } from '@ts-rest/core';
import { z } from 'zod';

// CREDITS
export const ProcessAccountingInterfaceCreditsBodySchema = z
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

export const ProcessAccountingInterfaceCreditsResponseSchema = z.object({
  interfaceType: z.literal('CREDITS'),
  periodStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  processedRecords: z.number().int().nonnegative(),
  message: z.string(),
});

export type ProcessAccountingInterfaceCreditsResult = ClientInferResponseBody<
  Contract['accountingInterface']['processCredits'],
  200
>;

// CURRENT INTEREST
export const ProcessAccountingInterfaceCurrentInterestBodySchema = z
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

export const ProcessAccountingInterfaceCurrentInterestResponseSchema = z.object({
  interfaceType: z.literal('CURRENT_INTEREST'),
  periodStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  processedRecords: z.number().int().nonnegative(),
  message: z.string(),
});

export type ProcessAccountingInterfaceCurrentInterestResult = ClientInferResponseBody<
  Contract['accountingInterface']['processCurrentInterest'],
  200
>;

// LATE INTEREST
export const ProcessAccountingInterfaceLateInterestBodySchema = z
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

export const ProcessAccountingInterfaceLateInterestResponseSchema = z.object({
  interfaceType: z.literal('LATE_INTEREST'),
  periodStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  processedRecords: z.number().int().nonnegative(),
  message: z.string(),
});

export type ProcessAccountingInterfaceLateInterestResult = ClientInferResponseBody<
  Contract['accountingInterface']['processLateInterest'],
  200
>;

// PAYMENTS
export const ProcessAccountingInterfacePaymentsBodySchema = z
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

export const ProcessAccountingInterfacePaymentsResponseSchema = z.object({
  interfaceType: z.literal('PAYMENTS'),
  periodStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  processedRecords: z.number().int().nonnegative(),
  message: z.string(),
});

export type ProcessAccountingInterfacePaymentsResult = ClientInferResponseBody<
  Contract['accountingInterface']['processPayments'],
  200
>;

// WRITE OFF
export const ProcessAccountingInterfaceWriteOffBodySchema = z
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

export const ProcessAccountingInterfaceWriteOffResponseSchema = z.object({
  interfaceType: z.literal('WRITE_OFF'),
  periodStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  processedRecords: z.number().int().nonnegative(),
  message: z.string(),
});

export type ProcessAccountingInterfaceWriteOffResult = ClientInferResponseBody<
  Contract['accountingInterface']['processWriteOff'],
  200
>;

// PROVISION
export const ProcessAccountingInterfaceProvisionBodySchema = z
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

export const ProcessAccountingInterfaceProvisionResponseSchema = z.object({
  interfaceType: z.literal('PROVISION'),
  periodStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  processedRecords: z.number().int().nonnegative(),
  message: z.string(),
});

export type ProcessAccountingInterfaceProvisionResult = ClientInferResponseBody<
  Contract['accountingInterface']['processProvision'],
  200
>;
