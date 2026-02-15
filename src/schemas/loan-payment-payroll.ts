import { Contract } from '@/server/api/contracts';
import { ClientInferResponseBody } from '@ts-rest/core';
import { z } from 'zod';

export const LoanPaymentPayrollRowSchema = z.object({
  loanId: z.number().int().positive(),
  creditNumber: z.string().trim().min(1).max(30),
  paymentAmount: z.number().nonnegative(),
  overpaidAmount: z.number().nonnegative(),
});

export const ProcessLoanPaymentPayrollBodySchema = z.object({
  agreementId: z.number().int().positive().nullable().optional(),
  companyDocumentNumber: z.string().trim().max(30).nullable().optional(),
  receiptTypeId: z.number().int().positive(),
  collectionDate: z.coerce.date(),
  referenceNumber: z.string().trim().min(1).max(50),
  collectionAmount: z.number().positive(),
  rows: z.array(LoanPaymentPayrollRowSchema).min(1),
}).superRefine((value, ctx) => {
  const hasAgreement = Boolean(value.agreementId);
  const hasCompanyDocument = Boolean(value.companyDocumentNumber?.trim());

  if (!hasAgreement && !hasCompanyDocument) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['agreementId'],
      message: 'Debe indicar convenio o documento de empresa',
    });
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['companyDocumentNumber'],
      message: 'Debe indicar convenio o documento de empresa',
    });
  }
});

export const ProcessLoanPaymentPayrollResponseSchema = z.object({
  agreementId: z.number().int().positive().nullable(),
  companyDocumentNumber: z.string().nullable(),
  receiptTypeId: z.number().int().positive(),
  collectionAmount: z.number().nonnegative(),
  receivedRows: z.number().int().nonnegative(),
  processedRows: z.number().int().nonnegative(),
  totalPaymentAmount: z.number().nonnegative(),
  totalOverpaidAmount: z.number().nonnegative(),
  message: z.string(),
});

export type ProcessLoanPaymentPayrollResult = ClientInferResponseBody<
  Contract['loanPaymentPayroll']['process'],
  200
>;
