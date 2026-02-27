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

const BillingEmailTemplateWhereFieldsSchema = z
  .object({
    id: z.union([z.number(), NumberOperatorsSchema]).optional(),
    name: z.union([z.string(), StringOperatorsSchema]).optional(),
    fromEmail: z.union([z.string(), StringOperatorsSchema]).optional(),
    subject: z.union([z.string(), StringOperatorsSchema]).optional(),
    isActive: z.union([z.boolean(), BooleanOperatorsSchema]).optional(),
    createdAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
    updatedAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
  })
  .strict();

const BILLING_EMAIL_TEMPLATE_SORT_FIELDS = [
  'id',
  'name',
  'fromEmail',
  'subject',
  'isActive',
  'createdAt',
  'updatedAt',
] as const;

const BILLING_EMAIL_TEMPLATE_INCLUDE_OPTIONS = ['agreements'] as const;
const BillingEmailTemplateIncludeSchema = createIncludeSchema(BILLING_EMAIL_TEMPLATE_INCLUDE_OPTIONS);

export const ListBillingEmailTemplatesQuerySchema = createListQuerySchema({
  whereFields: BillingEmailTemplateWhereFieldsSchema,
  sortFields: BILLING_EMAIL_TEMPLATE_SORT_FIELDS,
  includeFields: BILLING_EMAIL_TEMPLATE_INCLUDE_OPTIONS,
  sortMax: 3,
});

export type ListBillingEmailTemplatesQuery = z.infer<typeof ListBillingEmailTemplatesQuerySchema>;

export const GetBillingEmailTemplateQuerySchema = z.object({
  include: BillingEmailTemplateIncludeSchema,
});

const BillingEmailTemplateBaseSchema = z.object({
  name: z.string().min(1).max(120),
  fromEmail: z.email().max(255),
  subject: z.string().min(1).max(255),
  htmlContent: z.string().min(1),
  isActive: z.boolean(),
});

export const CreateBillingEmailTemplateBodySchema = BillingEmailTemplateBaseSchema;
export const UpdateBillingEmailTemplateBodySchema = BillingEmailTemplateBaseSchema.partial();

export type BillingEmailTemplatePaginated = ClientInferResponseBody<
  Contract['billingEmailTemplate']['list'],
  200
>;

export type BillingEmailTemplate = BillingEmailTemplatePaginated['data'][number];

export type BillingEmailTemplateSortField = (typeof BILLING_EMAIL_TEMPLATE_SORT_FIELDS)[number];
export type BillingEmailTemplateInclude =
  (typeof BILLING_EMAIL_TEMPLATE_INCLUDE_OPTIONS)[number];
