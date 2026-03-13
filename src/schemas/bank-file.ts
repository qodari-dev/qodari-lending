import { Contract } from '@/server/api/contracts';
import { ClientInferResponseBody } from '@ts-rest/core';
import { z } from 'zod';

export const GenerateBankFileBodySchema = z.object({
  bankId: z.number().int().positive(),
  liquidationDate: z.coerce.date(),
});

export const BankNoveltyFileStatusSchema = z.enum(['DISBURSED', 'REJECTED']);

export const PreviewBankNoveltyRecordSchema = z.object({
  rowNumber: z.number().int().positive(),
  creditNumber: z.string().trim().min(1),
  fileStatus: BankNoveltyFileStatusSchema,
  responseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().nonnegative().nullable().optional(),
  note: z.string().trim().max(255).nullable().optional(),
});

export const PreviewBankNoveltyBodySchema = z.object({
  fileName: z.string().trim().min(1),
  records: z.array(PreviewBankNoveltyRecordSchema).min(1),
});

export const ProcessBankNoveltyRecordSchema = PreviewBankNoveltyRecordSchema.extend({
  changeFirstCollectionDate: z.boolean().optional().default(false),
  newFirstCollectionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
});

export const ProcessBankNoveltyBodySchema = z.object({
  fileName: z.string().trim().min(1),
  records: z.array(ProcessBankNoveltyRecordSchema).min(1),
});

export const GenerateBankFileResponseSchema = z.object({
  bankId: z.number().int().positive(),
  bankName: z.string().min(1),
  bankCode: z.string().nullable(),
  liquidationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reviewedCredits: z.number().int().nonnegative(),
  totalAmount: z.number().nonnegative(),
  fileName: z.string().min(1),
  fileContent: z.string(),
  message: z.string(),
});

export const BankNoveltyPreviewRowSchema = z.object({
  rowNumber: z.number().int().positive(),
  creditNumber: z.string(),
  loanId: z.number().int().positive().nullable(),
  thirdPartyName: z.string().nullable(),
  amount: z.number().nonnegative().nullable(),
  fileStatus: BankNoveltyFileStatusSchema,
  responseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().nullable(),
  currentLoanStatus: z.string().nullable(),
  currentDisbursementStatus: z.string().nullable(),
  currentFirstCollectionDate: z.string().nullable(),
  matched: z.boolean(),
  canProcess: z.boolean(),
  requiresDateAdjustment: z.boolean(),
  validationMessage: z.string().nullable(),
});

export const BankNoveltyPreviewSummarySchema = z.object({
  totalRecords: z.number().int().nonnegative(),
  totalAmount: z.number().nonnegative(),
  matchedRecords: z.number().int().nonnegative(),
  invalidRecords: z.number().int().nonnegative(),
  disbursedRecords: z.number().int().nonnegative(),
  rejectedRecords: z.number().int().nonnegative(),
});

export const PreviewBankNoveltyResponseSchema = z.object({
  fileName: z.string().min(1),
  summary: BankNoveltyPreviewSummarySchema,
  rows: z.array(BankNoveltyPreviewRowSchema),
  message: z.string(),
});

export const ProcessBankNoveltyRowResultSchema = BankNoveltyPreviewRowSchema.extend({
  changedFirstCollectionDate: z.boolean(),
  newFirstCollectionDate: z.string().nullable(),
  processed: z.boolean(),
  processedAction: z.enum(['DISBURSED', 'REJECTED', 'DISBURSED_WITH_DATE_CHANGE']).nullable(),
});

export const ProcessBankNoveltyResponseSchema = z.object({
  fileName: z.string().min(1),
  summary: BankNoveltyPreviewSummarySchema.extend({
    processedRecords: z.number().int().nonnegative(),
    disbursedProcessed: z.number().int().nonnegative(),
    rejectedProcessed: z.number().int().nonnegative(),
    dateAdjustmentRecords: z.number().int().nonnegative(),
  }),
  rows: z.array(ProcessBankNoveltyRowResultSchema),
  message: z.string(),
});

export type GenerateBankFileResult = ClientInferResponseBody<
  Contract['bankFile']['generate'],
  200
>;
export type PreviewBankNoveltyResult = ClientInferResponseBody<
  Contract['bankFile']['previewNoveltyFile'],
  200
>;
export type ProcessBankNoveltyResult = ClientInferResponseBody<
  Contract['bankFile']['processNoveltyFile'],
  200
>;
