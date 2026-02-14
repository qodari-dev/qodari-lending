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

export const PAYMENT_SCHEDULE_MODE_OPTIONS = [
  'INTERVAL_DAYS',
  'MONTHLY_CALENDAR',
  'SEMI_MONTHLY',
] as const;
export type PaymentScheduleMode = (typeof PAYMENT_SCHEDULE_MODE_OPTIONS)[number];

export const paymentScheduleModeLabels: Record<PaymentScheduleMode, string> = {
  INTERVAL_DAYS: 'Intervalo de días',
  MONTHLY_CALENDAR: 'Mensual calendario',
  SEMI_MONTHLY: 'Semimensual',
};

// ============================================
// WHERE
// ============================================

const PaymentFrequencyWhereFieldsSchema = z
  .object({
    id: z.union([z.number(), NumberOperatorsSchema]).optional(),
    name: z.union([z.string(), StringOperatorsSchema]).optional(),
    scheduleMode: z.union([z.enum(PAYMENT_SCHEDULE_MODE_OPTIONS), StringOperatorsSchema]).optional(),
    intervalDays: z.union([z.number(), NumberOperatorsSchema]).optional(),
    dayOfMonth: z.union([z.number(), NumberOperatorsSchema]).optional(),
    semiMonthDay1: z.union([z.number(), NumberOperatorsSchema]).optional(),
    semiMonthDay2: z.union([z.number(), NumberOperatorsSchema]).optional(),
    useEndOfMonthFallback: z.union([z.boolean(), BooleanOperatorsSchema]).optional(),
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
  'scheduleMode',
  'intervalDays',
  'dayOfMonth',
  'semiMonthDay1',
  'semiMonthDay2',
  'useEndOfMonthFallback',
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

const PaymentFrequencyBaseSchema = z.object({
  name: z.string().min(1).max(255),
  scheduleMode: z.enum(PAYMENT_SCHEDULE_MODE_OPTIONS),
  intervalDays: z.number().int().min(1).nullable().optional(),
  dayOfMonth: z.number().int().min(1).max(31).nullable().optional(),
  semiMonthDay1: z.number().int().min(1).max(31).nullable().optional(),
  semiMonthDay2: z.number().int().min(1).max(31).nullable().optional(),
  useEndOfMonthFallback: z.boolean(),
  isActive: z.boolean(),
});

const addPaymentFrequencyValidation = <T extends z.ZodTypeAny>(schema: T) =>
  schema.superRefine((value, ctx) => {
    const data = value as {
      scheduleMode?: PaymentScheduleMode;
      intervalDays?: number | null;
      dayOfMonth?: number | null;
      semiMonthDay1?: number | null;
      semiMonthDay2?: number | null;
    };

    if (!data.scheduleMode) return;

    const hasIntervalDays = data.intervalDays !== null && data.intervalDays !== undefined;
    const hasDayOfMonth = data.dayOfMonth !== null && data.dayOfMonth !== undefined;
    const hasSemiDay1 = data.semiMonthDay1 !== null && data.semiMonthDay1 !== undefined;
    const hasSemiDay2 = data.semiMonthDay2 !== null && data.semiMonthDay2 !== undefined;

    if (data.scheduleMode === 'INTERVAL_DAYS') {
      if (!hasIntervalDays) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Debe indicar intervalo de días para este modo',
          path: ['intervalDays'],
        });
      }
      if (hasDayOfMonth || hasSemiDay1 || hasSemiDay2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'No debe enviar días de calendario para modo por intervalo',
          path: ['scheduleMode'],
        });
      }
    }

    if (data.scheduleMode === 'MONTHLY_CALENDAR') {
      if (!hasDayOfMonth) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Debe indicar día del mes para este modo',
          path: ['dayOfMonth'],
        });
      }
      if (hasIntervalDays || hasSemiDay1 || hasSemiDay2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'No debe enviar campos de intervalo o semimensual para modo mensual',
          path: ['scheduleMode'],
        });
      }
    }

    if (data.scheduleMode === 'SEMI_MONTHLY') {
      if (!hasSemiDay1 || !hasSemiDay2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Debe indicar ambos días para modo semimensual',
          path: ['semiMonthDay1'],
        });
      }
      if (hasIntervalDays || hasDayOfMonth) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'No debe enviar campos de intervalo o mensual para modo semimensual',
          path: ['scheduleMode'],
        });
      }
      if (hasSemiDay1 && hasSemiDay2 && (data.semiMonthDay1 as number) >= (data.semiMonthDay2 as number)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'El primer día semimensual debe ser menor al segundo',
          path: ['semiMonthDay1'],
        });
      }
    }
  });

export const CreatePaymentFrequencyBodySchema = addPaymentFrequencyValidation(
  PaymentFrequencyBaseSchema
);

export const UpdatePaymentFrequencyBodySchema = addPaymentFrequencyValidation(
  PaymentFrequencyBaseSchema.partial()
);

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
