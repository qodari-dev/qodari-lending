import { Contract } from '@/server/api/contracts';
import {
  BooleanOperatorsSchema,
  createIncludeSchema,
  createListQuerySchema,
  DateOperatorsSchema,
  NumberOperatorsSchema,
  StringOperatorsSchema,
} from '@/server/utils/query/schemas';
import { ClientInferResponseBody } from '@ts-rest/core';
import { z } from 'zod';

// ============================================
// WHERE
// ============================================

const InsuranceCompanyWhereFieldsSchema = z
  .object({
    id: z.union([z.number(), NumberOperatorsSchema]).optional(),
    businessName: z.union([z.string(), StringOperatorsSchema]).optional(),
    documentNumber: z.union([z.string(), StringOperatorsSchema]).optional(),
    isActive: z.union([z.boolean(), BooleanOperatorsSchema]).optional(),
    createdAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
    updatedAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
  })
  .strict();

// ============================================
// SORT
// ============================================

const INSURANCE_COMPANY_SORT_FIELDS = [
  'id',
  'businessName',
  'documentNumber',
  'isActive',
  'createdAt',
  'updatedAt',
] as const;

// ============================================
// INCLUDE
// ============================================

const INSURANCE_COMPANY_INCLUDE_OPTIONS = [
  'insuranceRateRanges',
  'identificationType',
  'city',
  'totalChargeDistribution',
  'monthlyDistribution',
] as const;
const InsuranceCompanyIncludeSchema = createIncludeSchema(INSURANCE_COMPANY_INCLUDE_OPTIONS);

// ============================================
// QUERY SCHEMAS
// ============================================

export const ListInsuranceCompaniesQuerySchema = createListQuerySchema({
  whereFields: InsuranceCompanyWhereFieldsSchema,
  sortFields: INSURANCE_COMPANY_SORT_FIELDS,
  includeFields: INSURANCE_COMPANY_INCLUDE_OPTIONS,
  sortMax: 3,
});

export type ListInsuranceCompaniesQuery = z.infer<typeof ListInsuranceCompaniesQuerySchema>;

export const GetInsuranceCompanyQuerySchema = z.object({
  include: InsuranceCompanyIncludeSchema,
});

// ============================================
// LABELS
// ============================================

export const INSURANCE_RATE_RANGE_METRIC_LABELS: Record<string, string> = {
  INSTALLMENT_COUNT: 'Cuotas',
  CREDIT_AMOUNT: 'Monto',
};

// ============================================
// MUTATIONS
// ============================================

export const InsuranceRateRangeInputSchema = z.object({
  rangeMetric: z.enum(['INSTALLMENT_COUNT', 'CREDIT_AMOUNT']),
  valueFrom: z.number().int().min(0),
  valueTo: z.number().int().min(0),
  rateValue: z.string().min(1, 'Tasa es requerida'),
});

export type InsuranceRateRangeInput = z.infer<typeof InsuranceRateRangeInputSchema>;

export const CreateInsuranceCompanyBodySchema = z.object({
  identificationTypeId: z.number().int().positive(),
  documentNumber: z.string().min(1).max(20),
  verificationDigit: z.string().max(1).nullable().optional(),
  businessName: z.string().min(1).max(255),
  cityId: z.number().int().positive(),
  address: z.string().min(1).max(255),
  phone: z.string().max(20).nullable().optional(),
  mobileNumber: z.string().max(20).nullable().optional(),
  email: z.email().max(60).nullable().optional(),
  factor: z.string().min(1, 'Factor es requerido'),
  minimumValue: z.string().nullable().optional(),
  totalChargeDistributionId: z.number().int().positive().nullable().optional(),
  monthlyDistributionId: z.number().int().positive(),
  note: z.string().max(70).nullable().optional(),
  isActive: z.boolean(),
  insuranceRateRanges: InsuranceRateRangeInputSchema.array().optional(),
});

export const UpdateInsuranceCompanyBodySchema = CreateInsuranceCompanyBodySchema.partial();

// ============================================
// TYPES
// ============================================

export type InsuranceCompanyPaginated = ClientInferResponseBody<
  Contract['insuranceCompany']['list'],
  200
>;

export type InsuranceCompany = InsuranceCompanyPaginated['data'][number];

export type InsuranceCompanySortField = (typeof INSURANCE_COMPANY_SORT_FIELDS)[number];
export type InsuranceCompanyInclude = (typeof INSURANCE_COMPANY_INCLUDE_OPTIONS)[number];
