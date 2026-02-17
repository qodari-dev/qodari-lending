import { Contract } from '@/server/api/contracts';
import { CategoryCodeSchema, categoryCodeLabels } from '@/schemas/category';
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
// ENUMS
// ============================================

export const FINANCING_TYPE_OPTIONS = ['FIXED_AMOUNT', 'ON_BALANCE'] as const;
export type FinancingType = (typeof FINANCING_TYPE_OPTIONS)[number];

export const INSURANCE_RANGE_METRIC_OPTIONS = ['INSTALLMENT_COUNT', 'CREDIT_AMOUNT'] as const;
export type InsuranceRangeMetric = (typeof INSURANCE_RANGE_METRIC_OPTIONS)[number];

export const RISK_EVALUATION_MODE_OPTIONS = ['NONE', 'VALIDATE_ONLY', 'REQUIRED'] as const;
export type RiskEvaluationMode = (typeof RISK_EVALUATION_MODE_OPTIONS)[number];

export const LATE_INTEREST_AGE_BASIS_OPTIONS = [
  'OLDEST_OVERDUE_INSTALLMENT',
  'EACH_INSTALLMENT',
] as const;
export type LateInterestAgeBasis = (typeof LATE_INTEREST_AGE_BASIS_OPTIONS)[number];

export const INTEREST_RATE_TYPE_OPTIONS = [
  'EFFECTIVE_ANNUAL',
  'EFFECTIVE_MONTHLY',
  'NOMINAL_MONTHLY',
  'NOMINAL_ANNUAL',
  'MONTHLY_FLAT',
] as const;
export type InterestRateType = (typeof INTEREST_RATE_TYPE_OPTIONS)[number];

export const INTEREST_ACCRUAL_METHOD_OPTIONS = ['DAILY', 'MONTHLY'] as const;
export type InterestAccrualMethod = (typeof INTEREST_ACCRUAL_METHOD_OPTIONS)[number];

export const DAY_COUNT_CONVENTION_OPTIONS = [
  '30_360',
  'ACTUAL_360',
  'ACTUAL_365',
  'ACTUAL_ACTUAL',
] as const;
export type DayCountConvention = (typeof DAY_COUNT_CONVENTION_OPTIONS)[number];

export const INSURANCE_ACCRUAL_METHOD_OPTIONS = [
  'ONE_TIME',
  'PER_INSTALLMENT',
] as const;
export type InsuranceAccrualMethod = (typeof INSURANCE_ACCRUAL_METHOD_OPTIONS)[number];

export const financingTypeLabels: Record<FinancingType, string> = {
  FIXED_AMOUNT: 'Valor fijo',
  ON_BALANCE: 'Sobre saldo',
};

export const insuranceRangeMetricLabels: Record<InsuranceRangeMetric, string> = {
  INSTALLMENT_COUNT: 'Cuotas',
  CREDIT_AMOUNT: 'Monto credito',
};

export const riskEvaluationModeLabels: Record<RiskEvaluationMode, string> = {
  NONE: 'No aplica',
  VALIDATE_ONLY: 'Solo validar',
  REQUIRED: 'Obligatorio',
};

export const lateInterestAgeBasisLabels: Record<LateInterestAgeBasis, string> = {
  OLDEST_OVERDUE_INSTALLMENT: 'Cuota vencida mas antigua',
  EACH_INSTALLMENT: 'Cada cuota vencida',
};

export const interestRateTypeLabels: Record<InterestRateType, string> = {
  EFFECTIVE_ANNUAL: 'Efectiva anual',
  EFFECTIVE_MONTHLY: 'Efectiva mensual',
  NOMINAL_MONTHLY: 'Nominal mensual',
  NOMINAL_ANNUAL: 'Nominal anual',
  MONTHLY_FLAT: 'Mensual plana',
};

export const interestAccrualMethodLabels: Record<InterestAccrualMethod, string> = {
  DAILY: 'Diaria',
  MONTHLY: 'Mensual',
};

export const dayCountConventionLabels: Record<DayCountConvention, string> = {
  '30_360': '30/360',
  ACTUAL_360: 'Actual/360',
  ACTUAL_365: 'Actual/365',
  ACTUAL_ACTUAL: 'Actual/Actual',
};

export const insuranceAccrualMethodLabels: Record<InsuranceAccrualMethod, string> = {
  ONE_TIME: 'Una vez',
  PER_INSTALLMENT: 'Por cuota',
};

export { categoryCodeLabels };

// ============================================
// WHERE
// ============================================

