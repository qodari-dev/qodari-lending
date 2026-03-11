import { Contract } from '@/server/api/contracts';
import {
  createIncludeSchema,
  createListQuerySchema,
  EnumOperatorsSchema,
  NumberOperatorsSchema,
  StringOperatorsSchema,
} from '@/server/utils/query/schemas';
import { ClientInferResponseBody } from '@ts-rest/core';
import { z } from 'zod';

// ============================================
// WHERE FIELDS
// ============================================

const BILLING_DISPATCH_STATUS_OPTIONS = ['QUEUED', 'RUNNING', 'SENT', 'FAILED'] as const;
const BILLING_DISPATCH_TRIGGER_SOURCE_OPTIONS = ['CRON', 'MANUAL', 'RETRY'] as const;

const BillingDispatchWhereFieldsSchema = z
  .object({
    id: z.union([z.number(), NumberOperatorsSchema]).optional(),
    agreementId: z.union([z.number(), NumberOperatorsSchema]).optional(),
    billingCycleProfileId: z.union([z.number(), NumberOperatorsSchema]).optional(),
    period: z.union([z.string(), StringOperatorsSchema]).optional(),
    status: z
      .union([
        z.enum(BILLING_DISPATCH_STATUS_OPTIONS),
        EnumOperatorsSchema(BILLING_DISPATCH_STATUS_OPTIONS),
      ])
      .optional(),
    triggerSource: z
      .union([
        z.enum(BILLING_DISPATCH_TRIGGER_SOURCE_OPTIONS),
        EnumOperatorsSchema(BILLING_DISPATCH_TRIGGER_SOURCE_OPTIONS),
      ])
      .optional(),
    dispatchNumber: z.union([z.number(), NumberOperatorsSchema]).optional(),
  })
  .strict();

// ============================================
// SORT / INCLUDE / QUERY
// ============================================

const BILLING_DISPATCH_SORT_FIELDS = [
  'id',
  'agreementId',
  'period',
  'status',
  'dispatchNumber',
  'scheduledDate',
  'createdAt',
] as const;

const BILLING_DISPATCH_INCLUDE_OPTIONS = ['agreement', 'items'] as const;
const BillingDispatchIncludeSchema = createIncludeSchema(BILLING_DISPATCH_INCLUDE_OPTIONS);

export const ListBillingDispatchesQuerySchema = createListQuerySchema({
  whereFields: BillingDispatchWhereFieldsSchema,
  sortFields: BILLING_DISPATCH_SORT_FIELDS,
  includeFields: BILLING_DISPATCH_INCLUDE_OPTIONS,
  sortMax: 3,
});

export type ListBillingDispatchesQuery = z.infer<typeof ListBillingDispatchesQuerySchema>;

export const GetBillingDispatchQuerySchema = z.object({
  include: BillingDispatchIncludeSchema,
});

// ============================================
// TYPES
// ============================================

export type BillingDispatchPaginated = ClientInferResponseBody<
  Contract['billingDispatch']['list'],
  200
>;

export type BillingDispatch = BillingDispatchPaginated['data'][number];

export type BillingDispatchSortField = (typeof BILLING_DISPATCH_SORT_FIELDS)[number];
export type BillingDispatchInclude = (typeof BILLING_DISPATCH_INCLUDE_OPTIONS)[number];
