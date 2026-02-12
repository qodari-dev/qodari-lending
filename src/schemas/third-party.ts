import { Contract } from '@/server/api/contracts';
import { categoryCodeLabels, CategoryCode, CategoryCodeSchema } from '@/schemas/category';
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

export const PERSON_TYPE_OPTIONS = ['NATURAL', 'LEGAL'] as const;
export type PersonType = (typeof PERSON_TYPE_OPTIONS)[number];

export const SEX_OPTIONS = ['M', 'F'] as const;
export type Sex = (typeof SEX_OPTIONS)[number];

export const TAXPAYER_TYPE_OPTIONS = [
  'STATE_COMPANY',
  'COMMON_REGIME',
  'SIMPLIFIED_REGIME',
  'NO_SALES_REGIME',
  'LARGE_TAXPAYER',
  'NATURAL_PERSON',
  'OTHER',
] as const;
export type TaxpayerType = (typeof TAXPAYER_TYPE_OPTIONS)[number];

export const personTypeLabels: Record<PersonType, string> = {
  NATURAL: 'Persona Natural',
  LEGAL: 'Persona Juridica',
};

export const sexLabels: Record<Sex, string> = {
  M: 'Masculino',
  F: 'Femenino',
};

export const taxpayerTypeLabels: Record<TaxpayerType, string> = {
  STATE_COMPANY: 'Empresa del Estado',
  COMMON_REGIME: 'Regimen Comun',
  SIMPLIFIED_REGIME: 'Regimen Simplificado',
  NO_SALES_REGIME: 'Sin Regimen de Ventas',
  LARGE_TAXPAYER: 'Gran Contribuyente',
  NATURAL_PERSON: 'Persona Natural',
  OTHER: 'Otro',
};

export { categoryCodeLabels };
export type { CategoryCode };

// ============================================
// SCHEMAS
// ============================================

// ============================================
// WHERE
// ============================================

const ThirdPartyWhereFieldsSchema = z
  .object({
    id: z.union([z.number(), NumberOperatorsSchema]).optional(),
    identificationTypeId: z.union([z.number(), NumberOperatorsSchema]).optional(),
    documentNumber: z.union([z.string(), StringOperatorsSchema]).optional(),
    personType: z.union([z.enum(PERSON_TYPE_OPTIONS), StringOperatorsSchema]).optional(),
    firstName: z.union([z.string(), StringOperatorsSchema]).optional(),
    firstLastName: z.union([z.string(), StringOperatorsSchema]).optional(),
    businessName: z.union([z.string(), StringOperatorsSchema]).optional(),
    email: z.union([z.string(), StringOperatorsSchema]).optional(),
    homeAddress: z.union([z.string(), StringOperatorsSchema]).optional(),
    homeCityId: z.union([z.number(), NumberOperatorsSchema]).optional(),
    homePhone: z.union([z.string(), StringOperatorsSchema]).optional(),
    workAddress: z.union([z.string(), StringOperatorsSchema]).optional(),
    workCityId: z.union([z.number(), NumberOperatorsSchema]).optional(),
    workPhone: z.union([z.string(), StringOperatorsSchema]).optional(),
    thirdPartyTypeId: z.union([z.number(), NumberOperatorsSchema]).optional(),
    taxpayerType: z.union([z.enum(TAXPAYER_TYPE_OPTIONS), StringOperatorsSchema]).optional(),
    hasRut: z.union([z.boolean(), BooleanOperatorsSchema]).optional(),
    createdAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
    updatedAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
  })
  .strict();

// ============================================
// SORT
// ============================================

const THIRD_PARTY_SORT_FIELDS = [
  'id',
  'identificationTypeId',
  'documentNumber',
  'personType',
  'firstName',
  'firstLastName',
  'businessName',
  'createdAt',
  'updatedAt',
] as const;

// ============================================
// INCLUDE
// ============================================

const THIRD_PARTY_INCLUDE_OPTIONS = [
  'thirdPartyType',
  'identificationType',
  'homeCity',
  'workCity',
  'loanApplications',
  'loanApplicationCoDebtors',
  'loans',
] as const;
const ThirdPartyIncludeSchema = createIncludeSchema(THIRD_PARTY_INCLUDE_OPTIONS);

// ============================================
// QUERY SCHEMAS
// ============================================

export const ListThirdPartiesQuerySchema = createListQuerySchema({
  whereFields: ThirdPartyWhereFieldsSchema,
  sortFields: THIRD_PARTY_SORT_FIELDS,
  includeFields: THIRD_PARTY_INCLUDE_OPTIONS,
  sortMax: 3,
});

export type ListThirdPartiesQuery = z.infer<typeof ListThirdPartiesQuerySchema>;

export const GetThirdPartyQuerySchema = z.object({
  include: ThirdPartyIncludeSchema,
});

// ============================================
// MUTATIONS
// ============================================

export const CreateThirdPartyBodySchema = z.object({
  identificationTypeId: z.number(),
  documentNumber: z.string().min(1).max(17),
  verificationDigit: z.string().max(1).optional().nullable(),
  personType: z.enum(PERSON_TYPE_OPTIONS),
  representativeIdNumber: z.string().max(15).optional().nullable(),
  firstLastName: z.string().max(20).optional().nullable(),
  secondLastName: z.string().max(15).optional().nullable(),
  firstName: z.string().max(20).optional().nullable(),
  secondName: z.string().max(15).optional().nullable(),
  businessName: z.string().max(60).optional().nullable(),
  sex: z.enum(SEX_OPTIONS).optional().nullable(),
  categoryCode: CategoryCodeSchema,
  homeAddress: z.string().max(80).optional().nullable(),
  homeCityId: z.number().optional().nullable(),
  homePhone: z.string().max(20).optional().nullable(),
  workAddress: z.string().max(80).optional().nullable(),
  workCityId: z.number().optional().nullable(),
  workPhone: z.string().max(20).optional().nullable(),
  mobilePhone: z.string().max(20).optional().nullable(),
  email: z.string().max(60).optional().nullable(),
  thirdPartyTypeId: z.number(),
  taxpayerType: z.enum(TAXPAYER_TYPE_OPTIONS),
  hasRut: z.boolean(),
  employerDocumentNumber: z.string().max(17).optional().nullable(),
  employerBusinessName: z.string().max(200).optional().nullable(),
  note: z.string().max(220).optional().nullable(),
});

export const UpdateThirdPartyBodySchema = CreateThirdPartyBodySchema.partial();

// ============================================
// TYPES
// ============================================

export type ThirdPartyPaginated = ClientInferResponseBody<Contract['thirdParty']['list'], 200>;

export type ThirdParty = ThirdPartyPaginated['data'][number];

export type ThirdPartySortField = (typeof THIRD_PARTY_SORT_FIELDS)[number];
export type ThirdPartyInclude = (typeof THIRD_PARTY_INCLUDE_OPTIONS)[number];
