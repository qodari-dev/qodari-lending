import { Contract } from '@/server/api/contracts';
import {
  BooleanOperatorsSchema,
  createIncludeSchema,
  createListQuerySchema,
  DateOperatorsSchema,
  EnumOperatorsSchema,
  NumberOperatorsSchema,
  StringOperatorsSchema,
} from '@/server/utils/query/schemas';
import { datesOverlap, rangesOverlap, toFiniteNumber } from '@/utils/range-overlap';
import { ClientInferResponseBody } from '@ts-rest/core';
import { z } from 'zod';

// ============================================
// ENUMS
// ============================================

export const BILLING_CONCEPT_TYPE_OPTIONS = [
  'PRINCIPAL',
  'INTEREST',
  'LATE_INTEREST',
  'INSURANCE',
  'FEE',
  'GUARANTEE',
  'OTHER',
] as const;

export type BillingConceptType = (typeof BILLING_CONCEPT_TYPE_OPTIONS)[number];

export const BILLING_CONCEPT_FREQUENCY_OPTIONS = [
  'ONE_TIME',
  'MONTHLY',
  'PER_INSTALLMENT',
] as const;

export type BillingConceptFrequency = (typeof BILLING_CONCEPT_FREQUENCY_OPTIONS)[number];

export const BILLING_CONCEPT_FINANCING_MODE_OPTIONS = [
  'DISCOUNT_FROM_DISBURSEMENT',
  'FINANCED_IN_LOAN',
  'BILLED_SEPARATELY',
] as const;

export type BillingConceptFinancingMode =
  (typeof BILLING_CONCEPT_FINANCING_MODE_OPTIONS)[number];

export const BILLING_CONCEPT_CALC_METHOD_OPTIONS = [
  'FIXED_AMOUNT',
  'PERCENTAGE',
  'TIERED_FIXED_AMOUNT',
  'TIERED_PERCENTAGE',
] as const;

export type BillingConceptCalcMethod = (typeof BILLING_CONCEPT_CALC_METHOD_OPTIONS)[number];

export const BILLING_CONCEPT_BASE_AMOUNT_OPTIONS = [
  'DISBURSED_AMOUNT',
  'PRINCIPAL',
  'OUTSTANDING_BALANCE',
  'INSTALLMENT_AMOUNT',
] as const;

export type BillingConceptBaseAmount = (typeof BILLING_CONCEPT_BASE_AMOUNT_OPTIONS)[number];

export const BILLING_CONCEPT_RANGE_METRIC_OPTIONS = [
  'INSTALLMENT_COUNT',
  'DISBURSED_AMOUNT',
  'PRINCIPAL',
  'OUTSTANDING_BALANCE',
  'INSTALLMENT_AMOUNT',
] as const;

export type BillingConceptRangeMetric = (typeof BILLING_CONCEPT_RANGE_METRIC_OPTIONS)[number];

export const BILLING_CONCEPT_ROUNDING_MODE_OPTIONS = ['NEAREST', 'UP', 'DOWN'] as const;

export type BillingConceptRoundingMode =
  (typeof BILLING_CONCEPT_ROUNDING_MODE_OPTIONS)[number];

export const billingConceptTypeLabels: Record<BillingConceptType, string> = {
  PRINCIPAL: 'Capital',
  INTEREST: 'Interes',
  LATE_INTEREST: 'Interes mora',
  INSURANCE: 'Seguro',
  FEE: 'Fee',
  GUARANTEE: 'Garantia',
  OTHER: 'Otro',
};

export const billingConceptFrequencyLabels: Record<BillingConceptFrequency, string> = {
  ONE_TIME: 'Unica vez',
  MONTHLY: 'Mensual',
  PER_INSTALLMENT: 'Por cuota',
};

export const billingConceptFinancingModeLabels: Record<BillingConceptFinancingMode, string> = {
  DISCOUNT_FROM_DISBURSEMENT: 'Descontar de desembolso',
  FINANCED_IN_LOAN: 'Financiado en credito',
  BILLED_SEPARATELY: 'Cobro separado',
};

export const billingConceptCalcMethodLabels: Record<BillingConceptCalcMethod, string> = {
  FIXED_AMOUNT: 'Valor fijo',
  PERCENTAGE: 'Porcentaje',
  TIERED_FIXED_AMOUNT: 'Escalonado valor fijo',
  TIERED_PERCENTAGE: 'Escalonado porcentaje',
};

