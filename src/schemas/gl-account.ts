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

export const THIRD_PARTY_SETTING_OPTIONS = ['YES', 'NO', 'WITHHOLDING'] as const;
export type ThirdPartySetting = (typeof THIRD_PARTY_SETTING_OPTIONS)[number];

export const ACCOUNT_DETAIL_TYPE_OPTIONS = ['RECEIVABLE', 'PAYABLE', 'NONE'] as const;
export type AccountDetailType = (typeof ACCOUNT_DETAIL_TYPE_OPTIONS)[number];

export const thirdPartySettingLabels: Record<ThirdPartySetting, string> = {
  YES: 'Si',
  NO: 'No',
  WITHHOLDING: 'Retencion',
};

export const accountDetailTypeLabels: Record<AccountDetailType, string> = {
  RECEIVABLE: 'Cobrar',
  PAYABLE: 'Pagar',
  NONE: 'Ninguno',
};

// ============================================
// SCHEMAS
// ============================================

// ============================================
// WHERE
// ============================================

const GlAccountWhereFieldsSchema = z
  .object({
    id: z.union([z.number(), NumberOperatorsSchema]).optional(),
    code: z.union([z.string(), StringOperatorsSchema]).optional(),
    name: z.union([z.string(), StringOperatorsSchema]).optional(),
    thirdPartySetting: z.union([z.enum(THIRD_PARTY_SETTING_OPTIONS), StringOperatorsSchema]).optional(),
    requiresCostCenter: z.union([z.boolean(), BooleanOperatorsSchema]).optional(),
    detailType: z.union([z.enum(ACCOUNT_DETAIL_TYPE_OPTIONS), StringOperatorsSchema]).optional(),
    isBank: z.union([z.boolean(), BooleanOperatorsSchema]).optional(),
    isActive: z.union([z.boolean(), BooleanOperatorsSchema]).optional(),
    createdAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
    updatedAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
  })
  .strict();

// ============================================
// SORT
// ============================================

const GL_ACCOUNT_SORT_FIELDS = ['id', 'code', 'name', 'thirdPartySetting', 'detailType', 'isBank', 'isActive', 'createdAt', 'updatedAt'] as const;

// ============================================
// INCLUDE
// ============================================

const GL_ACCOUNT_INCLUDE_OPTIONS = ['accountingEntries', 'accountingDistributionLines', 'portfolioEntries'] as const;
const GlAccountIncludeSchema = createIncludeSchema(GL_ACCOUNT_INCLUDE_OPTIONS);

// ============================================
// QUERY SCHEMAS
// ============================================

export const ListGlAccountsQuerySchema = createListQuerySchema({
  whereFields: GlAccountWhereFieldsSchema,
  sortFields: GL_ACCOUNT_SORT_FIELDS,
  includeFields: GL_ACCOUNT_INCLUDE_OPTIONS,
  sortMax: 3,
});

export type ListGlAccountsQuery = z.infer<typeof ListGlAccountsQuerySchema>;

export const GetGlAccountQuerySchema = z.object({
  include: GlAccountIncludeSchema,
});

// ============================================
// MUTATIONS
// ============================================

export const CreateGlAccountBodySchema = z.object({
  code: z.string().min(1).max(13),
  name: z.string().min(1).max(255),
  thirdPartySetting: z.enum(THIRD_PARTY_SETTING_OPTIONS),
  requiresCostCenter: z.boolean(),
  detailType: z.enum(ACCOUNT_DETAIL_TYPE_OPTIONS),
  isBank: z.boolean(),
  isActive: z.boolean(),
});

export const UpdateGlAccountBodySchema = CreateGlAccountBodySchema.partial();

// ============================================
// TYPES
// ============================================

export type GlAccountPaginated = ClientInferResponseBody<Contract['glAccount']['list'], 200>;

export type GlAccount = GlAccountPaginated['data'][number];

export type GlAccountSortField = (typeof GL_ACCOUNT_SORT_FIELDS)[number];
export type GlAccountInclude = (typeof GL_ACCOUNT_INCLUDE_OPTIONS)[number];
