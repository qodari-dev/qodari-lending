import { Contract } from '@/server/api/contracts';
import { ClientInferResponseBody } from '@ts-rest/core';
import { z } from 'zod';

export const GeneratePledgePaymentVoucherBodySchema = z.object({
  period: z.string().trim().min(1, 'El periodo es requerido').max(50),
  movementGenerationDate: z.coerce.date(),
});

export const GeneratePledgePaymentVoucherResponseSchema = z.object({
  period: z.string().min(1),
  movementGenerationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  processedCredits: z.number().int().nonnegative(),
  processedPayments: z.number().int().nonnegative(),
  totalDiscountedAmount: z.number().nonnegative(),
  totalAppliedAmount: z.number().nonnegative(),
  message: z.string(),
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
  discountedAmount: z.number().nonnegative(),
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
  expectedDiscountedAmount: z.number().nonnegative(),
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
