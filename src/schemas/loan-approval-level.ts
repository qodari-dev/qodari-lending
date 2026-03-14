import { Contract } from '@/server/api/contracts';
import { isValidDecimal } from '@/schemas/shared';
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

const LoanApprovalLevelWhereFieldsSchema = z
  .object({
    id: z.union([z.number(), NumberOperatorsSchema]).optional(),
    name: z.union([z.string(), StringOperatorsSchema]).optional(),
    levelOrder: z.union([z.number(), NumberOperatorsSchema]).optional(),
    isActive: z.union([z.boolean(), BooleanOperatorsSchema]).optional(),
    createdAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
    updatedAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
  })
  .strict();

const LOAN_APPROVAL_LEVEL_SORT_FIELDS = [
  'id',
  'name',
  'levelOrder',
  'isActive',
  'createdAt',
  'updatedAt',
] as const;

const LOAN_APPROVAL_LEVEL_INCLUDE_OPTIONS = ['users'] as const;
const LoanApprovalLevelIncludeSchema = createIncludeSchema(LOAN_APPROVAL_LEVEL_INCLUDE_OPTIONS);

export const ListLoanApprovalLevelsQuerySchema = createListQuerySchema({
  whereFields: LoanApprovalLevelWhereFieldsSchema,
  sortFields: LOAN_APPROVAL_LEVEL_SORT_FIELDS,
  includeFields: LOAN_APPROVAL_LEVEL_INCLUDE_OPTIONS,
  sortMax: 3,
});

export type ListLoanApprovalLevelsQuery = z.infer<typeof ListLoanApprovalLevelsQuerySchema>;

export const GetLoanApprovalLevelQuerySchema = z.object({
  include: LoanApprovalLevelIncludeSchema,
});

export const LoanApprovalLevelUserInputSchema = z.object({
  userId: z.uuid(),
  userName: z.string().min(1).max(255),
  sortOrder: z.number().int().min(1, 'El orden del usuario debe ser mayor o igual a 1').default(1),
  isActive: z.boolean().default(true),
});

export type LoanApprovalLevelUserInput = z.infer<typeof LoanApprovalLevelUserInputSchema>;

const LoanApprovalLevelBaseSchema = z.object({
  name: z.string().min(1).max(100),
  levelOrder: z.number().int().positive(),
  maxApprovalAmount: z
    .string()
    .refine((value) => isValidDecimal(value) && Number(value) > 0, {
      message: 'Tope de monto invalido',
    })
    .nullable()
    .optional(),
  isActive: z.boolean(),
  users: z.array(LoanApprovalLevelUserInputSchema).min(1, 'Debe agregar al menos un usuario'),
});

export const CreateLoanApprovalLevelBodySchema = LoanApprovalLevelBaseSchema.superRefine(
  (value, ctx) => {
    const userIds = new Set<string>();
    const sortOrders = new Set<number>();
    for (const user of value.users) {
      if (userIds.has(user.userId)) {
        ctx.addIssue({
          code: 'custom',
          message: 'No puede repetir el mismo usuario',
          path: ['users'],
        });
        break;
      }
      userIds.add(user.userId);

      if (sortOrders.has(user.sortOrder)) {
        ctx.addIssue({
          code: 'custom',
          message: 'No puede repetir el orden de usuario dentro del nivel',
          path: ['users'],
        });
        break;
      }
      sortOrders.add(user.sortOrder);
    }

    const hasActiveUser = value.users.some((user) => user.isActive);
    if (!hasActiveUser) {
      ctx.addIssue({
        code: 'custom',
        message: 'Debe tener al menos un usuario activo',
        path: ['users'],
      });
    }
  }
);

export const UpdateLoanApprovalLevelBodySchema = LoanApprovalLevelBaseSchema.partial().superRefine(
  (value, ctx) => {
    if (!value.users) return;

    const userIds = new Set<string>();
    const sortOrders = new Set<number>();
    for (const user of value.users) {
      if (userIds.has(user.userId)) {
        ctx.addIssue({
          code: 'custom',
          message: 'No puede repetir el mismo usuario',
          path: ['users'],
        });
        break;
      }
      userIds.add(user.userId);

      if (sortOrders.has(user.sortOrder)) {
        ctx.addIssue({
          code: 'custom',
          message: 'No puede repetir el orden de usuario dentro del nivel',
          path: ['users'],
        });
        break;
      }
      sortOrders.add(user.sortOrder);
    }
  }
);

export type LoanApprovalLevelPaginated = ClientInferResponseBody<
  Contract['loanApprovalLevel']['list'],
  200
>;

export type LoanApprovalLevel = LoanApprovalLevelPaginated['data'][number];

export type LoanApprovalLevelSortField = (typeof LOAN_APPROVAL_LEVEL_SORT_FIELDS)[number];
export type LoanApprovalLevelInclude = (typeof LOAN_APPROVAL_LEVEL_INCLUDE_OPTIONS)[number];
