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

export const WEEKEND_POLICY_OPTIONS = [
  'KEEP',
  'PREVIOUS_BUSINESS_DAY',
  'NEXT_BUSINESS_DAY',
] as const;

export type WeekendPolicy = (typeof WEEKEND_POLICY_OPTIONS)[number];

export const weekendPolicyLabels: Record<WeekendPolicy, string> = {
  KEEP: 'Mantener fecha',
  PREVIOUS_BUSINESS_DAY: 'Dia habil anterior',
  NEXT_BUSINESS_DAY: 'Dia habil siguiente',
};

const BillingCycleProfileWhereFieldsSchema = z
  .object({
    id: z.union([z.number(), NumberOperatorsSchema]).optional(),
    name: z.union([z.string(), StringOperatorsSchema]).optional(),
    creditProductId: z.union([z.number(), NumberOperatorsSchema]).optional(),
    agreementId: z.union([z.number(), NumberOperatorsSchema]).optional(),
    cyclesPerMonth: z.union([z.number(), NumberOperatorsSchema]).optional(),
    weekendPolicy: z
      .union([z.enum(WEEKEND_POLICY_OPTIONS), EnumOperatorsSchema(WEEKEND_POLICY_OPTIONS)])
      .optional(),
    isActive: z.union([z.boolean(), BooleanOperatorsSchema]).optional(),
    createdAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
    updatedAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
  })
  .strict();

const BILLING_CYCLE_PROFILE_SORT_FIELDS = [
  'id',
  'name',
  'creditProductId',
  'agreementId',
  'cyclesPerMonth',
  'weekendPolicy',
  'isActive',
  'createdAt',
  'updatedAt',
] as const;

const BILLING_CYCLE_PROFILE_INCLUDE_OPTIONS = [
  'creditProduct',
  'agreement',
  'billingCycleProfileCycles',
] as const;

const BillingCycleProfileIncludeSchema = createIncludeSchema(BILLING_CYCLE_PROFILE_INCLUDE_OPTIONS);

export const ListBillingCycleProfilesQuerySchema = createListQuerySchema({
  whereFields: BillingCycleProfileWhereFieldsSchema,
  sortFields: BILLING_CYCLE_PROFILE_SORT_FIELDS,
  includeFields: BILLING_CYCLE_PROFILE_INCLUDE_OPTIONS,
  sortMax: 3,
});

export type ListBillingCycleProfilesQuery = z.infer<typeof ListBillingCycleProfilesQuerySchema>;

export const GetBillingCycleProfileQuerySchema = z.object({
  include: BillingCycleProfileIncludeSchema,
});

export const BillingCycleProfileCycleInputSchema = z.object({
  cycleInMonth: z.number().int().min(1),
  cutoffDay: z.number().int().min(1).max(31),
  runDay: z.number().int().min(1).max(31),
  expectedPayDay: z.number().int().min(1).max(31).nullable().optional(),
  isActive: z.boolean(),
});

export type BillingCycleProfileCycleInput = z.infer<typeof BillingCycleProfileCycleInputSchema>;

const BillingCycleProfileBaseSchema = z.object({
  name: z.string().min(1).max(150),
  creditProductId: z.number().int().positive(),
  agreementId: z.number().int().positive().nullable().optional(),
  cyclesPerMonth: z.number().int().min(1),
  weekendPolicy: z.enum(WEEKEND_POLICY_OPTIONS),
  isActive: z.boolean(),
  billingCycleProfileCycles: BillingCycleProfileCycleInputSchema.array().min(
    1,
    'Debe registrar al menos un ciclo'
  ),
});

const addCyclesValidation = <T extends z.ZodTypeAny>(schema: T) =>
  schema.superRefine((value, ctx) => {
    const data = value as {
      cyclesPerMonth?: number;
      billingCycleProfileCycles?: {
        cycleInMonth: number;
      }[];
    };

    const cycles = data.billingCycleProfileCycles ?? [];

    if (cycles.length === 0) return;

    const seen = new Set<number>();

    for (const cycle of cycles) {
      if (seen.has(cycle.cycleInMonth)) {
        ctx.addIssue({
          code: 'custom',
          message: 'No puede repetir el numero de ciclo dentro del mes',
          path: ['billingCycleProfileCycles'],
        });
        break;
      }

      if (data.cyclesPerMonth !== undefined && cycle.cycleInMonth > data.cyclesPerMonth) {
        ctx.addIssue({
          code: 'custom',
          message: 'El numero de ciclo no puede ser mayor al numero de ciclos por mes',
          path: ['billingCycleProfileCycles'],
        });
        break;
      }

      seen.add(cycle.cycleInMonth);
    }

    if (data.cyclesPerMonth !== undefined && cycles.length !== data.cyclesPerMonth) {
      ctx.addIssue({
        code: 'custom',
        message: 'La cantidad de ciclos debe coincidir con ciclos por mes',
        path: ['billingCycleProfileCycles'],
      });
    }
  });

export const CreateBillingCycleProfileBodySchema = addCyclesValidation(BillingCycleProfileBaseSchema);

export const UpdateBillingCycleProfileBodySchema = addCyclesValidation(
  BillingCycleProfileBaseSchema.partial()
);

export type BillingCycleProfilePaginated = ClientInferResponseBody<
  Contract['billingCycleProfile']['list'],
  200
>;

export type BillingCycleProfile = BillingCycleProfilePaginated['data'][number];

export type BillingCycleProfileSortField = (typeof BILLING_CYCLE_PROFILE_SORT_FIELDS)[number];
export type BillingCycleProfileInclude =
  (typeof BILLING_CYCLE_PROFILE_INCLUDE_OPTIONS)[number];
