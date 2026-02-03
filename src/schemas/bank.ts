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
// SCHEMAS
// ============================================

// ============================================
// WHERE
// ============================================

const BankWhereFieldsSchema = z
  .object({
    id: z.union([z.number(), NumberOperatorsSchema]).optional(),
    name: z.union([z.string(), StringOperatorsSchema]).optional(),
    asobancariaCode: z.union([z.string(), StringOperatorsSchema]).optional(),
    isActive: z.union([z.boolean(), BooleanOperatorsSchema]).optional(),
    createdAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
    updatedAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
  })
  .strict();

// ============================================
// SORT
// ============================================

const BANK_SORT_FIELDS = ['id', 'name', 'asobancariaCode', 'isActive', 'createdAt', 'updatedAt'] as const;

// ============================================
// INCLUDE
// ============================================

const BANK_INCLUDE_OPTIONS = ['loanApplications'] as const;
const BankIncludeSchema = createIncludeSchema(BANK_INCLUDE_OPTIONS);

// ============================================
// QUERY SCHEMAS
// ============================================

export const ListBanksQuerySchema = createListQuerySchema({
  whereFields: BankWhereFieldsSchema,
  sortFields: BANK_SORT_FIELDS,
  includeFields: BANK_INCLUDE_OPTIONS,
  sortMax: 3,
});

export type ListBanksQuery = z.infer<typeof ListBanksQuerySchema>;

export const GetBankQuerySchema = z.object({
  include: BankIncludeSchema,
});

// ============================================
// MUTATIONS
// ============================================

export const CreateBankBodySchema = z.object({
  name: z.string().min(1).max(80),
  asobancariaCode: z.string().min(1).max(5),
  isActive: z.boolean(),
});

export const UpdateBankBodySchema = CreateBankBodySchema.partial();

// ============================================
// TYPES
// ============================================

export type BankPaginated = ClientInferResponseBody<Contract['bank']['list'], 200>;

export type Bank = BankPaginated['data'][number];

export type BankSortField = (typeof BANK_SORT_FIELDS)[number];
export type BankInclude = (typeof BANK_INCLUDE_OPTIONS)[number];
