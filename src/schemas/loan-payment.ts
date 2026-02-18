import { Contract } from '@/server/api/contracts';
import { parseDecimalString } from '@/utils/number-utils';
import {
  createIncludeSchema,
  createListQuerySchema,
  DateOperatorsSchema,
  NumberOperatorsSchema,
  StringOperatorsSchema,
} from '@/server/utils/query/schemas';
import { ClientInferResponseBody } from '@ts-rest/core';
import { z } from 'zod';

export const LOAN_PAYMENT_STATUS_OPTIONS = ['PAID', 'VOID'] as const;
export type LoanPaymentStatus = (typeof LOAN_PAYMENT_STATUS_OPTIONS)[number];

export const loanPaymentStatusLabels: Record<LoanPaymentStatus, string> = {
  PAID: 'Pagado',
  VOID: 'Anulado',
};

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

const LoanPaymentWhereFieldsSchema = z
  .object({
    id: z.union([z.number(), NumberOperatorsSchema]).optional(),
    loanId: z.union([z.number(), NumberOperatorsSchema]).optional(),
    receiptTypeId: z.union([z.number(), NumberOperatorsSchema]).optional(),
    paymentNumber: z.union([z.string(), StringOperatorsSchema]).optional(),
    movementType: z
      .union([z.enum(PAYMENT_RECEIPT_MOVEMENT_TYPE_OPTIONS), StringOperatorsSchema])
      .optional(),
    paymentDate: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
    status: z.union([z.enum(LOAN_PAYMENT_STATUS_OPTIONS), StringOperatorsSchema]).optional(),
    amount: z.union([z.string(), StringOperatorsSchema]).optional(),
    createdAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
    updatedAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
  })
  .strict();

const LOAN_PAYMENT_SORT_FIELDS = [
  'id',
  'paymentNumber',
  'paymentDate',
  'loanId',
  'receiptTypeId',
  'status',
  'amount',
  'createdAt',
  'updatedAt',
] as const;

const LOAN_PAYMENT_INCLUDE_OPTIONS = [
  'loan',
  'paymentReceiptType',
  'glAccount',
  'loanPaymentMethodAllocations',
] as const;

const LoanPaymentIncludeSchema = createIncludeSchema(LOAN_PAYMENT_INCLUDE_OPTIONS);

export const ListLoanPaymentsQuerySchema = createListQuerySchema({
  whereFields: LoanPaymentWhereFieldsSchema,
  sortFields: LOAN_PAYMENT_SORT_FIELDS,
  includeFields: LOAN_PAYMENT_INCLUDE_OPTIONS,
  sortMax: 3,
});

export type ListLoanPaymentsQuery = z.infer<typeof ListLoanPaymentsQuerySchema>;

export const GetLoanPaymentQuerySchema = z.object({
  include: LoanPaymentIncludeSchema,
});

function isValidDecimal(value: string | null | undefined): boolean {
  if (value === null || value === undefined) return false;
  return parseDecimalString(value) !== null;
}

function decimalStringField(message: string) {
  return z
    .string()
    .min(1, message)
    .refine((value) => isValidDecimal(value), { message: 'Valor numerico invalido' });
}

export const LoanPaymentMethodAllocationInputSchema = z.object({
  collectionMethodId: z.number().int().positive(),
  tenderReference: z.string().max(50).nullable().optional(),
  amount: decimalStringField('Valor de forma de pago es requerido').refine(
    (value) => (parseDecimalString(value) ?? 0) > 0,
    {
      message: 'El valor debe ser mayor a cero',
    }
  ),
});

export const CreateLoanPaymentBodySchema = z
  .object({
    receiptTypeId: z.number().int().positive(),
    paymentDate: z.coerce.date(),
    loanId: z.number().int().positive(),
    description: z.string().min(1).max(1000),
    amount: decimalStringField('Valor del abono es requerido').refine(
      (value) => (parseDecimalString(value) ?? 0) > 0,
      {
        message: 'El valor debe ser mayor a cero',
      }
    ),
    glAccountId: z.number().int().positive().optional(),
    overpaidAmount: z.number().int().min(0).optional().default(0),
    note: z.string().max(1000).nullable().optional(),
    loanPaymentMethodAllocations: LoanPaymentMethodAllocationInputSchema.array().min(1),
  })
  .superRefine((value, ctx) => {
    const methods = value.loanPaymentMethodAllocations ?? [];
    const seen = new Set<number>();

    for (const method of methods) {
      if (seen.has(method.collectionMethodId)) {
        ctx.addIssue({
          code: 'custom',
          message: 'No se puede repetir la forma de pago',
          path: ['loanPaymentMethodAllocations'],
        });
        break;
      }
      seen.add(method.collectionMethodId);
    }

    const expected = (parseDecimalString(value.amount) ?? 0) + Number(value.overpaidAmount ?? 0);
    const total = methods.reduce((acc, method) => acc + (parseDecimalString(method.amount) ?? 0), 0);

    if (Math.abs(total - expected) > 0.01) {
      ctx.addIssue({
        code: 'custom',
        message: 'La suma de formas de pago debe ser igual al total recibido (abono + excedente)',
        path: ['loanPaymentMethodAllocations'],
      });
    }
  });

export const VoidLoanPaymentBodySchema = z.object({
  noteStatus: z.string().min(1).max(1000),
});

export const AvailableUserReceiptTypeSchema = z.object({
  assignmentId: z.number().int().positive(),
  paymentReceiptTypeId: z.number().int().positive(),
  name: z.string(),
  movementType: z.enum(PAYMENT_RECEIPT_MOVEMENT_TYPE_OPTIONS),
  isDefault: z.boolean(),
  glAccountId: z.number().int().positive(),
  glAccountName: z.string(),
});

export const AvailableUserReceiptTypesResponseSchema = z.array(AvailableUserReceiptTypeSchema);

export type AvailableUserReceiptType = z.infer<typeof AvailableUserReceiptTypeSchema>;

export type LoanPaymentPaginated = ClientInferResponseBody<Contract['loanPayment']['list'], 200>;
export type LoanPayment = LoanPaymentPaginated['data'][number];

export type LoanPaymentSortField = (typeof LOAN_PAYMENT_SORT_FIELDS)[number];
export type LoanPaymentInclude = (typeof LOAN_PAYMENT_INCLUDE_OPTIONS)[number];
