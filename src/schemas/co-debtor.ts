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
    documentType: z.union([z.string(), StringOperatorsSchema]).optional(),
    documentNumber: z.union([z.string(), StringOperatorsSchema]).optional(),
    homeAddress: z.union([z.string(), StringOperatorsSchema]).optional(),
    homeCityCode: z.union([z.string(), StringOperatorsSchema]).optional(),
    homePhone: z.union([z.string(), StringOperatorsSchema]).optional(),
    companyName: z.union([z.string(), StringOperatorsSchema]).optional(),
    workAddress: z.union([z.string(), StringOperatorsSchema]).optional(),
    workCityCode: z.union([z.string(), StringOperatorsSchema]).optional(),
    workPhone: z.union([z.string(), StringOperatorsSchema]).optional(),
    createdAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
    updatedAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
  })
  .strict();

// ============================================
// SORT
// ============================================

const CO_DEBTOR_SORT_FIELDS = ['id', 'documentType', 'documentNumber', 'companyName', 'createdAt', 'updatedAt'] as const;

// ============================================
// INCLUDE
// ============================================

const CO_DEBTOR_INCLUDE_OPTIONS = ['loanApplicationCoDebtors'] as const;
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
  documentType: z.string().min(1).max(10),
  documentNumber: z.string().min(1).max(20),
  homeAddress: z.string().min(1).max(80),
  homeCityCode: z.string().min(1).max(20),
  homePhone: z.string().min(1).max(20),
  companyName: z.string().min(1).max(80),
  workAddress: z.string().min(1).max(80),
  workCityCode: z.string().min(1).max(20),
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
