import { Contract } from '@/server/api/contracts';
import { CategoryCodeSchema } from '@/schemas/category';
import {
  CreditSimulationInstallmentSchema,
  CreditSimulationSummarySchema,
} from '@/schemas/credit-simulation';
import { FINANCING_TYPE_OPTIONS } from '@/schemas/credit-product';
import { INSURANCE_RATE_TYPE_OPTIONS } from '@/schemas/insurance-company';
import { ClientInferResponseBody } from '@ts-rest/core';
import { z } from 'zod';

export const SimulateLoanRefinancingBodySchema = z.object({
  originLoanId: z.number().int().positive(),
  selectedLoanIds: z.array(z.number().int().positive()).min(1),
  includeOverdueBalance: z.boolean(),
  creditProductId: z.number().int().positive(),
  categoryCode: CategoryCodeSchema,
  installments: z.number().int().positive(),
  paymentFrequencyId: z.number().int().positive(),
  firstPaymentDate: z.coerce.date(),
  insuranceCompanyId: z.number().int().positive().nullable().optional(),
});

export const RefinancingSelectedLoanSchema = z.object({
  loanId: z.number().int().positive(),
  creditNumber: z.string(),
  status: z.string(),
  principalAmount: z.number().nonnegative(),
  currentBalance: z.number().nonnegative(),
  overdueBalance: z.number().nonnegative(),
  currentDueBalance: z.number().nonnegative(),
  openInstallments: z.number().int().nonnegative(),
  nextDueDate: z.string().nullable(),
});

export const SimulateLoanRefinancingResponseSchema = z.object({
  borrower: z.object({
    thirdPartyId: z.number().int().positive(),
    fullName: z.string(),
    documentNumber: z.string().nullable(),
  }),
  selectedLoans: z.array(RefinancingSelectedLoanSchema),
  before: z.object({
    totalCurrentBalance: z.number().nonnegative(),
    totalOverdueBalance: z.number().nonnegative(),
    totalCurrentDueBalance: z.number().nonnegative(),
    totalOpenInstallments: z.number().int().nonnegative(),
  }),
  after: z.object({
    principalToRefinance: z.number().nonnegative(),
    financingType: z.enum(FINANCING_TYPE_OPTIONS),
    financingFactor: z.number(),
    insuranceFactor: z.number(),
    insuranceRateType: z.enum(INSURANCE_RATE_TYPE_OPTIONS).nullable(),
    projectedTotalPayment: z.number().nonnegative(),
    projectedFirstInstallmentPayment: z.number().nonnegative(),
    projectedMaxInstallmentPayment: z.number().nonnegative(),
  }),
  comparison: z.object({
    estimatedCurrentInstallment: z.number().nonnegative(),
    estimatedNewInstallment: z.number().nonnegative(),
    installmentDelta: z.number(),
    debtDelta: z.number(),
  }),
  summary: CreditSimulationSummarySchema,
  installments: z.array(CreditSimulationInstallmentSchema),
  notes: z.string().nullable(),
});

export type SimulateLoanRefinancingResult = ClientInferResponseBody<
  Contract['loanRefinancing']['simulate'],
  200
>;