const CreditProductWhereFieldsSchema = z
  .object({
    id: z.union([z.number(), NumberOperatorsSchema]).optional(),
    name: z.union([z.string(), StringOperatorsSchema]).optional(),
    creditFundId: z.union([z.number(), NumberOperatorsSchema]).optional(),
    financingType: z.union([z.enum(FINANCING_TYPE_OPTIONS), StringOperatorsSchema]).optional(),
    paysInsurance: z.union([z.boolean(), BooleanOperatorsSchema]).optional(),
    reportsToCreditBureau: z.union([z.boolean(), BooleanOperatorsSchema]).optional(),
    isActive: z.union([z.boolean(), BooleanOperatorsSchema]).optional(),
    createdAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
    updatedAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
  })
  .strict();

// ============================================
// SORT
// ============================================

const CREDIT_PRODUCT_SORT_FIELDS = [
  'id',
  'name',
  'creditFundId',
  'financingType',
  'paysInsurance',
  'reportsToCreditBureau',
  'isActive',
  'createdAt',
  'updatedAt',
] as const;

// ============================================
// INCLUDE
// ============================================

const CREDIT_PRODUCT_INCLUDE_OPTIONS = [
  'creditFund',
  'paymentAllocationPolicy',
  'capitalDistribution',
  'interestDistribution',
  'lateInterestDistribution',
  'creditProductRefinancePolicy',
  'creditProductChargeOffPolicy',
  'creditProductCategories',
  'creditProductLateInterestRules',
  'creditProductRequiredDocuments',
  'creditProductAccounts',
  'creditProductBillingConcepts',
] as const;
const CreditProductIncludeSchema = createIncludeSchema(CREDIT_PRODUCT_INCLUDE_OPTIONS);

// ============================================
// QUERY SCHEMAS
// ============================================

export const ListCreditProductsQuerySchema = createListQuerySchema({
  whereFields: CreditProductWhereFieldsSchema,
  sortFields: CREDIT_PRODUCT_SORT_FIELDS,
  includeFields: CREDIT_PRODUCT_INCLUDE_OPTIONS,
  sortMax: 3,
});

export type ListCreditProductsQuery = z.infer<typeof ListCreditProductsQuerySchema>;

export const GetCreditProductQuerySchema = z.object({
  include: CreditProductIncludeSchema,
});

// ============================================
// MUTATIONS
// ============================================

export const CreditProductCategoryInputSchema = z.object({
  categoryCode: CategoryCodeSchema,
  installmentsFrom: z.number().int().positive(),
  installmentsTo: z.number().int().positive(),
  financingFactor: z.string().min(1, 'Factor financiacion es requerido'),
});

export type CreditProductCategoryInput = z.infer<typeof CreditProductCategoryInputSchema>;

export const CreditProductLateInterestRuleInputSchema = z.object({
  categoryCode: CategoryCodeSchema,
  daysFrom: z.number().int().min(0),
  daysTo: z.number().int().min(0).nullable().optional(),
  lateFactor: z.string().min(1, 'Factor mora es requerido'),
  isActive: z.boolean(),
});

export type CreditProductLateInterestRuleInput = z.infer<
  typeof CreditProductLateInterestRuleInputSchema
>;

export const CreditProductRequiredDocumentInputSchema = z.object({
  documentTypeId: z.number().int().positive(),
  isRequired: z.boolean(),
});

export type CreditProductRequiredDocumentInput = z.infer<
  typeof CreditProductRequiredDocumentInputSchema
>;

export const CreditProductAccountInputSchema = z.object({
  capitalGlAccountId: z.number().int().positive(),
  interestGlAccountId: z.number().int().positive(),
  lateInterestGlAccountId: z.number().int().positive(),
});

export type CreditProductAccountInput = z.infer<typeof CreditProductAccountInputSchema>;

export const CreditProductBillingConceptInputSchema = z.object({
  billingConceptId: z.number().int().positive(),
  isEnabled: z.boolean(),
  overrideFrequency: z
    .enum(['ONE_TIME', 'MONTHLY', 'PER_INSTALLMENT'])
    .nullable()
    .optional(),
  overrideFinancingMode: z
    .enum(['DISCOUNT_FROM_DISBURSEMENT', 'FINANCED_IN_LOAN', 'BILLED_SEPARATELY'])
    .nullable()
    .optional(),
  overrideGlAccountId: z.number().int().positive().nullable().optional(),
  overrideRuleId: z.number().int().positive().nullable().optional(),
});

export type CreditProductBillingConceptInput = z.infer<
  typeof CreditProductBillingConceptInputSchema
>;

export const CreditProductRefinancePolicyInputSchema = z.object({
  allowRefinance: z.boolean(),
  allowConsolidation: z.boolean(),
  maxLoansToConsolidate: z.number().int().min(1),
  minLoanAgeDays: z.number().int().min(0),
  maxDaysPastDue: z.number().int().min(0),
  minPaidInstallments: z.number().int().min(0),
  maxRefinanceCount: z.number().int().min(0),
  capitalizeArrears: z.boolean(),
  requireApproval: z.boolean(),
  isActive: z.boolean(),
});