export const billingConceptBaseAmountLabels: Record<BillingConceptBaseAmount, string> = {
  DISBURSED_AMOUNT: 'Monto desembolsado',
  PRINCIPAL: 'Capital',
  OUTSTANDING_BALANCE: 'Saldo',
  INSTALLMENT_AMOUNT: 'Valor cuota',
};

export const billingConceptRangeMetricLabels: Record<BillingConceptRangeMetric, string> = {
  INSTALLMENT_COUNT: 'Numero cuotas',
  DISBURSED_AMOUNT: 'Monto desembolsado',
  PRINCIPAL: 'Capital',
  OUTSTANDING_BALANCE: 'Saldo',
  INSTALLMENT_AMOUNT: 'Valor cuota',
};

export const billingConceptRoundingModeLabels: Record<BillingConceptRoundingMode, string> = {
  NEAREST: 'Redondeo normal',
  UP: 'Hacia arriba',
  DOWN: 'Hacia abajo',
};

// ============================================
// WHERE
// ============================================

const BillingConceptWhereFieldsSchema = z
  .object({
    id: z.union([z.number(), NumberOperatorsSchema]).optional(),
    code: z.union([z.string(), StringOperatorsSchema]).optional(),
    name: z.union([z.string(), StringOperatorsSchema]).optional(),
    isSystem: z.union([z.boolean(), BooleanOperatorsSchema]).optional(),
    conceptType: z
      .union([
        z.enum(BILLING_CONCEPT_TYPE_OPTIONS),
        EnumOperatorsSchema(BILLING_CONCEPT_TYPE_OPTIONS),
      ])
      .optional(),
    defaultFrequency: z
      .union([
        z.enum(BILLING_CONCEPT_FREQUENCY_OPTIONS),
        EnumOperatorsSchema(BILLING_CONCEPT_FREQUENCY_OPTIONS),
      ])
      .optional(),
    defaultFinancingMode: z
      .union([
        z.enum(BILLING_CONCEPT_FINANCING_MODE_OPTIONS),
        EnumOperatorsSchema(BILLING_CONCEPT_FINANCING_MODE_OPTIONS),
      ])
      .optional(),
    defaultGlAccountId: z.union([z.number(), NumberOperatorsSchema]).optional(),
    isActive: z.union([z.boolean(), BooleanOperatorsSchema]).optional(),
    createdAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
    updatedAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
  })
  .strict();

// ============================================
// SORT
// ============================================

const BILLING_CONCEPT_SORT_FIELDS = [
  'id',
  'code',
  'name',
  'isSystem',
  'conceptType',
  'defaultFrequency',
  'defaultFinancingMode',
  'defaultGlAccountId',
  'isActive',
  'createdAt',
  'updatedAt',
] as const;

// ============================================
// INCLUDE
// ============================================

const BILLING_CONCEPT_INCLUDE_OPTIONS = ['defaultGlAccount', 'billingConceptRules'] as const;
const BillingConceptIncludeSchema = createIncludeSchema(BILLING_CONCEPT_INCLUDE_OPTIONS);

// ============================================
// QUERY SCHEMAS
// ============================================

export const ListBillingConceptsQuerySchema = createListQuerySchema({
  whereFields: BillingConceptWhereFieldsSchema,
  sortFields: BILLING_CONCEPT_SORT_FIELDS,
  includeFields: BILLING_CONCEPT_INCLUDE_OPTIONS,
  sortMax: 3,
});

export type ListBillingConceptsQuery = z.infer<typeof ListBillingConceptsQuerySchema>;

export const GetBillingConceptQuerySchema = z.object({
  include: BillingConceptIncludeSchema,
});

// ============================================
// MUTATIONS
// ============================================

export const BillingConceptRuleInputSchema = z.object({
  rate: z.string().nullable().optional(),
  amount: z.string().nullable().optional(),
  valueFrom: z.string().nullable().optional(),
  valueTo: z.string().nullable().optional(),
  effectiveFrom: z.coerce.date().nullable().optional(),
  effectiveTo: z.coerce.date().nullable().optional(),
  isActive: z.boolean(),
});

export type BillingConceptRuleInput = z.infer<typeof BillingConceptRuleInputSchema>;

const BillingConceptBaseSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .regex(
      /^[A-Z0-9_]+$/,
      'Codigo invalido. Use solo letras mayusculas, numeros y guion bajo (_)'
    ),
  name: z.string().min(1).max(150),
  isSystem: z.boolean(),
  conceptType: z.enum(BILLING_CONCEPT_TYPE_OPTIONS),
  defaultFrequency: z.enum(BILLING_CONCEPT_FREQUENCY_OPTIONS),
  defaultFinancingMode: z.enum(BILLING_CONCEPT_FINANCING_MODE_OPTIONS),
  calcMethod: z.enum(BILLING_CONCEPT_CALC_METHOD_OPTIONS),
  baseAmount: z.enum(BILLING_CONCEPT_BASE_AMOUNT_OPTIONS).nullable().optional(),
  rangeMetric: z.enum(BILLING_CONCEPT_RANGE_METRIC_OPTIONS).nullable().optional(),
  minAmount: z.string().nullable().optional(),
  maxAmount: z.string().nullable().optional(),
  roundingMode: z.enum(BILLING_CONCEPT_ROUNDING_MODE_OPTIONS),
  roundingDecimals: z.number().int().min(0).max(6),
  defaultGlAccountId: z.number().int().positive().nullable().optional(),
  isActive: z.boolean(),
  description: z.string().nullable().optional(),
  billingConceptRules: BillingConceptRuleInputSchema.array().optional(),
});

function isTieredCalcMethod(method: BillingConceptCalcMethod | undefined): boolean {
  return method === 'TIERED_FIXED_AMOUNT' || method === 'TIERED_PERCENTAGE';
}

