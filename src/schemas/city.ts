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

const CityWhereFieldsSchema = z
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

const CITY_SORT_FIELDS = ['id', 'code', 'name', 'isActive', 'createdAt', 'updatedAt'] as const;

// ============================================
// INCLUDE
// ============================================

const CITY_INCLUDE_OPTIONS = [
  'thirdPartiesHome',
  'thirdPartiesWork',
] as const;
const CityIncludeSchema = createIncludeSchema(CITY_INCLUDE_OPTIONS);

// ============================================
// QUERY SCHEMAS
// ============================================

export const ListCitiesQuerySchema = createListQuerySchema({
  whereFields: CityWhereFieldsSchema,
  sortFields: CITY_SORT_FIELDS,
  includeFields: CITY_INCLUDE_OPTIONS,
  sortMax: 3,
});

export type ListCitiesQuery = z.infer<typeof ListCitiesQuerySchema>;

export const GetCityQuerySchema = z.object({
  include: CityIncludeSchema,
});

// ============================================
// MUTATIONS
// ============================================

export const CreateCityBodySchema = z.object({
  code: z.string().min(1).max(5),
  name: z.string().min(1).max(255),
  isActive: z.boolean(),
});

export const UpdateCityBodySchema = CreateCityBodySchema.partial();

// ============================================
// TYPES
// ============================================

export type CityPaginated = ClientInferResponseBody<Contract['city']['list'], 200>;

export type City = CityPaginated['data'][number];

export type CitySortField = (typeof CITY_SORT_FIELDS)[number];
export type CityInclude = (typeof CITY_INCLUDE_OPTIONS)[number];
