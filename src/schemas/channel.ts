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

const ChannelWhereFieldsSchema = z
  .object({
    id: z.union([z.number(), NumberOperatorsSchema]).optional(),
    code: z.union([z.string(), StringOperatorsSchema]).optional(),
    name: z.union([z.string(), StringOperatorsSchema]).optional(),
    description: z.union([z.string(), StringOperatorsSchema]).optional(),
    isActive: z.union([z.boolean(), BooleanOperatorsSchema]).optional(),
    createdAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
    updatedAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
  })
  .strict();

// ============================================
// SORT
// ============================================

const CHANNEL_SORT_FIELDS = ['id', 'code', 'name', 'isActive', 'createdAt', 'updatedAt'] as const;

// ============================================
// INCLUDE
// ============================================

const CHANNEL_INCLUDE_OPTIONS = ['loanApplications', 'loans'] as const;
const ChannelIncludeSchema = createIncludeSchema(CHANNEL_INCLUDE_OPTIONS);

// ============================================
// QUERY SCHEMAS
// ============================================

export const ListChannelsQuerySchema = createListQuerySchema({
  whereFields: ChannelWhereFieldsSchema,
  sortFields: CHANNEL_SORT_FIELDS,
  includeFields: CHANNEL_INCLUDE_OPTIONS,
  sortMax: 3,
});

export type ListChannelsQuery = z.infer<typeof ListChannelsQuerySchema>;

export const GetChannelQuerySchema = z.object({
  include: ChannelIncludeSchema,
});

// ============================================
// MUTATIONS
// ============================================

const ChannelCodeSchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim().toUpperCase() : value),
  z
    .string()
    .min(1, 'Codigo requerido')
    .max(30, 'Codigo maximo de 30 caracteres')
    .regex(
      /^[A-Z][A-Z0-9_]*$/,
      'El codigo debe iniciar con letra y solo permite letras mayusculas, numeros y guion bajo (_)'
    )
);

export const CreateChannelBodySchema = z.object({
  code: ChannelCodeSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(255).optional(),
  isActive: z.boolean(),
});

export const UpdateChannelBodySchema = CreateChannelBodySchema.partial();

// ============================================
// TYPES
// ============================================

export type ChannelPaginated = ClientInferResponseBody<Contract['channel']['list'], 200>;

export type Channel = ChannelPaginated['data'][number];

export type ChannelSortField = (typeof CHANNEL_SORT_FIELDS)[number];
export type ChannelInclude = (typeof CHANNEL_INCLUDE_OPTIONS)[number];
