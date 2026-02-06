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

const CreditFundWhereFieldsSchema = z
  .object({
    id: z.union([z.number(), NumberOperatorsSchema]).optional(),
    name: z.union([z.string(), StringOperatorsSchema]).optional(),
    isControlled: z.union([z.boolean(), BooleanOperatorsSchema]).optional(),
    isActive: z.union([z.boolean(), BooleanOperatorsSchema]).optional(),
    createdAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
    updatedAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
  })
  .strict();

// ============================================
// SORT
// ============================================

const CREDIT_FUND_SORT_FIELDS = [
  'id',
  'name',
  'isControlled',
  'isActive',
  'createdAt',
  'updatedAt',
] as const;

// ============================================
// INCLUDE
// ============================================

const CREDIT_FUND_INCLUDE_OPTIONS = ['creditFundBudgets'] as const;
const CreditFundIncludeSchema = createIncludeSchema(CREDIT_FUND_INCLUDE_OPTIONS);

// ============================================
// QUERY SCHEMAS
// ============================================

export const ListCreditFundsQuerySchema = createListQuerySchema({
  whereFields: CreditFundWhereFieldsSchema,
  sortFields: CREDIT_FUND_SORT_FIELDS,
  includeFields: CREDIT_FUND_INCLUDE_OPTIONS,
  sortMax: 3,
});

export type ListCreditFundsQuery = z.infer<typeof ListCreditFundsQuerySchema>;

export const GetCreditFundQuerySchema = z.object({
  include: CreditFundIncludeSchema,
});

// ============================================
// MUTATIONS
// ============================================

export const CreditFundBudgetInputSchema = z.object({
  accountingPeriodId: z.number().int().positive(),
  fundAmount: z.string().min(1, 'Monto es requerido'),
  reinvestmentAmount: z.string().min(1, 'Monto es requerido'),
  expenseAmount: z.string().min(1, 'Monto es requerido'),
});

export type CreditFundBudgetInput = z.infer<typeof CreditFundBudgetInputSchema>;

const CreditFundBaseSchema = z.object({
  name: z.string().min(1).max(30),
  isControlled: z.boolean(),
  isActive: z.boolean(),
  creditFundBudgets: CreditFundBudgetInputSchema.array().optional(),
});

const addBudgetValidation = <T extends z.ZodTypeAny>(schema: T) =>
  schema.superRefine((value, ctx) => {
    const data = value as {
      creditFundBudgets?: { accountingPeriodId: number }[];
    };
    const budgets = data.creditFundBudgets ?? [];
    if (budgets.length === 0) return;

    const seenPeriods = new Set<number>();
    for (const budget of budgets) {
      if (seenPeriods.has(budget.accountingPeriodId)) {
        ctx.addIssue({
          code: 'custom',
          message: 'El periodo contable debe ser unico',
          path: ['creditFundBudgets'],
        });
        break;
      }
      seenPeriods.add(budget.accountingPeriodId);
    }
  });

export const CreateCreditFundBodySchema = addBudgetValidation(CreditFundBaseSchema);

export const UpdateCreditFundBodySchema = addBudgetValidation(CreditFundBaseSchema.partial());

// ============================================
// TYPES
// ============================================

export type CreditFundPaginated = ClientInferResponseBody<
  Contract['creditFund']['list'],
  200
>;

export type CreditFund = CreditFundPaginated['data'][number];

export type CreditFundSortField = (typeof CREDIT_FUND_SORT_FIELDS)[number];
export type CreditFundInclude = (typeof CREDIT_FUND_INCLUDE_OPTIONS)[number];