export type CreditProductRefinancePolicyInput = z.infer<
  typeof CreditProductRefinancePolicyInputSchema
>;

export const CreditProductChargeOffPolicyInputSchema = z.object({
  allowChargeOff: z.boolean(),
  minDaysPastDue: z.number().int().min(0),
});

export type CreditProductChargeOffPolicyInput = z.infer<
  typeof CreditProductChargeOffPolicyInputSchema
>;

const CreditProductBaseSchema = z.object({
  name: z.string().min(1).max(100),
  creditFundId: z.number().int().positive(),
  paymentAllocationPolicyId: z.number().int().positive(),
  xmlModelId: z.number().int().positive().nullable().optional(),
  financingType: z.enum(FINANCING_TYPE_OPTIONS),
  paysInsurance: z.boolean(),
  insuranceRangeMetric: z.enum(INSURANCE_RANGE_METRIC_OPTIONS),
  capitalDistributionId: z.number().int().positive(),
  interestDistributionId: z.number().int().positive(),
  lateInterestDistributionId: z.number().int().positive(),
  reportsToCreditBureau: z.boolean(),
  maxInstallments: z.number().int().positive().nullable().optional(),
  riskEvaluationMode: z.enum(RISK_EVALUATION_MODE_OPTIONS),
  riskMinScore: z.string().nullable().optional(),
  ageBasis: z.enum(LATE_INTEREST_AGE_BASIS_OPTIONS),
  interestRateType: z.enum(INTEREST_RATE_TYPE_OPTIONS),
  interestAccrualMethod: z.enum(INTEREST_ACCRUAL_METHOD_OPTIONS),
  interestDayCountConvention: z.enum(DAY_COUNT_CONVENTION_OPTIONS),
  lateInterestRateType: z.enum(INTEREST_RATE_TYPE_OPTIONS),
  lateInterestAccrualMethod: z.enum(INTEREST_ACCRUAL_METHOD_OPTIONS),
  lateInterestDayCountConvention: z.enum(DAY_COUNT_CONVENTION_OPTIONS),
  insuranceAccrualMethod: z.enum(INSURANCE_ACCRUAL_METHOD_OPTIONS),
  isActive: z.boolean(),
  creditProductRefinancePolicy: CreditProductRefinancePolicyInputSchema.nullable().optional(),
  creditProductChargeOffPolicy: CreditProductChargeOffPolicyInputSchema.nullable().optional(),
  creditProductCategories: CreditProductCategoryInputSchema.array().optional(),
  creditProductLateInterestRules: CreditProductLateInterestRuleInputSchema.array().optional(),
  creditProductRequiredDocuments: CreditProductRequiredDocumentInputSchema.array().optional(),
  creditProductAccounts: CreditProductAccountInputSchema.array().optional(),
  creditProductBillingConcepts: CreditProductBillingConceptInputSchema.array().optional(),
});