const addBillingConceptValidation = <T extends z.ZodTypeAny>(schema: T) =>
  schema.superRefine((value, ctx) => {
    const data = value as {
      calcMethod?: BillingConceptCalcMethod;
      baseAmount?: BillingConceptBaseAmount | null;
      rangeMetric?: BillingConceptRangeMetric | null;
      minAmount?: string | null;
      maxAmount?: string | null;
      billingConceptRules?: {
        rate?: string | null;
        amount?: string | null;
        valueFrom?: string | null;
        valueTo?: string | null;
        effectiveFrom?: Date | null;
        effectiveTo?: Date | null;
        isActive?: boolean;
      }[];
    };

    const rules = data.billingConceptRules ?? [];
    const activeRules = rules.filter((rule) => rule.isActive !== false);

    if (data.minAmount && data.maxAmount && Number(data.minAmount) > Number(data.maxAmount)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Minimo no puede ser mayor a maximo',
        path: ['minAmount'],
      });
      return;
    }

    if (!data.calcMethod) {
      if (rules.length > 0) {
        ctx.addIssue({
          code: 'custom',
          message: 'Metodo calculo es requerido cuando hay reglas',
          path: ['calcMethod'],
        });
      }
      return;
    }

    if (data.calcMethod === 'PERCENTAGE' && !data.baseAmount) {
      ctx.addIssue({
        code: 'custom',
        message: 'Base es requerida para metodo porcentaje',
        path: ['baseAmount'],
      });
    }

    if (data.calcMethod === 'FIXED_AMOUNT' && data.baseAmount) {
      ctx.addIssue({
        code: 'custom',
        message: 'Metodo fijo no usa base',
        path: ['baseAmount'],
      });
    }

    if (data.calcMethod === 'TIERED_FIXED_AMOUNT' && data.baseAmount) {
      ctx.addIssue({
        code: 'custom',
        message: 'Escalonado valor fijo no usa base',
        path: ['baseAmount'],
      });
    }

    if (data.calcMethod === 'TIERED_PERCENTAGE' && !data.baseAmount) {
      ctx.addIssue({
        code: 'custom',
        message: 'Escalonado porcentaje requiere base',
        path: ['baseAmount'],
      });
    }

    if (isTieredCalcMethod(data.calcMethod) && !data.rangeMetric) {
      ctx.addIssue({
        code: 'custom',
        message: 'Metodo escalonado requiere metrica de rango',
        path: ['rangeMetric'],
      });
    }

    if (!isTieredCalcMethod(data.calcMethod) && data.rangeMetric) {
      ctx.addIssue({
        code: 'custom',
        message: 'Metrica de rango solo aplica para metodo escalonado',
        path: ['rangeMetric'],
      });
    }

    if (!isTieredCalcMethod(data.calcMethod) && activeRules.length > 1) {
      ctx.addIssue({
        code: 'custom',
        message: 'Metodo fijo/porcentaje permite una sola regla activa',
        path: ['billingConceptRules'],
      });
    }

    for (const rule of rules) {
      if (rule.effectiveFrom && rule.effectiveTo && rule.effectiveFrom > rule.effectiveTo) {
        ctx.addIssue({
          code: 'custom',
          message: 'Fecha inicio no puede ser mayor a fecha fin',
          path: ['billingConceptRules'],
        });
        break;
      }

      if (data.calcMethod === 'FIXED_AMOUNT') {
        if (!rule.amount) {
          ctx.addIssue({
            code: 'custom',
            message: 'Valor es requerido para metodo fijo',
            path: ['billingConceptRules'],
          });
          break;
        }
        if (rule.rate) {
          ctx.addIssue({
            code: 'custom',
            message: 'Metodo fijo no usa tasa',
            path: ['billingConceptRules'],
          });
          break;
        }
      }

      if (data.calcMethod === 'PERCENTAGE') {
        if (!rule.rate) {
          ctx.addIssue({
            code: 'custom',
            message: 'Tasa es requerida para metodo porcentaje',
            path: ['billingConceptRules'],
          });
          break;
        }
        if (rule.amount) {
          ctx.addIssue({
            code: 'custom',
            message: 'Metodo porcentaje no usa valor fijo en la regla',
            path: ['billingConceptRules'],
          });
          break;
        }
      }

      if (!isTieredCalcMethod(data.calcMethod) && (rule.valueFrom || rule.valueTo)) {
        ctx.addIssue({
          code: 'custom',
          message: 'Rango solo aplica para metodo escalonado',
          path: ['billingConceptRules'],
        });
        break;
      }

      if (data.calcMethod === 'TIERED_FIXED_AMOUNT') {
        const hasRange = !!rule.valueFrom && !!rule.valueTo;
        if (!hasRange || !rule.amount) {
          ctx.addIssue({
            code: 'custom',
            message: 'Escalonado valor fijo requiere rango y valor',
            path: ['billingConceptRules'],
          });
          break;
        }
        if (rule.rate) {
          ctx.addIssue({
            code: 'custom',
            message: 'Escalonado valor fijo no usa tasa',
            path: ['billingConceptRules'],
          });
          break;
        }
      }

      if (data.calcMethod === 'TIERED_PERCENTAGE') {
        const hasRange = !!rule.valueFrom && !!rule.valueTo;
        if (!hasRange || !rule.rate) {
          ctx.addIssue({
            code: 'custom',
            message: 'Escalonado porcentaje requiere rango y tasa',
            path: ['billingConceptRules'],
          });
          break;
        }
        if (rule.amount) {
          ctx.addIssue({
            code: 'custom',
            message: 'Escalonado porcentaje no usa valor fijo',
            path: ['billingConceptRules'],
          });
          break;
        }
      }

      if (rule.valueFrom && rule.valueTo && Number(rule.valueFrom) > Number(rule.valueTo)) {
        ctx.addIssue({
          code: 'custom',
          message: 'Valor desde no puede ser mayor a valor hasta',
          path: ['billingConceptRules'],
        });
        break;
      }
    }

    if (isTieredCalcMethod(data.calcMethod)) {
      const tierRules = activeRules.map((rule, index) => ({
        index,
        from: toFiniteNumber(rule.valueFrom ?? null),
        to: toFiniteNumber(rule.valueTo ?? null),
        effectiveFrom: rule.effectiveFrom ?? null,
        effectiveTo: rule.effectiveTo ?? null,
      }));

      for (let i = 0; i < tierRules.length; i += 1) {
        for (let j = i + 1; j < tierRules.length; j += 1) {
          const a = tierRules[i];
          const b = tierRules[j];
          if (!datesOverlap(a.effectiveFrom, a.effectiveTo, b.effectiveFrom, b.effectiveTo)) {
            continue;
          }
          if (rangesOverlap(a.from, a.to, b.from, b.to)) {
            ctx.addIssue({
              code: 'custom',
              message: 'Reglas escalonadas activas no pueden solaparse en rango y vigencia',
              path: ['billingConceptRules'],
            });
            return;
          }
        }
      }
    }
  });

export const CreateBillingConceptBodySchema = addBillingConceptValidation(BillingConceptBaseSchema);

export const UpdateBillingConceptBodySchema = addBillingConceptValidation(
  BillingConceptBaseSchema.partial()
);

// ============================================
// TYPES
// ============================================

export type BillingConceptPaginated = ClientInferResponseBody<
  Contract['billingConcept']['list'],
  200
>;

export type BillingConcept = BillingConceptPaginated['data'][number];

export type BillingConceptSortField = (typeof BILLING_CONCEPT_SORT_FIELDS)[number];
export type BillingConceptInclude = (typeof BILLING_CONCEPT_INCLUDE_OPTIONS)[number];
