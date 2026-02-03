import { Contract } from '@/server/api/contracts';
import {
  BooleanOperatorsSchema,
  createIncludeSchema,
  createListQuerySchema,
  DateOperatorsSchema,
  EnumOperatorsSchema,
  NumberOperatorsSchema,
  StringOperatorsSchema,
} from '@/server/utils/query/schemas';
import { ClientInferResponseBody } from '@ts-rest/core';
import { z } from 'zod';

// ============================================
// ENUMS
// ============================================

export const PAYMENT_TENDER_TYPE_VALUES = ['TRANSFER', 'CHECK', 'CASH'] as const;
export type PaymentTenderTypeValue = (typeof PAYMENT_TENDER_TYPE_VALUES)[number];

export const PaymentTenderTypeLabels: Record<PaymentTenderTypeValue, string> = {
  TRANSFER: 'Transferencia',
  CHECK: 'Cheque',
  CASH: 'Efectivo',
};

// ============================================
// SCHEMAS
// ============================================

// ============================================
// WHERE
// ============================================

const PaymentTenderTypeWhereFieldsSchema = z
  .object({
    id: z.union([z.number(), NumberOperatorsSchema]).optional(),
    name: z.union([z.string(), StringOperatorsSchema]).optional(),
    type: z
      .union([z.enum(PAYMENT_TENDER_TYPE_VALUES), EnumOperatorsSchema(PAYMENT_TENDER_TYPE_VALUES)])
      .optional(),
    isActive: z.union([z.boolean(), BooleanOperatorsSchema]).optional(),
    createdAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
    updatedAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
  })
  .strict();

// ============================================
// SORT
// ============================================

const PAYMENT_TENDER_TYPE_SORT_FIELDS = [
  'id',
  'name',
  'type',
  'isActive',
  'createdAt',
  'updatedAt',
] as const;

// ============================================
// INCLUDE
// ============================================

const PAYMENT_TENDER_TYPE_INCLUDE_OPTIONS = ['loanPaymentMethodAllocations'] as const;
const PaymentTenderTypeIncludeSchema = createIncludeSchema(PAYMENT_TENDER_TYPE_INCLUDE_OPTIONS);

// ============================================
// QUERY SCHEMAS
// ============================================

export const ListPaymentTenderTypesQuerySchema = createListQuerySchema({
  whereFields: PaymentTenderTypeWhereFieldsSchema,
  sortFields: PAYMENT_TENDER_TYPE_SORT_FIELDS,
  includeFields: PAYMENT_TENDER_TYPE_INCLUDE_OPTIONS,
  sortMax: 3,
});

export type ListPaymentTenderTypesQuery = z.infer<typeof ListPaymentTenderTypesQuerySchema>;

export const GetPaymentTenderTypeQuerySchema = z.object({
  include: PaymentTenderTypeIncludeSchema,
});

// ============================================
// MUTATIONS
// ============================================

export const CreatePaymentTenderTypeBodySchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(PAYMENT_TENDER_TYPE_VALUES),
  isActive: z.boolean(),
});

export const UpdatePaymentTenderTypeBodySchema = CreatePaymentTenderTypeBodySchema.partial();

// ============================================
// TYPES
// ============================================

export type PaymentTenderTypePaginated = ClientInferResponseBody<
  Contract['paymentTenderType']['list'],
  200
>;

export type PaymentTenderType = PaymentTenderTypePaginated['data'][number];

export type PaymentTenderTypeSortField = (typeof PAYMENT_TENDER_TYPE_SORT_FIELDS)[number];
export type PaymentTenderTypeInclude = (typeof PAYMENT_TENDER_TYPE_INCLUDE_OPTIONS)[number];
