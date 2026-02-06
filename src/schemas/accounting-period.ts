import { Contract } from '@/server/api/contracts';
import {
  BooleanOperatorsSchema,
  createListQuerySchema,
  DateOperatorsSchema,
  NumberOperatorsSchema,
} from '@/server/utils/query/schemas';
import { ClientInferResponseBody } from '@ts-rest/core';
import { z } from 'zod';

// ============================================
// LABELS
// ============================================

export const MONTH_LABELS: Record<number, string> = {
  1: 'Enero',
  2: 'Febrero',
  3: 'Marzo',
  4: 'Abril',
  5: 'Mayo',
  6: 'Junio',
  7: 'Julio',
  8: 'Agosto',
  9: 'Septiembre',
  10: 'Octubre',
  11: 'Noviembre',
  12: 'Diciembre',
};

// ============================================
// WHERE
// ============================================

const AccountingPeriodWhereFieldsSchema = z
  .object({
    id: z.union([z.number(), NumberOperatorsSchema]).optional(),
    year: z.union([z.number(), NumberOperatorsSchema]).optional(),
    month: z.union([z.number(), NumberOperatorsSchema]).optional(),
    isClosed: z.union([z.boolean(), BooleanOperatorsSchema]).optional(),
    closedAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
    createdAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
    updatedAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
  })
  .strict();

// ============================================
// SORT
// ============================================

const ACCOUNTING_PERIOD_SORT_FIELDS = [
  'id',
  'year',
  'month',
  'isClosed',
  'closedAt',
  'createdAt',
  'updatedAt',
] as const;

// ============================================
// INCLUDE
// ============================================

const ACCOUNTING_PERIOD_INCLUDE_OPTIONS = ['creditFundBudgets'] as const;

// ============================================
// QUERY SCHEMAS
// ============================================

export const ListAccountingPeriodsQuerySchema = createListQuerySchema({
  whereFields: AccountingPeriodWhereFieldsSchema,
  sortFields: ACCOUNTING_PERIOD_SORT_FIELDS,
  includeFields: ACCOUNTING_PERIOD_INCLUDE_OPTIONS,
  sortMax: 3,
});

export type ListAccountingPeriodsQuery = z.infer<typeof ListAccountingPeriodsQuerySchema>;

export const GetAccountingPeriodQuerySchema = z.object({});

// ============================================
// MUTATIONS
// ============================================

export const CreateAccountingPeriodBodySchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
});

export const UpdateAccountingPeriodBodySchema = z.object({
  year: z.number().int().min(2000).max(2100).optional(),
  month: z.number().int().min(1).max(12).optional(),
});

// ============================================
// TYPES
// ============================================

export type AccountingPeriodPaginated = ClientInferResponseBody<
  Contract['accountingPeriod']['list'],
  200
>;

export type AccountingPeriod = AccountingPeriodPaginated['data'][number];

export type AccountingPeriodSortField = (typeof ACCOUNTING_PERIOD_SORT_FIELDS)[number];
