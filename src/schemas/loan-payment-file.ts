import { Contract } from '@/server/api/contracts';
import { ClientInferResponseBody } from '@ts-rest/core';
import { z } from 'zod';

export const LoanPaymentFileRecordSchema = z.object({
  rowNumber: z.number().int().positive(),
  creditNumber: z.string().trim().min(1).max(30),
  documentNumber: z.string().trim().min(1).max(30),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  paymentAmount: z.number().positive(),
});

export const ProcessLoanPaymentFileBodySchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  records: z.array(LoanPaymentFileRecordSchema).min(1),
});

export const ProcessLoanPaymentFileResponseSchema = z.object({
  fileName: z.string(),
  receivedRecords: z.number().int().nonnegative(),
  totalPaymentAmount: z.number().nonnegative(),
  processedRecords: z.number().int().nonnegative(),
  failedRecords: z.number().int().nonnegative(),
  message: z.string(),
});

export type ProcessLoanPaymentFileResult = ClientInferResponseBody<
  Contract['loanPaymentFile']['process'],
  200
>;
