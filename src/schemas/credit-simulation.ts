import { Contract } from '@/server/api/contracts';
import { CategoryCodeSchema } from '@/schemas/category';
import { ClientInferResponseBody } from '@ts-rest/core';
import { z } from 'zod';
import { FINANCING_TYPE_OPTIONS } from './credit-product';

export const CalculateCreditSimulationBodySchema = z.object({
  creditProductId: z.number().int().positive(),
  categoryCode: CategoryCodeSchema,
  installments: z.number().int().positive(),
  creditAmount: z.number().positive(),
  firstPaymentDate: z.coerce.date(),
  income: z.number().nonnegative(),
  expenses: z.number().nonnegative(),
  paymentFrequencyId: z.number().int().positive(),
  insuranceCompanyId: z.number().int().positive().nullable().optional(),
});

export const CreditSimulationInstallmentSchema = z.object({
  installmentNumber: z.number().int(),
  dueDate: z.string(),
  days: z.number(),
  openingBalance: z.number(),
  principal: z.number(),
  interest: z.number(),
  insurance: z.number(),
  payment: z.number(),
  closingBalance: z.number(),
});

export const CreditSimulationSummarySchema = z.object({
  principal: z.number(),
  annualRatePercent: z.number(),
  insuranceRatePercent: z.number(),
  installments: z.number(),
  daysInterval: z.number(),
  totalPrincipal: z.number(),
  totalInterest: z.number(),
  totalInsurance: z.number(),
  totalPayment: z.number(),
  firstInstallmentPayment: z.number(),
  maxInstallmentPayment: z.number(),
  minInstallmentPayment: z.number(),
});

export const CreditSimulationCapacitySchema = z.object({
  paymentCapacity: z.number(),
  maxInstallmentPayment: z.number(),
  isWithinCapacity: z.boolean(),
  capacityGap: z.number(),
  warningMessage: z.string().nullable(),
});

export const CalculateCreditSimulationResponseSchema = z.object({
  financingType: z.enum(FINANCING_TYPE_OPTIONS),
  financingFactor: z.number(),
  insuranceFactor: z.number(),
  capacity: CreditSimulationCapacitySchema,
  summary: CreditSimulationSummarySchema,
  installments: z.array(CreditSimulationInstallmentSchema),
});

export type CreditSimulationResult = ClientInferResponseBody<
  Contract['creditSimulation']['calculate'],
  200
>;

export type CalculateCreditSimulationBody = z.infer<typeof CalculateCreditSimulationBodySchema>;
