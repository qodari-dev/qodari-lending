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
// ENUMS
// ============================================

export const PAYMENT_RECEIPT_MOVEMENT_TYPE_OPTIONS = [
  'RECEIPT',
  'PLEDGE',
  'PAYROLL',
  'DEPOSIT',
  'OTHER',
] as const;

export type PaymentReceiptMovementType = (typeof PAYMENT_RECEIPT_MOVEMENT_TYPE_OPTIONS)[number];

export const paymentReceiptMovementTypeLabels: Record<PaymentReceiptMovementType, string> = {
  RECEIPT: 'Recibo',
  PLEDGE: 'Pignoracion',
  PAYROLL: 'Libranza',
  DEPOSIT: 'Consignacion',
  OTHER: 'Otro',
};

// ============================================
// WHERE
// ============================================

const PaymentReceiptTypeWhereFieldsSchema = z
  .object({
    id: z.union([z.number(), NumberOperatorsSchema]).optional(),
    code: z.union([z.string(), StringOperatorsSchema]).optional(),
    name: z.union([z.string(), StringOperatorsSchema]).optional(),
    movementType: z
      .union([z.enum(PAYMENT_RECEIPT_MOVEMENT_TYPE_OPTIONS), StringOperatorsSchema])
      .optional(),
    glAccountId: z.union([z.number(), NumberOperatorsSchema]).optional(),
    isActive: z.union([z.boolean(), BooleanOperatorsSchema]).optional(),
    createdAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
    updatedAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
  })
  .strict();

// ============================================
// SORT
// ============================================

const PAYMENT_RECEIPT_TYPE_SORT_FIELDS = [
  'id',
  'code',
  'name',
  'movementType',
  'glAccountId',
  'isActive',
  'createdAt',
  'updatedAt',
] as const;

// ============================================
// INCLUDE
// ============================================

const PAYMENT_RECEIPT_TYPE_INCLUDE_OPTIONS = ['glAccount', 'userPaymentReceiptTypes'] as const;
const PaymentReceiptTypeIncludeSchema = createIncludeSchema(PAYMENT_RECEIPT_TYPE_INCLUDE_OPTIONS);

// ============================================
// QUERY SCHEMAS
// ============================================

export const ListPaymentReceiptTypesQuerySchema = createListQuerySchema({
  whereFields: PaymentReceiptTypeWhereFieldsSchema,
  sortFields: PAYMENT_RECEIPT_TYPE_SORT_FIELDS,
  includeFields: PAYMENT_RECEIPT_TYPE_INCLUDE_OPTIONS,
  sortMax: 3,
});

export type ListPaymentReceiptTypesQuery = z.infer<typeof ListPaymentReceiptTypesQuerySchema>;

export const GetPaymentReceiptTypeQuerySchema = z.object({
  include: PaymentReceiptTypeIncludeSchema,
});

// ============================================
// MUTATIONS
// ============================================

export const UserPaymentReceiptTypeInputSchema = z.object({
  userId: z.uuid(),
  userName: z.string().min(1).max(255),
  isDefault: z.boolean(),
});

export type UserPaymentReceiptTypeInput = z.infer<typeof UserPaymentReceiptTypeInputSchema>;

const PaymentReceiptTypeCodeSchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim().toUpperCase() : value),
  z
    .string()
    .min(2, 'Codigo requerido')
    .max(5, 'Codigo maximo de 5 caracteres')
    .regex(/^[A-Z0-9]+$/, 'El codigo solo permite letras mayusculas y numeros')
);

const PaymentReceiptTypeBaseSchema = z.object({
  code: PaymentReceiptTypeCodeSchema,
  name: z.string().min(1).max(255),
  movementType: z.enum(PAYMENT_RECEIPT_MOVEMENT_TYPE_OPTIONS),
  glAccountId: z.number().int().positive(),
  isActive: z.boolean(),
  userPaymentReceiptTypes: UserPaymentReceiptTypeInputSchema.array().optional(),
});

const addUsersValidation = <T extends z.ZodTypeAny>(schema: T) =>
  schema.superRefine((value, ctx) => {
    const data = value as {
      userPaymentReceiptTypes?: {
        userId: string;
      }[];
    };
    const users = data.userPaymentReceiptTypes ?? [];

    if (users.length > 2) {
      ctx.addIssue({
        code: 'custom',
        message: 'No pueden haber mas de dos usuarios',
        path: ['userPaymentReceiptTypes'],
      });
      return;
    }

    const seen = new Set<string>();
    for (const user of users) {
      if (seen.has(user.userId)) {
        ctx.addIssue({
          code: 'custom',
          message: 'No se puede repetir el usuario',
          path: ['userPaymentReceiptTypes'],
        });
        break;
      }
      seen.add(user.userId);
    }
  });

export const CreatePaymentReceiptTypeBodySchema = addUsersValidation(PaymentReceiptTypeBaseSchema);

export const UpdatePaymentReceiptTypeBodySchema = addUsersValidation(
  PaymentReceiptTypeBaseSchema.partial()
);

// ============================================
// TYPES
// ============================================

export type PaymentReceiptTypePaginated = ClientInferResponseBody<
  Contract['paymentReceiptType']['list'],
  200
>;

export type PaymentReceiptType = PaymentReceiptTypePaginated['data'][number];

export type PaymentReceiptTypeSortField = (typeof PAYMENT_RECEIPT_TYPE_SORT_FIELDS)[number];
export type PaymentReceiptTypeInclude = (typeof PAYMENT_RECEIPT_TYPE_INCLUDE_OPTIONS)[number];
