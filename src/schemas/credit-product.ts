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
  'costCenter',
  'creditProductRefinancePolicy',
  'creditProductCategories',
  'creditProductLateInterestRules',
  'creditProductRequiredDocuments',
  'creditProductAccounts',
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
  pledgeFactor: z.string().nullable().optional(),
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
  costCenterId: z.number().int().positive().nullable().optional(),
  riskEvaluationMode: z.enum(RISK_EVALUATION_MODE_OPTIONS),
  riskMinScore: z.string().nullable().optional(),
  isActive: z.boolean(),
  creditProductRefinancePolicy: CreditProductRefinancePolicyInputSchema.nullable().optional(),
  creditProductCategories: CreditProductCategoryInputSchema.array().optional(),
  creditProductLateInterestRules: CreditProductLateInterestRuleInputSchema.array().optional(),
  creditProductRequiredDocuments: CreditProductRequiredDocumentInputSchema.array().optional(),
  creditProductAccounts: CreditProductAccountInputSchema.array().optional(),
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
