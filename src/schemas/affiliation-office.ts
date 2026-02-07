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

const AffiliationOfficeWhereFieldsSchema = z
  .object({
    id: z.union([z.number(), NumberOperatorsSchema]).optional(),
    name: z.union([z.string(), StringOperatorsSchema]).optional(),
    cityId: z.union([z.number(), NumberOperatorsSchema]).optional(),
    address: z.union([z.string(), StringOperatorsSchema]).optional(),
    phone: z.union([z.string(), StringOperatorsSchema]).optional(),
    representativeName: z.union([z.string(), StringOperatorsSchema]).optional(),
    email: z.union([z.string(), StringOperatorsSchema]).optional(),
    costCenterId: z.union([z.number(), NumberOperatorsSchema]).optional(),
    isActive: z.union([z.boolean(), BooleanOperatorsSchema]).optional(),
    createdAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
    updatedAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
  })
  .strict();

// ============================================
// SORT
// ============================================

const AFFILIATION_OFFICE_SORT_FIELDS = [
  'id',
  'name',
  'cityId',
  'address',
  'phone',
  'representativeName',
  'email',
  'costCenterId',
  'isActive',
  'createdAt',
  'updatedAt',
] as const;

// ============================================
// INCLUDE
// ============================================

const AFFILIATION_OFFICE_INCLUDE_OPTIONS = ['city', 'costCenter', 'userAffiliationOffices'] as const;
const AffiliationOfficeIncludeSchema = createIncludeSchema(AFFILIATION_OFFICE_INCLUDE_OPTIONS);

// ============================================
// QUERY SCHEMAS
// ============================================

export const ListAffiliationOfficesQuerySchema = createListQuerySchema({
  whereFields: AffiliationOfficeWhereFieldsSchema,
  sortFields: AFFILIATION_OFFICE_SORT_FIELDS,
  includeFields: AFFILIATION_OFFICE_INCLUDE_OPTIONS,
  sortMax: 3,
});

export type ListAffiliationOfficesQuery = z.infer<typeof ListAffiliationOfficesQuerySchema>;

export const GetAffiliationOfficeQuerySchema = z.object({
  include: AffiliationOfficeIncludeSchema,
});

// ============================================
// MUTATIONS
// ============================================

export const UserAffiliationOfficeInputSchema = z.object({
  userId: z.uuid(),
  userName: z.string().min(1).max(255),
  isPrimary: z.boolean(),
});

export type UserAffiliationOfficeInput = z.infer<typeof UserAffiliationOfficeInputSchema>;

const AffiliationOfficeBaseSchema = z.object({
  name: z.string().min(1).max(255),
  cityId: z.number().int().positive(),
  address: z.string().min(1).max(255),
  phone: z.string().max(20).nullable().optional(),
  representativeName: z.string().min(1).max(255),
  email: z.string().email().max(255).nullable().optional(),
  costCenterId: z.number().int().positive().nullable().optional(),
  isActive: z.boolean(),
  userAffiliationOffices: UserAffiliationOfficeInputSchema.array().optional(),
});

const addUsersValidation = <T extends z.ZodTypeAny>(schema: T) =>
  schema.superRefine((value, ctx) => {
    const data = value as {
      userAffiliationOffices?: {
        userId: string;
        isPrimary: boolean;
      }[];
    };
    const users = data.userAffiliationOffices ?? [];

    if (users.length > 2) {
      ctx.addIssue({
        code: 'custom',
        message: 'No pueden haber mas de dos usuarios',
        path: ['userAffiliationOffices'],
      });
      return;
    }

    const seen = new Set<string>();
    for (const user of users) {
      if (seen.has(user.userId)) {
        ctx.addIssue({
          code: 'custom',
          message: 'No se puede repetir el usuario',
          path: ['userAffiliationOffices'],
        });
        break;
      }
      seen.add(user.userId);
    }

    const primaryCount = users.filter((user) => user.isPrimary).length;
    if (primaryCount > 1) {
      ctx.addIssue({
        code: 'custom',
        message: 'Solo puede haber un usuario principal',
        path: ['userAffiliationOffices'],
      });
    }
  });

export const CreateAffiliationOfficeBodySchema = addUsersValidation(AffiliationOfficeBaseSchema);

export const UpdateAffiliationOfficeBodySchema = addUsersValidation(
  AffiliationOfficeBaseSchema.partial()
);

// ============================================
// TYPES
// ============================================

export type AffiliationOfficePaginated = ClientInferResponseBody<
  Contract['affiliationOffice']['list'],
  200
>;

export type AffiliationOffice = AffiliationOfficePaginated['data'][number];

export type AffiliationOfficeSortField = (typeof AFFILIATION_OFFICE_SORT_FIELDS)[number];
export type AffiliationOfficeInclude = (typeof AFFILIATION_OFFICE_INCLUDE_OPTIONS)[number];
