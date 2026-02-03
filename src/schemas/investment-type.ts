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

const InvestmentTypeWhereFieldsSchema = z
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

const INVESTMENT_TYPE_SORT_FIELDS = ['id', 'name', 'isActive', 'createdAt', 'updatedAt'] as const;

// ============================================
// INCLUDE
// ============================================

const INVESTMENT_TYPE_INCLUDE_OPTIONS = ['loanApplications'] as const;
const InvestmentTypeIncludeSchema = createIncludeSchema(INVESTMENT_TYPE_INCLUDE_OPTIONS);

// ============================================
// QUERY SCHEMAS
// ============================================

export const ListInvestmentTypesQuerySchema = createListQuerySchema({
  whereFields: InvestmentTypeWhereFieldsSchema,
  sortFields: INVESTMENT_TYPE_SORT_FIELDS,
  includeFields: INVESTMENT_TYPE_INCLUDE_OPTIONS,
  sortMax: 3,
});

export type ListInvestmentTypesQuery = z.infer<typeof ListInvestmentTypesQuerySchema>;

export const GetInvestmentTypeQuerySchema = z.object({
  include: InvestmentTypeIncludeSchema,
});

// ============================================
// MUTATIONS
// ============================================

export const CreateInvestmentTypeBodySchema = z.object({
  name: z.string().min(1).max(255),
  isActive: z.boolean(),
});

export const UpdateInvestmentTypeBodySchema = CreateInvestmentTypeBodySchema.partial();

// ============================================
// TYPES
// ============================================

export type InvestmentTypePaginated = ClientInferResponseBody<Contract['investmentType']['list'], 200>;

export type InvestmentType = InvestmentTypePaginated['data'][number];

export type InvestmentTypeSortField = (typeof INVESTMENT_TYPE_SORT_FIELDS)[number];
export type InvestmentTypeInclude = (typeof INVESTMENT_TYPE_INCLUDE_OPTIONS)[number];
