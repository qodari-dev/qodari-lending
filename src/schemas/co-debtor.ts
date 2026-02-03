import { Contract } from '@/server/api/contracts';
import {
  createIncludeSchema,
  createListQuerySchema,
  DateOperatorsSchema,
  NumberOperatorsSchema,
  StringOperatorsSchema,
} from '@/server/utils/query/schemas';
import { ClientInferResponseBody } from '@ts-rest/core';
import { z } from 'zod';

// ============================================
// SCHEMAS
// ============================================

// ============================================
// WHERE
// ============================================

const CoDebtorWhereFieldsSchema = z
  .object({
    id: z.union([z.number(), NumberOperatorsSchema]).optional(),
    identificationTypeId: z.union([z.number(), NumberOperatorsSchema]).optional(),
    documentNumber: z.union([z.string(), StringOperatorsSchema]).optional(),
    homeAddress: z.union([z.string(), StringOperatorsSchema]).optional(),
    homeCityId: z.union([z.number(), NumberOperatorsSchema]).optional(),
    homePhone: z.union([z.string(), StringOperatorsSchema]).optional(),
    companyName: z.union([z.string(), StringOperatorsSchema]).optional(),
    workAddress: z.union([z.string(), StringOperatorsSchema]).optional(),
    workCityId: z.union([z.number(), NumberOperatorsSchema]).optional(),
    workPhone: z.union([z.string(), StringOperatorsSchema]).optional(),
    createdAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
    updatedAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
  })
  .strict();

// ============================================
// SORT
// ============================================

const CO_DEBTOR_SORT_FIELDS = [
  'id',
  'identificationTypeId',
  'documentNumber',
  'companyName',
  'createdAt',
  'updatedAt',
] as const;

// ============================================
// INCLUDE
// ============================================

const CO_DEBTOR_INCLUDE_OPTIONS = [
  'loanApplicationCoDebtors',
  'identificationType',
  'coDebtorsHome',
  'coDebtorsWork',
] as const;
const CoDebtorIncludeSchema = createIncludeSchema(CO_DEBTOR_INCLUDE_OPTIONS);

// ============================================
// QUERY SCHEMAS
// ============================================

export const ListCoDebtorsQuerySchema = createListQuerySchema({
  whereFields: CoDebtorWhereFieldsSchema,
  sortFields: CO_DEBTOR_SORT_FIELDS,
  includeFields: CO_DEBTOR_INCLUDE_OPTIONS,
  sortMax: 3,
});

export type ListCoDebtorsQuery = z.infer<typeof ListCoDebtorsQuerySchema>;

export const GetCoDebtorQuerySchema = z.object({
  include: CoDebtorIncludeSchema,
});

// ============================================
// MUTATIONS
// ============================================

export const CreateCoDebtorBodySchema = z.object({
  identificationTypeId: z.number(),
  documentNumber: z.string().min(1).max(20),
  homeAddress: z.string().min(1).max(80),
  homeCityId: z.number(),
  homePhone: z.string().min(1).max(20),
  companyName: z.string().min(1).max(80),
  workAddress: z.string().min(1).max(80),
  workCityId: z.number(),
  workPhone: z.string().min(1).max(20),
});

export const UpdateCoDebtorBodySchema = CreateCoDebtorBodySchema.partial();

// ============================================
// TYPES
// ============================================

export type CoDebtorPaginated = ClientInferResponseBody<Contract['coDebtor']['list'], 200>;

export type CoDebtor = CoDebtorPaginated['data'][number];

export type CoDebtorSortField = (typeof CO_DEBTOR_SORT_FIELDS)[number];
export type CoDebtorInclude = (typeof CO_DEBTOR_INCLUDE_OPTIONS)[number];
