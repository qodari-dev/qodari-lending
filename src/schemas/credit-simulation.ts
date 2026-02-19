import { Contract } from '@/server/api/contracts';
import { CategoryCodeSchema } from '@/schemas/category';
import { ClientInferResponseBody } from '@ts-rest/core';
import { z } from 'zod';
import { FINANCING_TYPE_OPTIONS } from './credit-product';
import { INSURANCE_RATE_TYPE_OPTIONS } from './insurance-company';

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

export const WorkerStudyBodySchema = z.object({
  identificationTypeId: z.number().int().positive(),
  documentNumber: z.string().trim().min(3).max(30),
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
  insuranceRateType: z.enum(INSURANCE_RATE_TYPE_OPTIONS).nullable(),
  capacity: CreditSimulationCapacitySchema,
  summary: CreditSimulationSummarySchema,
  installments: z.array(CreditSimulationInstallmentSchema),
});

export const WorkerStudyContributionSchema = z.object({
  period: z.string(),
  companyName: z.string(),
  contributionBaseSalary: z.number(),
  contributionValue: z.number(),
});

export const WorkerStudyCompanyHistorySchema = z.object({
  companyName: z.string(),
  fromDate: z.string(),
  toDate: z.string().nullable(),
  contributionMonths: z.number().int().nonnegative(),
});

export const WORKER_STUDY_LOAN_APPLICATION_STATUS_OPTIONS = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELED',
] as const;

export const WORKER_STUDY_CREDIT_STATUS_OPTIONS = [
  'ACTIVE',
  'GENERATED',
  'INACTIVE',
  'ACCOUNTED',
  'VOID',
  'RELIQUIDATED',
  'FINISHED',
  'PAID',
] as const;

export const WORKER_STUDY_CREDIT_DISBURSEMENT_STATUS_OPTIONS = [
  'LIQUIDATED',
  'SENT_TO_ACCOUNTING',
  'SENT_TO_BANK',
  'DISBURSED',
] as const;

export const WORKER_STUDY_CREDIT_PAYMENT_BEHAVIOR_OPTIONS = ['PAID', 'CURRENT', 'OVERDUE'] as const;

export const WorkerStudyLoanApplicationSchema = z.object({
  id: z.number().int().positive(),
  creditNumber: z.string(),
  applicationDate: z.string(),
  status: z.enum(WORKER_STUDY_LOAN_APPLICATION_STATUS_OPTIONS),
  requestedAmount: z.number().nonnegative(),
  approvedAmount: z.number().nonnegative().nullable(),
  creditProductName: z.string().nullable(),
});

export const WorkerStudyCreditSchema = z.object({
  id: z.number().int().positive(),
  creditNumber: z.string(),
  loanApplicationId: z.number().int().positive(),
  recordDate: z.string(),
  creditStartDate: z.string(),
  status: z.enum(WORKER_STUDY_CREDIT_STATUS_OPTIONS),
  disbursementStatus: z.enum(WORKER_STUDY_CREDIT_DISBURSEMENT_STATUS_OPTIONS),
  principalAmount: z.number().nonnegative(),
  currentBalance: z.number().nonnegative(),
  overdueBalance: z.number().nonnegative(),
  totalPaid: z.number().nonnegative(),
  openInstallments: z.number().int().nonnegative(),
  nextDueDate: z.string().nullable(),
  paymentBehavior: z.enum(WORKER_STUDY_CREDIT_PAYMENT_BEHAVIOR_OPTIONS),
  creditProductName: z.string().nullable(),
});

export const WorkerStudyResponseSchema = z.object({
  worker: z.object({
    fullName: z.string(),
    identificationTypeId: z.number().int().positive(),
    identificationTypeCode: z.string(),
    identificationTypeName: z.string(),
    documentNumber: z.string(),
  }),
  salary: z.object({
    currentSalary: z.number().nonnegative(),
    averageSalaryLastSixMonths: z.number().nonnegative(),
    highestSalaryLastSixMonths: z.number().nonnegative(),
  }),
  trajectory: z.object({
    totalContributionMonths: z.number().int().nonnegative(),
    currentCompanyName: z.string().nullable(),
    previousCompanyName: z.string().nullable(),
  }),
  contributions: z.array(WorkerStudyContributionSchema),
  companyHistory: z.array(WorkerStudyCompanyHistorySchema),
  loanApplications: z.array(WorkerStudyLoanApplicationSchema),
  credits: z.array(WorkerStudyCreditSchema),
  notes: z.string().nullable(),
  generatedAt: z.string(),
});

export type CreditSimulationResult = ClientInferResponseBody<
  Contract['creditSimulation']['calculate'],
  200
>;
export type WorkerStudyResult = ClientInferResponseBody<
  Contract['creditSimulation']['workerStudy'],
  200
>;

export type CalculateCreditSimulationBody = z.infer<typeof CalculateCreditSimulationBodySchema>;
export type WorkerStudyBody = z.infer<typeof WorkerStudyBodySchema>;
