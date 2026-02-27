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
    billingEmailTo: z.union([z.string(), StringOperatorsSchema]).optional(),
    billingEmailCc: z.union([z.string(), StringOperatorsSchema]).optional(),
    billingEmailTemplateId: z.union([z.number(), NumberOperatorsSchema]).optional(),
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
  'billingEmailTemplateId',
  'startDate',
  'endDate',
  'isActive',
  'statusDate',
  'createdAt',
  'updatedAt',
] as const;

const AGREEMENT_INCLUDE_OPTIONS = [
  'city',
  'billingCycleProfiles',
  'billingEmailTemplate',
  'agreementBillingEmailDispatches',
] as const;
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
  billingEmailTo: z.email().max(255).nullable().optional(),
  billingEmailCc: z.email().max(255).nullable().optional(),
  billingEmailTemplateId: z.number().int().positive().nullable().optional(),
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

export const AGREEMENT_BILLING_EMAIL_DISPATCH_STATUS_OPTIONS = [
  'QUEUED',
  'RUNNING',
  'SENT',
  'FAILED',
] as const;

export const agreementBillingEmailDispatchStatusLabels: Record<
  (typeof AGREEMENT_BILLING_EMAIL_DISPATCH_STATUS_OPTIONS)[number],
  string
> = {
  QUEUED: 'En cola',
  RUNNING: 'En proceso',
  SENT: 'Enviado',
  FAILED: 'Fallido',
};

export const AgreementBillingEmailDispatchSchema = z.object({
  id: z.number().int().positive(),
  agreementId: z.number().int().positive(),
  billingCycleProfileId: z.number().int().positive(),
  billingCycleProfileCycleId: z.number().int().positive(),
  period: z.string(),
  scheduledDate: z.string(),
  status: z.enum(AGREEMENT_BILLING_EMAIL_DISPATCH_STATUS_OPTIONS),
  triggerSource: z.enum(['CRON', 'MANUAL', 'RETRY']),
  attempts: z.number().int().nonnegative(),
  queuedAt: z.string().nullable(),
  startedAt: z.string().nullable(),
  sentAt: z.string().nullable(),
  failedAt: z.string().nullable(),
  resendMessageId: z.string().nullable(),
  lastError: z.string().nullable(),
  createdAt: z.string(),
});

export const ListAgreementBillingEmailDispatchesQuerySchema = z.object({
  limit: z.number().int().positive().max(100).optional(),
});

export const ListAgreementBillingEmailDispatchesResponseSchema = z.object({
  data: z.array(AgreementBillingEmailDispatchSchema),
});

export const RunAgreementBillingEmailsBodySchema = z.object({
  agreementId: z.number().int().positive().nullable().optional(),
  forceResend: z.boolean().optional(),
});

export const RunAgreementBillingEmailsResponseSchema = z.object({
  queuedCount: z.number().int().nonnegative(),
  skippedCount: z.number().int().nonnegative(),
  message: z.string(),
});

export const RetryAgreementBillingEmailDispatchResponseSchema = z.object({
  dispatchId: z.number().int().positive(),
  status: z.enum(['QUEUED']),
  message: z.string(),
});

export type AgreementPaginated = ClientInferResponseBody<Contract['agreement']['list'], 200>;

export type Agreement = AgreementPaginated['data'][number];

export type AgreementSortField = (typeof AGREEMENT_SORT_FIELDS)[number];
export type AgreementInclude = (typeof AGREEMENT_INCLUDE_OPTIONS)[number];
