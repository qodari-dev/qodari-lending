import { Contract } from '@/server/api/contracts';
import { ClientInferResponseBody } from '@ts-rest/core';
import { z } from 'zod';

export const InsuranceReportRowSchema = z.object({
  creditNumber: z.string().min(1),
  borrowerDocumentNumber: z.string().nullable(),
  borrowerName: z.string(),
  liquidationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  principalAmount: z.number().nonnegative(),
  insuredAmount: z.number().nonnegative(),
});

export type InsuranceReportRow = z.infer<typeof InsuranceReportRowSchema>;

export const GenerateInsuranceReportBodySchema = z
  .object({
    insuranceCompanyId: z.number().int().positive(),
    liquidatedCreditsStartDate: z.coerce.date(),
    liquidatedCreditsEndDate: z.coerce.date(),
  })
  .superRefine((value, ctx) => {
    if (value.liquidatedCreditsEndDate < value.liquidatedCreditsStartDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['liquidatedCreditsEndDate'],
        message:
          'La fecha final de creditos liquidados debe ser mayor o igual a la fecha inicial',
      });
    }
  });

export const GenerateInsuranceReportResponseSchema = z.object({
  insuranceCompanyId: z.number().int().positive(),
  insuranceCompanyName: z.string().min(1),
  liquidatedCreditsStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  liquidatedCreditsEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reviewedCredits: z.number().int().nonnegative(),
  reportedCredits: z.number().int().nonnegative(),
  rows: z.array(InsuranceReportRowSchema),
  message: z.string(),
});

export type GenerateInsuranceReportResult = ClientInferResponseBody<
  Contract['insuranceReport']['generate'],
  200
>;

