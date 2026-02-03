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

const PaymentGuaranteeTypeWhereFieldsSchema = z
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

const PAYMENT_GUARANTEE_TYPE_SORT_FIELDS = [
  'id',
  'name',
  'isActive',
  'createdAt',
  'updatedAt',
] as const;

// ============================================
// INCLUDE
// ============================================

const PAYMENT_GUARANTEE_TYPE_INCLUDE_OPTIONS = ['loans'] as const;
const PaymentGuaranteeTypeIncludeSchema = createIncludeSchema(PAYMENT_GUARANTEE_TYPE_INCLUDE_OPTIONS);

// ============================================
// QUERY SCHEMAS
// ============================================

export const ListPaymentGuaranteeTypesQuerySchema = createListQuerySchema({
  whereFields: PaymentGuaranteeTypeWhereFieldsSchema,
  sortFields: PAYMENT_GUARANTEE_TYPE_SORT_FIELDS,
  includeFields: PAYMENT_GUARANTEE_TYPE_INCLUDE_OPTIONS,
  sortMax: 3,
});

export type ListPaymentGuaranteeTypesQuery = z.infer<typeof ListPaymentGuaranteeTypesQuerySchema>;

export const GetPaymentGuaranteeTypeQuerySchema = z.object({
  include: PaymentGuaranteeTypeIncludeSchema,
});

// ============================================
// MUTATIONS
// ============================================

export const CreatePaymentGuaranteeTypeBodySchema = z.object({
  name: z.string().min(1).max(255),
  isActive: z.boolean(),
});

export const UpdatePaymentGuaranteeTypeBodySchema = CreatePaymentGuaranteeTypeBodySchema.partial();

// ============================================
// TYPES
// ============================================

export type PaymentGuaranteeTypePaginated = ClientInferResponseBody<
  Contract['paymentGuaranteeType']['list'],
  200
>;

export type PaymentGuaranteeType = PaymentGuaranteeTypePaginated['data'][number];

export type PaymentGuaranteeTypeSortField = (typeof PAYMENT_GUARANTEE_TYPE_SORT_FIELDS)[number];
export type PaymentGuaranteeTypeInclude = (typeof PAYMENT_GUARANTEE_TYPE_INCLUDE_OPTIONS)[number];