const addCreditProductValidation = <T extends z.ZodTypeAny>(schema: T) =>
  schema.superRefine((value, ctx) => {
    const data = value as {
      creditProductRefinancePolicy?: {
        allowRefinance: boolean;
        allowConsolidation: boolean;
        maxLoansToConsolidate: number;
        maxRefinanceCount: number;
        isActive: boolean;
      } | null;
      creditProductChargeOffPolicy?: {
        allowChargeOff: boolean;
        minDaysPastDue: number;
      } | null;
      creditProductCategories?: {
        categoryCode: string;
        installmentsFrom: number;
        installmentsTo: number;
      }[];
      creditProductLateInterestRules?: {
        categoryCode: string;
        daysFrom: number;
        daysTo?: number | null;
      }[];
      creditProductRequiredDocuments?: {
        documentTypeId: number;
      }[];
      creditProductAccounts?: unknown[];
      creditProductBillingConcepts?: {
        billingConceptId: number;
      }[];
    };

    const categories = data.creditProductCategories ?? [];
    for (const category of categories) {
      if (category.installmentsFrom > category.installmentsTo) {
        ctx.addIssue({
          code: 'custom',
          message: 'Cuota desde debe ser menor o igual a cuota hasta',
          path: ['creditProductCategories'],
        });
        break;
      }
    }

    for (let i = 0; i < categories.length; i += 1) {
      for (let j = i + 1; j < categories.length; j += 1) {
        const a = categories[i];
        const b = categories[j];
        if (a.categoryCode !== b.categoryCode) continue;

        const overlaps = a.installmentsFrom <= b.installmentsTo && b.installmentsFrom <= a.installmentsTo;
        if (overlaps) {
          ctx.addIssue({
            code: 'custom',
            message: 'No puede haber rangos superpuestos para la misma categoria',
            path: ['creditProductCategories'],
          });
          i = categories.length;
          break;
        }
      }
    }

    const lateInterestRules = data.creditProductLateInterestRules ?? [];
    for (const rule of lateInterestRules) {
      if (rule.daysTo != null && rule.daysFrom > rule.daysTo) {
        ctx.addIssue({
          code: 'custom',
          message: 'Dias desde debe ser menor o igual a dias hasta',
          path: ['creditProductLateInterestRules'],
        });
        break;
      }
    }

    for (let i = 0; i < lateInterestRules.length; i += 1) {
      for (let j = i + 1; j < lateInterestRules.length; j += 1) {
        const a = lateInterestRules[i];
        const b = lateInterestRules[j];

        if (a.categoryCode !== b.categoryCode) continue;

        const aTo = a.daysTo ?? Number.POSITIVE_INFINITY;
        const bTo = b.daysTo ?? Number.POSITIVE_INFINITY;
        const overlaps = a.daysFrom <= bTo && b.daysFrom <= aTo;
        if (overlaps) {
          ctx.addIssue({
            code: 'custom',
            message: 'No puede haber rangos de mora superpuestos para la misma categoria',
            path: ['creditProductLateInterestRules'],
          });
          i = lateInterestRules.length;
          break;
        }
      }
    }

    const requiredDocs = data.creditProductRequiredDocuments ?? [];
    const docIds = new Set<number>();
    for (const doc of requiredDocs) {
      if (docIds.has(doc.documentTypeId)) {
        ctx.addIssue({
          code: 'custom',
          message: 'No puede repetir el tipo de documento',
          path: ['creditProductRequiredDocuments'],
        });
        break;
      }
      docIds.add(doc.documentTypeId);
    }

    const accounts = data.creditProductAccounts ?? [];
    if (accounts.length > 1) {
      ctx.addIssue({
        code: 'custom',
        message: 'Solo se permite una configuracion de cuentas por producto',
        path: ['creditProductAccounts'],
      });
    }

    const billingConcepts = data.creditProductBillingConcepts ?? [];
    const billingConceptIds = new Set<number>();
    for (const concept of billingConcepts) {
      if (billingConceptIds.has(concept.billingConceptId)) {
        ctx.addIssue({
          code: 'custom',
          message: 'No puede repetir el concepto de facturacion',
          path: ['creditProductBillingConcepts'],
        });
        break;
      }
      billingConceptIds.add(concept.billingConceptId);
    }

    const policy = data.creditProductRefinancePolicy;
    if (policy) {
      if (!policy.allowConsolidation && policy.maxLoansToConsolidate > 1) {
        ctx.addIssue({
          code: 'custom',
          message: 'Si no permite consolidacion, maximo de creditos a consolidar debe ser 1',
          path: ['creditProductRefinancePolicy'],
        });
      }

      if (policy.allowRefinance && policy.maxRefinanceCount < 1) {
        ctx.addIssue({
          code: 'custom',
          message: 'Maximo refinanciaciones debe ser mayor a 0 cuando se permite refinanciar',
          path: ['creditProductRefinancePolicy'],
        });
      }

      if (policy.isActive && !policy.allowRefinance && !policy.allowConsolidation) {
        ctx.addIssue({
          code: 'custom',
          message: 'La politica activa debe permitir refinanciacion o consolidacion',
          path: ['creditProductRefinancePolicy'],
        });
      }
    }

    const chargeOffPolicy = data.creditProductChargeOffPolicy;
    if (chargeOffPolicy) {
      if (chargeOffPolicy.allowChargeOff && chargeOffPolicy.minDaysPastDue < 1) {
        ctx.addIssue({
          code: 'custom',
          message: 'Dias minimos de mora debe ser mayor a 0 cuando se permite castigo',
          path: ['creditProductChargeOffPolicy'],
        });
      }
    }
  });

export const CreateCreditProductBodySchema = addCreditProductValidation(CreditProductBaseSchema);

export const UpdateCreditProductBodySchema = addCreditProductValidation(
  CreditProductBaseSchema.partial()
);

// ============================================
// TYPES
// ============================================

export type CreditProductPaginated = ClientInferResponseBody<Contract['creditProduct']['list'], 200>;

export type CreditProduct = CreditProductPaginated['data'][number];

export type CreditProductSortField = (typeof CREDIT_PRODUCT_SORT_FIELDS)[number];
export type CreditProductInclude = (typeof CREDIT_PRODUCT_INCLUDE_OPTIONS)[number];
