import { Contract } from '@/server/api/contracts';
import {
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

const ThirdPartyTypeWhereFieldsSchema = z
  .object({
    id: z.union([z.number(), NumberOperatorsSchema]).optional(),
    name: z.union([z.string(), StringOperatorsSchema]).optional(),
    createdAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
    updatedAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
  })
  .strict();

// ============================================
// SORT
// ============================================

const THIRD_PARTY_TYPE_SORT_FIELDS = ['id', 'name', 'createdAt', 'updatedAt'] as const;

// ============================================
// INCLUDE
// ============================================

const THIRD_PARTY_TYPE_INCLUDE_OPTIONS = ['thirdParties'] as const;
const ThirdPartyTypeIncludeSchema = createIncludeSchema(THIRD_PARTY_TYPE_INCLUDE_OPTIONS);

// ============================================
// QUERY SCHEMAS
// ============================================

export const ListThirdPartyTypesQuerySchema = createListQuerySchema({
  whereFields: ThirdPartyTypeWhereFieldsSchema,
  sortFields: THIRD_PARTY_TYPE_SORT_FIELDS,
  includeFields: THIRD_PARTY_TYPE_INCLUDE_OPTIONS,
  sortMax: 3,
});

export type ListThirdPartyTypesQuery = z.infer<typeof ListThirdPartyTypesQuerySchema>;

export const GetThirdPartyTypeQuerySchema = z.object({
  include: ThirdPartyTypeIncludeSchema,
});

// ============================================
// MUTATIONS
// ============================================

export const CreateThirdPartyTypeBodySchema = z.object({
  name: z.string().min(1).max(255),
});

export const UpdateThirdPartyTypeBodySchema = CreateThirdPartyTypeBodySchema.partial();

// ============================================
// TYPES
// ============================================

export type ThirdPartyTypePaginated = ClientInferResponseBody<Contract['thirdPartyType']['list'], 200>;

export type ThirdPartyType = ThirdPartyTypePaginated['data'][number];

export type ThirdPartyTypeSortField = (typeof THIRD_PARTY_TYPE_SORT_FIELDS)[number];
export type ThirdPartyTypeInclude = (typeof THIRD_PARTY_TYPE_INCLUDE_OPTIONS)[number];
