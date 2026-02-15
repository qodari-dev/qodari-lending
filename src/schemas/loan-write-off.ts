import { Contract } from '@/server/api/contracts';
import { ClientInferResponseBody } from '@ts-rest/core';
import { z } from 'zod';

export const GenerateLoanWriteOffProposalBodySchema = z.object({
  cutoffDate: z.coerce.date(),
});

export const LoanWriteOffProposalRowSchema = z.object({
  creditNumber: z.string().min(1),
  thirdPartyName: z.string().min(1),
  daysPastDue: z.number().int().nonnegative(),
  outstandingBalance: z.number().nonnegative(),
  provisionAmount: z.number().nonnegative(),
  recommendedWriteOffAmount: z.number().nonnegative(),
});

export type LoanWriteOffProposalRow = z.infer<typeof LoanWriteOffProposalRowSchema>;

export const GenerateLoanWriteOffProposalResponseSchema = z.object({
  proposalId: z.string().min(1),
  cutoffDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reviewedCredits: z.number().int().nonnegative(),
  eligibleCredits: z.number().int().nonnegative(),
  totalOutstandingBalance: z.number().nonnegative(),
  totalRecommendedWriteOff: z.number().nonnegative(),
  message: z.string(),
});

export type GenerateLoanWriteOffProposalResult = ClientInferResponseBody<
  Contract['loanWriteOff']['generateProposal'],
  200
>;

export const ReviewLoanWriteOffProposalBodySchema = z.object({
  proposalId: z.string().trim().min(1),
});

export const ReviewLoanWriteOffProposalResponseSchema = z.object({
  proposalId: z.string().min(1),
  reviewedCredits: z.number().int().nonnegative(),
  eligibleCredits: z.number().int().nonnegative(),
  totalOutstandingBalance: z.number().nonnegative(),
  totalRecommendedWriteOff: z.number().nonnegative(),
  rows: z.array(LoanWriteOffProposalRowSchema),
  message: z.string(),
});

export type ReviewLoanWriteOffProposalResult = ClientInferResponseBody<
  Contract['loanWriteOff']['reviewProposal'],
  200
>;

export const ExecuteLoanWriteOffBodySchema = z.object({
  proposalId: z.string().trim().min(1),
  selectedCreditNumbers: z
    .array(z.string().trim().min(1))
    .min(1, 'Debe seleccionar al menos un credito para ejecutar castigo')
    .superRefine((values, ctx) => {
      const unique = new Set(values.map((value) => value.toUpperCase()));
      if (unique.size !== values.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['selectedCreditNumbers'],
          message: 'No se permiten creditos repetidos',
        });
      }
    }),
});

export const ExecuteLoanWriteOffResponseSchema = z.object({
  proposalId: z.string().min(1),
  executedCredits: z.number().int().nonnegative(),
  totalWrittenOffAmount: z.number().nonnegative(),
  movementDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  message: z.string(),
});

export type ExecuteLoanWriteOffResult = ClientInferResponseBody<
  Contract['loanWriteOff']['execute'],
  200
>;
