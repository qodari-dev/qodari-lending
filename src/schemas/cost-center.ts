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

const CostCenterWhereFieldsSchema = z
  .object({
    id: z.union([z.number(), NumberOperatorsSchema]).optional(),
    code: z.union([z.string(), StringOperatorsSchema]).optional(),
    name: z.union([z.string(), StringOperatorsSchema]).optional(),
    isActive: z.union([z.boolean(), BooleanOperatorsSchema]).optional(),
    createdAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
    updatedAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
  })
  .strict();

// ============================================
// SORT
// ============================================

const COST_CENTER_SORT_FIELDS = ['id', 'code', 'name', 'isActive', 'createdAt', 'updatedAt'] as const;

// ============================================
// INCLUDE
// ============================================

const COST_CENTER_INCLUDE_OPTIONS = ['accountingDistributionLines', 'creditProducts', 'accountingEntries'] as const;
const CostCenterIncludeSchema = createIncludeSchema(COST_CENTER_INCLUDE_OPTIONS);

// ============================================
// QUERY SCHEMAS
// ============================================

export const ListCostCentersQuerySchema = createListQuerySchema({
  whereFields: CostCenterWhereFieldsSchema,
  sortFields: COST_CENTER_SORT_FIELDS,
  includeFields: COST_CENTER_INCLUDE_OPTIONS,
  sortMax: 3,
});

export type ListCostCentersQuery = z.infer<typeof ListCostCentersQuerySchema>;

export const GetCostCenterQuerySchema = z.object({
  include: CostCenterIncludeSchema,
});

// ============================================
// MUTATIONS
// ============================================

export const CreateCostCenterBodySchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(255),
  isActive: z.boolean(),
});

export const UpdateCostCenterBodySchema = CreateCostCenterBodySchema.partial();

// ============================================
// TYPES
// ============================================

export type CostCenterPaginated = ClientInferResponseBody<Contract['costCenter']['list'], 200>;

export type CostCenter = CostCenterPaginated['data'][number];

export type CostCenterSortField = (typeof COST_CENTER_SORT_FIELDS)[number];
export type CostCenterInclude = (typeof COST_CENTER_INCLUDE_OPTIONS)[number];
