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

const RejectionReasonWhereFieldsSchema = z
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

const REJECTION_REASON_SORT_FIELDS = ['id', 'name', 'isActive', 'createdAt', 'updatedAt'] as const;

// ============================================
// INCLUDE
// ============================================

const REJECTION_REASON_INCLUDE_OPTIONS = ['loanApplications'] as const;
const RejectionReasonIncludeSchema = createIncludeSchema(REJECTION_REASON_INCLUDE_OPTIONS);

// ============================================
// QUERY SCHEMAS
// ============================================

export const ListRejectionReasonsQuerySchema = createListQuerySchema({
  whereFields: RejectionReasonWhereFieldsSchema,
  sortFields: REJECTION_REASON_SORT_FIELDS,
  includeFields: REJECTION_REASON_INCLUDE_OPTIONS,
  sortMax: 3,
});

export type ListRejectionReasonsQuery = z.infer<typeof ListRejectionReasonsQuerySchema>;

export const GetRejectionReasonQuerySchema = z.object({
  include: RejectionReasonIncludeSchema,
});

// ============================================
// MUTATIONS
// ============================================

export const CreateRejectionReasonBodySchema = z.object({
  name: z.string().min(1).max(255),
  isActive: z.boolean(),
});

export const UpdateRejectionReasonBodySchema = CreateRejectionReasonBodySchema.partial();

// ============================================
// TYPES
// ============================================

export type RejectionReasonPaginated = ClientInferResponseBody<
  Contract['rejectionReason']['list'],
  200
>;

export type RejectionReason = RejectionReasonPaginated['data'][number];

export type RejectionReasonSortField = (typeof REJECTION_REASON_SORT_FIELDS)[number];
export type RejectionReasonInclude = (typeof REJECTION_REASON_INCLUDE_OPTIONS)[number];
