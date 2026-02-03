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
// SCHEMAS
// ============================================

// ============================================
// WHERE
// ============================================

const DocumentTypeWhereFieldsSchema = z
  .object({
    id: z.union([z.number(), NumberOperatorsSchema]).optional(),
    name: z.union([z.string(), StringOperatorsSchema]).optional(),
    isActive: z.union([z.boolean(), BooleanOperatorsSchema]).optional(),
    createdAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
    updatedAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
  })
  .strict();

// ============================================
// SORT
// ============================================

const DOCUMENT_TYPE_SORT_FIELDS = ['id', 'name', 'isActive', 'createdAt', 'updatedAt'] as const;

// ============================================
// INCLUDE
// ============================================

const DOCUMENT_TYPE_INCLUDE_OPTIONS = ['creditProducts', 'loadApplications'] as const;
const DocumentTypeIncludeSchema = createIncludeSchema(DOCUMENT_TYPE_INCLUDE_OPTIONS);

// ============================================
// QUERY SCHEMAS
// ============================================

export const ListDocumentTypesQuerySchema = createListQuerySchema({
  whereFields: DocumentTypeWhereFieldsSchema,
  sortFields: DOCUMENT_TYPE_SORT_FIELDS,
  includeFields: DOCUMENT_TYPE_INCLUDE_OPTIONS,
  sortMax: 3,
});

export type ListDocumentTypesQuery = z.infer<typeof ListDocumentTypesQuerySchema>;

export const GetDocumentTypeQuerySchema = z.object({
  include: DocumentTypeIncludeSchema,
});

// ============================================
// MUTATIONS
// ============================================

export const CreateDocumentTypeBodySchema = z.object({
  name: z.string().min(1).max(255),
  isActive: z.boolean(),
});

export const UpdateDocumentTypeBodySchema = CreateDocumentTypeBodySchema.partial();

// ============================================
// TYPES
// ============================================

export type DocumentTypePaginated = ClientInferResponseBody<Contract['documentType']['list'], 200>;

export type DocumentType = DocumentTypePaginated['data'][number];

export type DocumentTypeSortField = (typeof DOCUMENT_TYPE_SORT_FIELDS)[number];
export type DocumentTypeInclude = (typeof DOCUMENT_TYPE_INCLUDE_OPTIONS)[number];
