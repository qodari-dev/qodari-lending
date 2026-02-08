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

const AgreementWhereFieldsSchema = z
  .object({
    id: z.union([z.number(), NumberOperatorsSchema]).optional(),
    agreementCode: z.union([z.string(), StringOperatorsSchema]).optional(),
    documentNumber: z.union([z.string(), StringOperatorsSchema]).optional(),
    businessName: z.union([z.string(), StringOperatorsSchema]).optional(),
    cityId: z.union([z.number(), NumberOperatorsSchema]).optional(),
    address: z.union([z.string(), StringOperatorsSchema]).optional(),
    phone: z.union([z.string(), StringOperatorsSchema]).optional(),
    legalRepresentative: z.union([z.string(), StringOperatorsSchema]).optional(),
    startDate: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
    endDate: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
    note: z.union([z.string(), StringOperatorsSchema]).optional(),
    isActive: z.union([z.boolean(), BooleanOperatorsSchema]).optional(),
    statusDate: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
    createdAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
    updatedAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
  })
  .strict();

const AGREEMENT_SORT_FIELDS = [
  'id',
  'agreementCode',
  'documentNumber',
  'businessName',
  'cityId',
  'startDate',
  'endDate',
  'isActive',
  'statusDate',
  'createdAt',
  'updatedAt',
] as const;

const AGREEMENT_INCLUDE_OPTIONS = ['city', 'billingCycleProfiles'] as const;
const AgreementIncludeSchema = createIncludeSchema(AGREEMENT_INCLUDE_OPTIONS);

export const ListAgreementsQuerySchema = createListQuerySchema({
  whereFields: AgreementWhereFieldsSchema,
  sortFields: AGREEMENT_SORT_FIELDS,
  includeFields: AGREEMENT_INCLUDE_OPTIONS,
  sortMax: 3,
});

export type ListAgreementsQuery = z.infer<typeof ListAgreementsQuerySchema>;

export const GetAgreementQuerySchema = z.object({
  include: AgreementIncludeSchema,
});

const AgreementBaseSchema = z.object({
  agreementCode: z.string().min(1).max(20),
  documentNumber: z.string().min(1).max(17),
  businessName: z.string().min(1).max(80),
  cityId: z.number().int().positive(),
  address: z.string().max(120).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  legalRepresentative: z.string().max(80).nullable().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullable().optional(),
  note: z.string().max(255).nullable().optional(),
  isActive: z.boolean(),
});

const addAgreementValidation = <T extends z.ZodTypeAny>(schema: T) =>
  schema.superRefine((value, ctx) => {
    const data = value as {
      startDate?: Date;
      endDate?: Date | null;
    };

    if (data.startDate && data.endDate && data.endDate < data.startDate) {
      ctx.addIssue({
        code: 'custom',
        message: 'La fecha fin no puede ser menor que la fecha inicio',
        path: ['endDate'],
      });
    }
  });

export const CreateAgreementBodySchema = addAgreementValidation(AgreementBaseSchema);
export const UpdateAgreementBodySchema = addAgreementValidation(AgreementBaseSchema.partial());

export type AgreementPaginated = ClientInferResponseBody<Contract['agreement']['list'], 200>;

export type Agreement = AgreementPaginated['data'][number];

export type AgreementSortField = (typeof AGREEMENT_SORT_FIELDS)[number];
export type AgreementInclude = (typeof AGREEMENT_INCLUDE_OPTIONS)[number];
