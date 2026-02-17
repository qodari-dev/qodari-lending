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
// ENUMS
// ============================================

export const ENTRY_NATURE_OPTIONS = ['DEBIT', 'CREDIT'] as const;
export type EntryNature = (typeof ENTRY_NATURE_OPTIONS)[number];

export const entryNatureLabels: Record<EntryNature, string> = {
  DEBIT: 'Debito',
  CREDIT: 'Credito',
};

// ============================================
// WHERE
// ============================================

const AccountingDistributionWhereFieldsSchema = z
  .object({
    id: z.union([z.number(), NumberOperatorsSchema]).optional(),
    name: z.union([z.string(), StringOperatorsSchema]).optional(),
    isActive: z.union([z.boolean(), BooleanOperatorsSchema]).optional(),
    createdAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
    updatedAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
  })
  .strict();

// ============================================
// SORT
// ============================================

const ACCOUNTING_DISTRIBUTION_SORT_FIELDS = [
  'id',
  'name',
  'isActive',
  'createdAt',
  'updatedAt',
] as const;

// ============================================
// INCLUDE
// ============================================

const ACCOUNTING_DISTRIBUTION_INCLUDE_OPTIONS = ['accountingDistributionLines'] as const;
const AccountingDistributionIncludeSchema = createIncludeSchema(
  ACCOUNTING_DISTRIBUTION_INCLUDE_OPTIONS
);

// ============================================
// QUERY SCHEMAS
// ============================================

export const ListAccountingDistributionsQuerySchema = createListQuerySchema({
  whereFields: AccountingDistributionWhereFieldsSchema,
  sortFields: ACCOUNTING_DISTRIBUTION_SORT_FIELDS,
  includeFields: ACCOUNTING_DISTRIBUTION_INCLUDE_OPTIONS,
  sortMax: 3,
});

export type ListAccountingDistributionsQuery = z.infer<
  typeof ListAccountingDistributionsQuerySchema
>;

export const GetAccountingDistributionQuerySchema = z.object({
  include: AccountingDistributionIncludeSchema,
});

// ============================================
// MUTATIONS
// ============================================

export const AccountingDistributionLineInputSchema = z.object({
  glAccountId: z.number().int().positive(),
  percentage: z.string().min(1, 'Porcentaje es requerido'),
  nature: z.enum(ENTRY_NATURE_OPTIONS),
});

export type AccountingDistributionLineInput = z.infer<typeof AccountingDistributionLineInputSchema>;

const AccountingDistributionBaseSchema = z.object({
  name: z.string().min(1).max(40),
  isActive: z.boolean(),
  accountingDistributionLines: AccountingDistributionLineInputSchema.array().optional(),
});

const addLineTotalsValidation = <T extends z.ZodTypeAny>(schema: T) =>
  schema.superRefine((value, ctx) => {
    const data = value as {
      accountingDistributionLines?: {
        percentage: string;
        nature: 'DEBIT' | 'CREDIT';
      }[];
    };
    const lines = data.accountingDistributionLines ?? [];
    if (lines.length === 0) return;

    const totals = lines.reduce(
      (acc, line) => {
        const amount = Number(line.percentage) || 0;
        if (line.nature === 'DEBIT') acc.debit += amount;
        if (line.nature === 'CREDIT') acc.credit += amount;
        return acc;
      },
      { debit: 0, credit: 0 }
    );

    const epsilon = 0.01;
    const debitOk = Math.abs(totals.debit - 100) <= epsilon;
    const creditOk = Math.abs(totals.credit - 100) <= epsilon;

    if (!debitOk || !creditOk) {
      ctx.addIssue({
        code: 'custom',
        message: 'El total de debito y credito debe ser 100',
        path: ['accountingDistributionLines'],
      });
    }
  });

export const CreateAccountingDistributionBodySchema = addLineTotalsValidation(
  AccountingDistributionBaseSchema
);

export const UpdateAccountingDistributionBodySchema = addLineTotalsValidation(
  AccountingDistributionBaseSchema.partial()
);

// ============================================
// TYPES
// ============================================

export type AccountingDistributionPaginated = ClientInferResponseBody<
  Contract['accountingDistribution']['list'],
  200
>;

export type AccountingDistribution = AccountingDistributionPaginated['data'][number];

export type AccountingDistributionSortField = (typeof ACCOUNTING_DISTRIBUTION_SORT_FIELDS)[number];
export type AccountingDistributionInclude =
  (typeof ACCOUNTING_DISTRIBUTION_INCLUDE_OPTIONS)[number];
