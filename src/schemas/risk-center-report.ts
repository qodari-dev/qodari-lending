import { Contract } from '@/server/api/contracts';
import { ClientInferResponseBody } from '@ts-rest/core';
import { z } from 'zod';

export const RiskCenterReportTypeSchema = z.enum(['CIFIN', 'DATACREDITO']);
export type RiskCenterReportType = z.infer<typeof RiskCenterReportTypeSchema>;

const BaseGenerateRiskCenterReportBodySchema = z
  .object({
    creditCutoffDate: z.coerce.date(),
    paymentCutoffDate: z.coerce.date(),
  })
  .superRefine((value, ctx) => {
    if (value.paymentCutoffDate < value.creditCutoffDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['paymentCutoffDate'],
        message: 'La fecha de corte de pagos debe ser mayor o igual a la fecha de corte de creditos',
      });
    }
  });

export const GenerateRiskCenterCifinBodySchema = BaseGenerateRiskCenterReportBodySchema;
export const GenerateRiskCenterDatacreditoBodySchema = BaseGenerateRiskCenterReportBodySchema;

const BaseGenerateRiskCenterReportResponseSchema = z.object({
  reportType: RiskCenterReportTypeSchema,
  creditCutoffDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  paymentCutoffDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reviewedCredits: z.number().int().nonnegative(),
  reportedCredits: z.number().int().nonnegative(),
  fileName: z.string().min(1),
  fileContent: z.string(),
  message: z.string(),
});

export const GenerateRiskCenterCifinResponseSchema = BaseGenerateRiskCenterReportResponseSchema.extend({
  reportType: z.literal('CIFIN'),
});

export const GenerateRiskCenterDatacreditoResponseSchema =
  BaseGenerateRiskCenterReportResponseSchema.extend({
    reportType: z.literal('DATACREDITO'),
  });

export type GenerateRiskCenterCifinResult = ClientInferResponseBody<
  Contract['riskCenterReport']['generateCifin'],
  200
>;

export type GenerateRiskCenterDatacreditoResult = ClientInferResponseBody<
  Contract['riskCenterReport']['generateDatacredito'],
  200
>;

