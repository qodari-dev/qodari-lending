import { Contract } from '@/server/api/contracts';
import {
  BooleanOperatorsSchema,
  createIncludeSchema,
  createListQuerySchema,
  DateOperatorsSchema,
  NumberOperatorsSchema,
  StringOperatorsSchema,
} from '@/server/utils/query/schemas';
import { rangesOverlap } from '@/utils/range-overlap';
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
  'distribution',
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

export const INSURANCE_RATE_TYPE_OPTIONS = ['PERCENTAGE', 'FIXED_AMOUNT'] as const;
export type InsuranceRateType = (typeof INSURANCE_RATE_TYPE_OPTIONS)[number];

export const INSURANCE_RATE_TYPE_LABELS: Record<InsuranceRateType, string> = {
  PERCENTAGE: 'Porcentaje',
  FIXED_AMOUNT: 'Valor fijo',
};

// ============================================
// MUTATIONS
// ============================================

export const InsuranceRateRangeInputSchema = z.object({
  rangeMetric: z.enum(['INSTALLMENT_COUNT', 'CREDIT_AMOUNT']),
  valueFrom: z.number().int().min(0),
  valueTo: z.number().int().min(0),
  rateType: z.enum(INSURANCE_RATE_TYPE_OPTIONS),
  rateValue: z.string().nullable().optional(),
  fixedAmount: z.string().nullable().optional(),
}).superRefine((value, ctx) => {
  const rateValue = value.rateValue?.trim() ?? '';
  const fixedAmount = value.fixedAmount?.trim() ?? '';

  if (value.rateType === 'PERCENTAGE') {
    if (!rateValue) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Tasa es requerida',
        path: ['rateValue'],
      });
    }

    if (fixedAmount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'No debe enviar valor fijo cuando el tipo es porcentaje',
        path: ['fixedAmount'],
      });
    }
  }

  if (value.rateType === 'FIXED_AMOUNT') {
    if (!fixedAmount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Valor fijo es requerido',
        path: ['fixedAmount'],
      });
    }

    if (rateValue) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'No debe enviar tasa cuando el tipo es valor fijo',
        path: ['rateValue'],
      });
    }
  }
});

export type InsuranceRateRangeInput = z.infer<typeof InsuranceRateRangeInputSchema>;

const InsuranceCompanyBaseSchema = z.object({
  identificationTypeId: z.number().int().positive(),
  documentNumber: z.string().min(1).max(20),
  verificationDigit: z.string().max(1).nullable().optional(),
  businessName: z.string().min(1).max(255),
  cityId: z.number().int().positive(),
  address: z.string().min(1).max(255),
  phone: z.string().max(20).nullable().optional(),
  mobileNumber: z.string().max(20).nullable().optional(),
  email: z.email().max(60).nullable().optional(),
  minimumValue: z.string().nullable().optional(),
  distributionId: z.number().int().positive(),
  note: z.string().max(70).nullable().optional(),
  isActive: z.boolean(),
  insuranceRateRanges: InsuranceRateRangeInputSchema.array().min(
    1,
    'Debe configurar al menos un rango de tasa'
  ),
});

const addInsuranceRateRangesValidation = <T extends z.ZodTypeAny>(schema: T) =>
  schema.superRefine((value, ctx) => {
    const data = value as {
      insuranceRateRanges?: Array<{
        rangeMetric: 'INSTALLMENT_COUNT' | 'CREDIT_AMOUNT';
        valueFrom: number;
        valueTo: number;
      }>;
    };

    const ranges = data.insuranceRateRanges;
    if (ranges === undefined) return;

    if (ranges.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debe configurar al menos un rango de tasa',
        path: ['insuranceRateRanges'],
      });
      return;
    }

    for (let i = 0; i < ranges.length; i += 1) {
      for (let j = i + 1; j < ranges.length; j += 1) {
        const a = ranges[i];
        const b = ranges[j];
        if (a.rangeMetric !== b.rangeMetric) continue;
        if (rangesOverlap(a.valueFrom, a.valueTo, b.valueFrom, b.valueTo)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'No puede solapar rangos para la misma métrica',
            path: ['insuranceRateRanges'],
          });
          return;
        }
      }
    }
  });

export const CreateInsuranceCompanyBodySchema = addInsuranceRateRangesValidation(
  InsuranceCompanyBaseSchema
);

export const UpdateInsuranceCompanyBodySchema = addInsuranceRateRangesValidation(
  InsuranceCompanyBaseSchema.partial()
);

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
