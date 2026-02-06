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

const AgingProfileWhereFieldsSchema = z
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

const AGING_PROFILE_SORT_FIELDS = ['id', 'name', 'isActive', 'createdAt', 'updatedAt'] as const;

// ============================================
// INCLUDE
// ============================================

const AGING_PROFILE_INCLUDE_OPTIONS = ['agingBuckets'] as const;
const AgingProfileIncludeSchema = createIncludeSchema(AGING_PROFILE_INCLUDE_OPTIONS);

// ============================================
// QUERY SCHEMAS
// ============================================

export const ListAgingProfilesQuerySchema = createListQuerySchema({
  whereFields: AgingProfileWhereFieldsSchema,
  sortFields: AGING_PROFILE_SORT_FIELDS,
  includeFields: AGING_PROFILE_INCLUDE_OPTIONS,
  sortMax: 3,
});

export type ListAgingProfilesQuery = z.infer<typeof ListAgingProfilesQuerySchema>;

export const GetAgingProfileQuerySchema = z.object({
  include: AgingProfileIncludeSchema,
});

// ============================================
// MUTATIONS
// ============================================

export const AgingBucketInputSchema = z.object({
  sortOrder: z.number().int().min(0),
  name: z.string().min(1).max(60),
  daysFrom: z.number().int().min(0),
  daysTo: z.number().int().min(0).nullable().optional(),
  provisionRate: z.string().nullable().optional(),
  isActive: z.boolean(),
});

export type AgingBucketInput = z.infer<typeof AgingBucketInputSchema>;

const AgingProfileBaseSchema = z.object({
  name: z.string().min(1).max(150),
  note: z.string().max(255).nullable().optional(),
  isActive: z.boolean(),
  agingBuckets: AgingBucketInputSchema.array().optional(),
});

const addBucketValidation = <T extends z.ZodTypeAny>(schema: T) =>
  schema.superRefine((value, ctx) => {
    const data = value as {
      agingBuckets?: {
        sortOrder: number;
        name: string;
        daysFrom: number;
        daysTo?: number | null;
      }[];
    };
    const buckets = data.agingBuckets ?? [];
    if (buckets.length === 0) return;

    const seenOrders = new Set<number>();
    for (const bucket of buckets) {
      if (seenOrders.has(bucket.sortOrder)) {
        ctx.addIssue({
          code: 'custom',
          message: 'El orden debe ser unico',
          path: ['agingBuckets'],
        });
        break;
      }
      seenOrders.add(bucket.sortOrder);

      if (bucket.daysTo != null && bucket.daysFrom > bucket.daysTo) {
        ctx.addIssue({
          code: 'custom',
          message: 'El rango de dias es invalido',
          path: ['agingBuckets'],
        });
        break;
      }
    }

    const normalized = buckets
      .map((bucket, index) => ({
        index,
        from: bucket.daysFrom,
        to: bucket.daysTo ?? Number.POSITIVE_INFINITY,
      }))
      .sort((a, b) => a.from - b.from || a.to - b.to);

    for (let i = 1; i < normalized.length; i += 1) {
      const prev = normalized[i - 1];
      const current = normalized[i];
      if (current.from <= prev.to) {
        ctx.addIssue({
          code: 'custom',
          message: 'Los rangos de dias no pueden traslaparse',
          path: ['agingBuckets'],
        });
        break;
      }
    }
  });

export const CreateAgingProfileBodySchema = addBucketValidation(AgingProfileBaseSchema);

export const UpdateAgingProfileBodySchema = addBucketValidation(
  AgingProfileBaseSchema.partial()
);

// ============================================
// TYPES
// ============================================

export type AgingProfilePaginated = ClientInferResponseBody<
  Contract['agingProfile']['list'],
  200
>;

export type AgingProfile = AgingProfilePaginated['data'][number];

export type AgingProfileSortField = (typeof AGING_PROFILE_SORT_FIELDS)[number];
export type AgingProfileInclude = (typeof AGING_PROFILE_INCLUDE_OPTIONS)[number];
