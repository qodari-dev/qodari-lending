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
export const ListRiskCenterReportRunsQuerySchema = z.object({
  reportType: RiskCenterReportTypeSchema.optional(),
});
export const GetRiskCenterReportRunItemsPathParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

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

export const RiskCenterReportRunSchema = z.object({
  id: z.number().int().positive(),
  riskCenterType: RiskCenterReportTypeSchema,
  creditCutoffDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  paymentCutoffDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reviewedCredits: z.number().int().nonnegative(),
  reportedCredits: z.number().int().nonnegative(),
  fileName: z.string().min(1),
  generatedByUserId: z.string().min(1),
  generatedByUserName: z.string().min(1),
  generatedAt: z.union([z.string(), z.date()]),
  note: z.string().nullable().optional(),
});

export const RiskCenterReportItemSchema = z.object({
  id: z.number().int().positive(),
  riskCenterReportRunId: z.number().int().positive(),
  loanId: z.number().int().positive(),
  riskCenterType: RiskCenterReportTypeSchema,
  reportDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  wasReported: z.boolean(),
  reportedStatus: z.string().min(1),
  daysPastDue: z.number().int().nonnegative(),
  currentBalance: z.string(),
  overdueBalance: z.string(),
  reportedThirdPartiesCount: z.number().int().nonnegative(),
  note: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  loan: z
    .object({
      id: z.number().int().positive(),
      creditNumber: z.string().min(1),
      borrower: z
        .object({
          documentNumber: z.string().min(1),
          firstName: z.string().nullable().optional(),
          secondName: z.string().nullable().optional(),
          firstLastName: z.string().nullable().optional(),
          secondLastName: z.string().nullable().optional(),
          businessName: z.string().nullable().optional(),
        })
        .nullable()
        .optional(),
    })
    .nullable()
    .optional(),
});

export const ListRiskCenterReportRunsResponseSchema = z.array(RiskCenterReportRunSchema);
export const GetRiskCenterReportRunItemsResponseSchema = z.object({
  run: RiskCenterReportRunSchema,
  items: z.array(RiskCenterReportItemSchema),
});

export type GenerateRiskCenterCifinResult = ClientInferResponseBody<
  Contract['riskCenterReport']['generateCifin'],
  200
>;

export type GenerateRiskCenterDatacreditoResult = ClientInferResponseBody<
  Contract['riskCenterReport']['generateDatacredito'],
  200
>;

export type RiskCenterReportRun = z.infer<typeof RiskCenterReportRunSchema>;
export type RiskCenterReportItem = z.infer<typeof RiskCenterReportItemSchema>;
export type ListRiskCenterReportRunsResult = ClientInferResponseBody<
  Contract['riskCenterReport']['listRuns'],
  200
>;
export type GetRiskCenterReportRunItemsResult = ClientInferResponseBody<
  Contract['riskCenterReport']['getRunItems'],
  200
>;
