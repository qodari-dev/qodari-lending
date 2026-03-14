import { Contract } from '@/server/api/contracts';
import { ClientInferResponseBody } from '@ts-rest/core';
import { z } from 'zod';

export const GeneratePledgePaymentVoucherBodySchema = z.object({
  period: z.string().trim().min(1, 'El periodo es requerido').max(50),
  movementGenerationDate: z.coerce.date(),
});

export const SubsidyPledgePaymentVoucherItemResultSchema = z.object({
  workerDocumentNumber: z.string().nullable(),
  mark: z.string().nullable(),
  documentNumber: z.string().nullable(),
  creditNumber: z.string().nullable(),
  loanId: z.number().int().positive().nullable(),
  loanPaymentId: z.number().int().positive().nullable(),
  discountedAmount: z.number().nonnegative(),
  appliedAmount: z.number().nonnegative(),
  status: z.enum(['PROCESSED', 'SKIPPED', 'ERROR']),
  message: z.string(),
});

export const SubsidyPledgePaymentVoucherStatusSchema = z.enum([
  'QUEUED',
  'RUNNING',
  'COMPLETED',
  'PARTIAL',
  'FAILED',
]);

export const SubsidyPledgePaymentVoucherSummarySchema = z.object({
  voucherId: z.number().int().positive(),
  period: z.string().min(1),
  movementGenerationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  subsidySource: z.string().min(1),
  status: SubsidyPledgePaymentVoucherStatusSchema,
  totalRows: z.number().int().nonnegative(),
  processedCredits: z.number().int().nonnegative(),
  processedPayments: z.number().int().nonnegative(),
  skippedRows: z.number().int().nonnegative(),
  errorRows: z.number().int().nonnegative(),
  totalDiscountedAmount: z.number().nonnegative(),
  totalAppliedAmount: z.number().nonnegative(),
  message: z.string(),
  startedAt: z.string().datetime().nullable(),
  finishedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export const GeneratePledgePaymentVoucherResponseSchema =
  SubsidyPledgePaymentVoucherSummarySchema.extend({
    rows: z.array(SubsidyPledgePaymentVoucherItemResultSchema),
  });

export const ListSubsidyPledgePaymentVouchersQuerySchema = z.object({
  limit: z.number().int().min(1).max(50).optional(),
});

export const ListSubsidyPledgePaymentVouchersResponseSchema = z.array(
  SubsidyPledgePaymentVoucherSummarySchema
);

export const GetSubsidyPledgePaymentVoucherParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type GeneratePledgePaymentVoucherResult = ClientInferResponseBody<
  Contract['subsidy']['generatePledgePaymentVoucher'],
  200
>;

export const GeneratePerformedPledgesReportBodySchema = z.object({
  period: z.string().trim().min(1, 'El periodo es requerido').max(50),
});

export const PerformedPledgesReportRowSchema = z.object({
  creditNumber: z.string().min(1),
  borrowerDocumentNumber: z.string().min(1),
  borrowerName: z.string().min(1),
  workerDocumentNumber: z.string().nullable(),
  beneficiaryCode: z.string().nullable(),
  subsidyMark: z.string().nullable(),
  subsidyDocument: z.string().nullable(),
  discountedAmount: z.number().nonnegative(),
  appliedAmount: z.number().nonnegative(),
  paymentNumber: z.string().nullable(),
});

export type PerformedPledgesReportRow = z.infer<typeof PerformedPledgesReportRowSchema>;

export const GeneratePerformedPledgesReportResponseSchema = z.object({
  reportType: z.literal('PERFORMED'),
  period: z.string().min(1),
  reviewedCredits: z.number().int().nonnegative(),
  reportedCredits: z.number().int().nonnegative(),
  rows: z.array(PerformedPledgesReportRowSchema),
  message: z.string(),
});

export type GeneratePerformedPledgesReportResult = ClientInferResponseBody<
  Contract['subsidy']['generatePerformedPledgesReport'],
  200
>;

export const GenerateNotPerformedPledgesReportBodySchema = z.object({
  period: z.string().trim().min(1, 'El periodo es requerido').max(50),
});

export const NotPerformedPledgesReportRowSchema = z.object({
  creditNumber: z.string().min(1),
  borrowerDocumentNumber: z.string().min(1),
  borrowerName: z.string().min(1),
  workerDocumentNumber: z.string().nullable(),
  beneficiaryCode: z.string().min(1),
  beneficiaryDocumentNumber: z.string().nullable(),
  expectedDiscountedAmount: z.number().nonnegative(),
  subsidyDiscountedAmount: z.number().nonnegative(),
  subsidyObservation: z.string().min(1),
  reason: z.string().min(1),
});

export type NotPerformedPledgesReportRow = z.infer<typeof NotPerformedPledgesReportRowSchema>;

export const GenerateNotPerformedPledgesReportResponseSchema = z.object({
  reportType: z.literal('NOT_PERFORMED'),
  period: z.string().min(1),
  reviewedCredits: z.number().int().nonnegative(),
  reportedCredits: z.number().int().nonnegative(),
  rows: z.array(NotPerformedPledgesReportRowSchema),
  message: z.string(),
});

export type GenerateNotPerformedPledgesReportResult = ClientInferResponseBody<
  Contract['subsidy']['generateNotPerformedPledgesReport'],
  200
>;
