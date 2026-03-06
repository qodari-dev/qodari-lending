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

export const DOCUMENT_TEMPLATE_STATUS_OPTIONS = ['DRAFT', 'ACTIVE', 'INACTIVE'] as const;
export const DOCUMENT_CONTENT_FORMAT_OPTIONS = ['HTML_HBS', 'PDF_STATIC'] as const;
export const SIGNER_ROLE_OPTIONS = [
  'BORROWER',
  'CO_DEBTOR',
  'SPOUSE',
  'EMPLOYER_REPRESENTATIVE',
  'ENTITY_OFFICER',
] as const;

export const documentTemplateStatusLabels: Record<(typeof DOCUMENT_TEMPLATE_STATUS_OPTIONS)[number], string> =
  {
    DRAFT: 'Borrador',
    ACTIVE: 'Activa',
    INACTIVE: 'Inactiva',
  };

export const documentContentFormatLabels: Record<
  (typeof DOCUMENT_CONTENT_FORMAT_OPTIONS)[number],
  string
> = {
  HTML_HBS: 'HTML/HBS',
  PDF_STATIC: 'PDF estatico',
};

export const signerRoleLabels: Record<(typeof SIGNER_ROLE_OPTIONS)[number], string> = {
  BORROWER: 'Titular',
  CO_DEBTOR: 'Codeudor',
  SPOUSE: 'Conyuge',
  EMPLOYER_REPRESENTATIVE: 'Representante empresa',
  ENTITY_OFFICER: 'Funcionario entidad',
};

const DocumentTemplateWhereFieldsSchema = z
  .object({
    id: z.union([z.number(), NumberOperatorsSchema]).optional(),
    code: z.union([z.string(), StringOperatorsSchema]).optional(),
    name: z.union([z.string(), StringOperatorsSchema]).optional(),
    version: z.union([z.number(), NumberOperatorsSchema]).optional(),
    status: z.union([z.enum(DOCUMENT_TEMPLATE_STATUS_OPTIONS), StringOperatorsSchema]).optional(),
    contentFormat: z
      .union([z.enum(DOCUMENT_CONTENT_FORMAT_OPTIONS), StringOperatorsSchema])
      .optional(),
    createdAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
    updatedAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
  })
  .strict();

const DOCUMENT_TEMPLATE_SORT_FIELDS = [
  'id',
  'code',
  'name',
  'version',
  'status',
  'contentFormat',
  'createdAt',
  'updatedAt',
] as const;

const DOCUMENT_TEMPLATE_INCLUDE_OPTIONS = ['templateSignerRules', 'creditProductDocumentRules'] as const;

const DocumentTemplateIncludeSchema = createIncludeSchema(DOCUMENT_TEMPLATE_INCLUDE_OPTIONS);

export const ListDocumentTemplatesQuerySchema = createListQuerySchema({
  whereFields: DocumentTemplateWhereFieldsSchema,
  sortFields: DOCUMENT_TEMPLATE_SORT_FIELDS,
  includeFields: DOCUMENT_TEMPLATE_INCLUDE_OPTIONS,
  sortMax: 3,
});

export type ListDocumentTemplatesQuery = z.infer<typeof ListDocumentTemplatesQuerySchema>;

export const GetDocumentTemplateQuerySchema = z.object({
  include: DocumentTemplateIncludeSchema,
});

export const DocumentTemplateSignerRuleInputSchema = z.object({
  signerRole: z.enum(SIGNER_ROLE_OPTIONS),
  signOrder: z.number().int().positive(),
  required: z.boolean(),
});

export type DocumentTemplateSignerRuleInput = z.infer<typeof DocumentTemplateSignerRuleInputSchema>;

const DocumentTemplateBaseBodySchema = z.object({
  code: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(180),
  version: z.number().int().positive(),
  status: z.enum(DOCUMENT_TEMPLATE_STATUS_OPTIONS),
  contentFormat: z.enum(DOCUMENT_CONTENT_FORMAT_OPTIONS),
  templateBody: z.string().trim().nullable().optional(),
  templateStorageKey: z.string().trim().nullable().optional(),
  templateSignerRules: z.array(DocumentTemplateSignerRuleInputSchema).default([]),
});

export const CreateDocumentTemplateBodySchema = DocumentTemplateBaseBodySchema.superRefine(
  (value, ctx) => {
    const body = value.templateBody?.trim() ?? '';
    const storageKey = value.templateStorageKey?.trim() ?? '';

    if (value.contentFormat === 'HTML_HBS') {
      if (!body) {
        ctx.addIssue({
          code: 'custom',
          message: 'Template body es obligatorio para HTML/HBS',
          path: ['templateBody'],
        });
      }
      if (storageKey) {
        ctx.addIssue({
          code: 'custom',
          message: 'Template storage key debe estar vacio para HTML/HBS',
          path: ['templateStorageKey'],
        });
      }
    }

    if (value.contentFormat === 'PDF_STATIC') {
      if (!storageKey) {
        ctx.addIssue({
          code: 'custom',
          message: 'Template storage key es obligatorio para PDF estatico',
          path: ['templateStorageKey'],
        });
      }
      if (body) {
        ctx.addIssue({
          code: 'custom',
          message: 'Template body debe estar vacio para PDF estatico',
          path: ['templateBody'],
        });
      }
    }

    const seenOrders = new Set<number>();
    const seenRoles = new Set<string>();
    for (const rule of value.templateSignerRules) {
      if (seenOrders.has(rule.signOrder)) {
        ctx.addIssue({
          code: 'custom',
          message: 'No puede repetir el orden de firma',
          path: ['templateSignerRules'],
        });
        break;
      }
      seenOrders.add(rule.signOrder);

      if (seenRoles.has(rule.signerRole)) {
        ctx.addIssue({
          code: 'custom',
          message: 'No puede repetir el rol de firmante',
          path: ['templateSignerRules'],
        });
        break;
      }
      seenRoles.add(rule.signerRole);
    }
  }
);

export const UpdateDocumentTemplateBodySchema = CreateDocumentTemplateBodySchema;

export type DocumentTemplatePaginated = ClientInferResponseBody<
  Contract['documentTemplate']['list'],
  200
>;

export type DocumentTemplate = DocumentTemplatePaginated['data'][number];

export type DocumentTemplateSortField = (typeof DOCUMENT_TEMPLATE_SORT_FIELDS)[number];
export type DocumentTemplateInclude = (typeof DOCUMENT_TEMPLATE_INCLUDE_OPTIONS)[number];
