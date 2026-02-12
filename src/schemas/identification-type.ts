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

const IdentificationTypeWhereFieldsSchema = z
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

const IDENTIFICATION_TYPE_SORT_FIELDS = [
  'id',
  'code',
  'name',
  'isActive',
  'createdAt',
  'updatedAt',
] as const;

// ============================================
// INCLUDE
// ============================================

const IDENTIFICATION_TYPE_INCLUDE_OPTIONS = [
  'thirdParties',
  'insuranceCompanies',
] as const;
const IdentificationTypeIncludeSchema = createIncludeSchema(IDENTIFICATION_TYPE_INCLUDE_OPTIONS);

// ============================================
// QUERY SCHEMAS
// ============================================

export const ListIdentificationTypesQuerySchema = createListQuerySchema({
  whereFields: IdentificationTypeWhereFieldsSchema,
  sortFields: IDENTIFICATION_TYPE_SORT_FIELDS,
  includeFields: IDENTIFICATION_TYPE_INCLUDE_OPTIONS,
  sortMax: 3,
});

export type ListIdentificationTypesQuery = z.infer<typeof ListIdentificationTypesQuerySchema>;

export const GetIdentificationTypeQuerySchema = z.object({
  include: IdentificationTypeIncludeSchema,
});

// ============================================
// MUTATIONS
// ============================================

export const CreateIdentificationTypeBodySchema = z.object({
  code: z.string().min(1).max(5),
  name: z.string().min(1).max(255),
  isActive: z.boolean(),
});

export const UpdateIdentificationTypeBodySchema = CreateIdentificationTypeBodySchema.partial();

// ============================================
// TYPES
// ============================================

export type IdentificationTypePaginated = ClientInferResponseBody<
  Contract['identificationType']['list'],
  200
>;

export type IdentificationType = IdentificationTypePaginated['data'][number];

export type IdentificationTypeSortField = (typeof IDENTIFICATION_TYPE_SORT_FIELDS)[number];
export type IdentificationTypeInclude = (typeof IDENTIFICATION_TYPE_INCLUDE_OPTIONS)[number];
