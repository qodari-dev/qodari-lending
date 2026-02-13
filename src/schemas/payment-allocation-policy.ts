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

export const OVERPAYMENT_HANDLING_OPTIONS = [
  'EXCESS_BALANCE',
  'APPLY_TO_PRINCIPAL',
  'APPLY_TO_FUTURE_INSTALLMENTS',
] as const;

export type OverpaymentHandling = (typeof OVERPAYMENT_HANDLING_OPTIONS)[number];

export const ALLOCATION_SCOPE_OPTIONS = [
  'ONLY_PAST_DUE',
  'PAST_DUE_FIRST',
] as const;

export type AllocationScope = (typeof ALLOCATION_SCOPE_OPTIONS)[number];

export const overpaymentHandlingLabels: Record<OverpaymentHandling, string> = {
  EXCESS_BALANCE: 'Saldo a favor',
  APPLY_TO_PRINCIPAL: 'Aplicar a capital',
  APPLY_TO_FUTURE_INSTALLMENTS: 'Aplicar a cuotas futuras',
};

export const allocationScopeLabels: Record<AllocationScope, string> = {
  ONLY_PAST_DUE: 'Solo vencido',
  PAST_DUE_FIRST: 'Vencido primero',
};

const PaymentAllocationPolicyWhereFieldsSchema = z
  .object({
    id: z.union([z.number(), NumberOperatorsSchema]).optional(),
    name: z.union([z.string(), StringOperatorsSchema]).optional(),
    overpaymentHandling: z
      .union([
        z.enum(OVERPAYMENT_HANDLING_OPTIONS),
        EnumOperatorsSchema(OVERPAYMENT_HANDLING_OPTIONS),
      ])
      .optional(),
    isActive: z.union([z.boolean(), BooleanOperatorsSchema]).optional(),
    createdAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
    updatedAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
  })
  .strict();

const PAYMENT_ALLOCATION_POLICY_SORT_FIELDS = [
  'id',
  'name',
  'overpaymentHandling',
  'isActive',
  'createdAt',
  'updatedAt',
] as const;

const PAYMENT_ALLOCATION_POLICY_INCLUDE_OPTIONS = ['paymentAllocationPolicyRules'] as const;
const PaymentAllocationPolicyIncludeSchema = createIncludeSchema(
  PAYMENT_ALLOCATION_POLICY_INCLUDE_OPTIONS
);

export const ListPaymentAllocationPoliciesQuerySchema = createListQuerySchema({
  whereFields: PaymentAllocationPolicyWhereFieldsSchema,
  sortFields: PAYMENT_ALLOCATION_POLICY_SORT_FIELDS,
  includeFields: PAYMENT_ALLOCATION_POLICY_INCLUDE_OPTIONS,
  sortMax: 3,
});

export type ListPaymentAllocationPoliciesQuery = z.infer<
  typeof ListPaymentAllocationPoliciesQuerySchema
>;

export const GetPaymentAllocationPolicyQuerySchema = z.object({
  include: PaymentAllocationPolicyIncludeSchema,
});

export const PaymentAllocationPolicyRuleInputSchema = z.object({
  priority: z.number().int().min(1),
  billingConceptId: z.number().int().positive(),
  scope: z.enum(ALLOCATION_SCOPE_OPTIONS),
});

export type PaymentAllocationPolicyRuleInput = z.infer<
  typeof PaymentAllocationPolicyRuleInputSchema
>;

const PaymentAllocationPolicyBaseSchema = z.object({
  name: z.string().min(1).max(120),
  overpaymentHandling: z.enum(OVERPAYMENT_HANDLING_OPTIONS),
  isActive: z.boolean(),
  note: z.string().max(255).nullable().optional(),
  paymentAllocationPolicyRules: PaymentAllocationPolicyRuleInputSchema.array().optional(),
});

const addRulesValidation = <T extends z.ZodTypeAny>(schema: T) =>
  schema.superRefine((value, ctx) => {
    const data = value as {
      paymentAllocationPolicyRules?: {
        priority: number;
        billingConceptId: number;
      }[];
    };

    const rules = data.paymentAllocationPolicyRules;
    if (rules === undefined) return;

    if (rules.length === 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'Debe registrar al menos una regla',
        path: ['paymentAllocationPolicyRules'],
      });
      return;
    }

    const prioritySet = new Set<number>();
    const conceptSet = new Set<number>();

    for (const rule of rules) {
      if (prioritySet.has(rule.priority)) {
        ctx.addIssue({
          code: 'custom',
          message: 'No puede repetir la prioridad',
          path: ['paymentAllocationPolicyRules'],
        });
        break;
      }
      prioritySet.add(rule.priority);

      if (conceptSet.has(rule.billingConceptId)) {
        ctx.addIssue({
          code: 'custom',
          message: 'No puede repetir el concepto',
          path: ['paymentAllocationPolicyRules'],
        });
        break;
      }
      conceptSet.add(rule.billingConceptId);
    }
  });

export const CreatePaymentAllocationPolicyBodySchema = addRulesValidation(
  PaymentAllocationPolicyBaseSchema.extend({
    paymentAllocationPolicyRules: PaymentAllocationPolicyRuleInputSchema.array().min(
      1,
      'Debe registrar al menos una regla'
    ),
  })
);

export const UpdatePaymentAllocationPolicyBodySchema = addRulesValidation(
  PaymentAllocationPolicyBaseSchema.partial()
);

export type PaymentAllocationPolicyPaginated = ClientInferResponseBody<
  Contract['paymentAllocationPolicy']['list'],
  200
>;

export type PaymentAllocationPolicy = PaymentAllocationPolicyPaginated['data'][number];

export type PaymentAllocationPolicySortField =
  (typeof PAYMENT_ALLOCATION_POLICY_SORT_FIELDS)[number];

export type PaymentAllocationPolicyInclude =
  (typeof PAYMENT_ALLOCATION_POLICY_INCLUDE_OPTIONS)[number];
