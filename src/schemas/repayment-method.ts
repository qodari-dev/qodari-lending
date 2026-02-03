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

const RepaymentMethodWhereFieldsSchema = z
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

const REPAYMENT_METHOD_SORT_FIELDS = ['id', 'name', 'isActive', 'createdAt', 'updatedAt'] as const;

// ============================================
// INCLUDE
// ============================================

const REPAYMENT_METHOD_INCLUDE_OPTIONS = ['loanApplications', 'loans'] as const;
const RepaymentMethodIncludeSchema = createIncludeSchema(REPAYMENT_METHOD_INCLUDE_OPTIONS);

// ============================================
// QUERY SCHEMAS
// ============================================

export const ListRepaymentMethodsQuerySchema = createListQuerySchema({
  whereFields: RepaymentMethodWhereFieldsSchema,
  sortFields: REPAYMENT_METHOD_SORT_FIELDS,
  includeFields: REPAYMENT_METHOD_INCLUDE_OPTIONS,
  sortMax: 3,
});

export type ListRepaymentMethodsQuery = z.infer<typeof ListRepaymentMethodsQuerySchema>;

export const GetRepaymentMethodQuerySchema = z.object({
  include: RepaymentMethodIncludeSchema,
});

// ============================================
// MUTATIONS
// ============================================

export const CreateRepaymentMethodBodySchema = z.object({
  name: z.string().min(1).max(255),
  isActive: z.boolean(),
});

export const UpdateRepaymentMethodBodySchema = CreateRepaymentMethodBodySchema.partial();

// ============================================
// TYPES
// ============================================

export type RepaymentMethodPaginated = ClientInferResponseBody<
  Contract['repaymentMethod']['list'],
  200
>;

export type RepaymentMethod = RepaymentMethodPaginated['data'][number];

export type RepaymentMethodSortField = (typeof REPAYMENT_METHOD_SORT_FIELDS)[number];
export type RepaymentMethodInclude = (typeof REPAYMENT_METHOD_INCLUDE_OPTIONS)[number];
