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

const PaymentFrequencyWhereFieldsSchema = z
  .object({
    id: z.union([z.number(), NumberOperatorsSchema]).optional(),
    name: z.union([z.string(), StringOperatorsSchema]).optional(),
    daysInterval: z.union([z.number(), NumberOperatorsSchema]).optional(),
    isActive: z.union([z.boolean(), BooleanOperatorsSchema]).optional(),
    createdAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
    updatedAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
  })
  .strict();

// ============================================
// SORT
// ============================================

const PAYMENT_FREQUENCY_SORT_FIELDS = [
  'id',
  'name',
  'daysInterval',
  'isActive',
  'createdAt',
  'updatedAt',
] as const;

// ============================================
// INCLUDE
// ============================================

const PAYMENT_FREQUENCY_INCLUDE_OPTIONS = ['loanApplications', 'loans'] as const;
const PaymentFrequencyIncludeSchema = createIncludeSchema(PAYMENT_FREQUENCY_INCLUDE_OPTIONS);

// ============================================
// QUERY SCHEMAS
// ============================================

export const ListPaymentFrequenciesQuerySchema = createListQuerySchema({
  whereFields: PaymentFrequencyWhereFieldsSchema,
  sortFields: PAYMENT_FREQUENCY_SORT_FIELDS,
  includeFields: PAYMENT_FREQUENCY_INCLUDE_OPTIONS,
  sortMax: 3,
});

export type ListPaymentFrequenciesQuery = z.infer<typeof ListPaymentFrequenciesQuerySchema>;

export const GetPaymentFrequencyQuerySchema = z.object({
  include: PaymentFrequencyIncludeSchema,
});

// ============================================
// MUTATIONS
// ============================================

export const CreatePaymentFrequencyBodySchema = z.object({
  name: z.string().min(1).max(255),
  daysInterval: z.number().int().min(1),
  isActive: z.boolean(),
});

export const UpdatePaymentFrequencyBodySchema = CreatePaymentFrequencyBodySchema.partial();

// ============================================
// TYPES
// ============================================

export type PaymentFrequencyPaginated = ClientInferResponseBody<
  Contract['paymentFrequency']['list'],
  200
>;

export type PaymentFrequency = PaymentFrequencyPaginated['data'][number];

export type PaymentFrequencySortField = (typeof PAYMENT_FREQUENCY_SORT_FIELDS)[number];
export type PaymentFrequencyInclude = (typeof PAYMENT_FREQUENCY_INCLUDE_OPTIONS)[number];
