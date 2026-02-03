import { db, documentTypes } from '@/server/db';
import { genericTsRestErrorResponse, throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { tsr } from '@ts-rest/serverless/next';
import { eq, sql } from 'drizzle-orm';
import { contract } from '../contracts';

import { logAudit } from '@/server/utils/audit-logger';
import { UnifiedAuthContext } from '@/server/utils/auth-context';
import { getClientIp } from '@/server/utils/get-client-ip';
import { buildTypedIncludes, createIncludeMap } from '@/server/utils/query/include-builder';
import {
  buildPaginationMeta,
  buildQuery,
  FieldMap,
  QueryConfig,
} from '@/server/utils/query/query-builder';

// ============================================
// CONFIG
// ============================================

type DocumentTypeColumn = keyof typeof documentTypes.$inferSelect;

const DOCUMENT_TYPE_FIELDS: FieldMap = {
  id: documentTypes.id,
  name: documentTypes.name,
  isActive: documentTypes.isActive,
  createdAt: documentTypes.createdAt,
  updatedAt: documentTypes.updatedAt,
} satisfies Partial<Record<DocumentTypeColumn, (typeof documentTypes)[DocumentTypeColumn]>>;

const DOCUMENT_TYPE_QUERY_CONFIG: QueryConfig = {
  fields: DOCUMENT_TYPE_FIELDS,
  searchFields: [documentTypes.name],
  defaultSort: { column: documentTypes.createdAt, order: 'desc' },
};

const DOCUMENT_TYPE_INCLUDES = createIncludeMap<typeof db.query.documentTypes>()({
  creditProducts: {
    relation: 'creditProductRequiredDocuments',
    config: {
      with: {
        creditProduct: true,
      },
    },
  },
  loadApplications: {
    relation: 'loanApplicationDocuments',
    config: {
      with: {
        loanApplication: true,
      },
    },
  },
});

// ============================================
// HANDLER
// ============================================

export const documentType = tsr.router(contract.documentType, {
  // ==========================================
  // LIST - GET /document-types
  // ==========================================
  list: async ({ query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const { page, limit, search, where, sort, include } = query;

      const {
        whereClause,
        orderBy,
        limit: queryLimit,
        offset,
      } = buildQuery({ page, limit, search, where, sort }, DOCUMENT_TYPE_QUERY_CONFIG);

      const [data, countResult] = await Promise.all([
        db.query.documentTypes.findMany({
          where: whereClause,
          with: buildTypedIncludes(include, DOCUMENT_TYPE_INCLUDES),
          orderBy: orderBy.length ? orderBy : undefined,
          limit: queryLimit,
          offset,
        }),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(documentTypes)
          .where(whereClause),
      ]);

      const totalCount = countResult[0]?.count ?? 0;
      const response = {
        status: 200 as const,
        body: {
          data,
          meta: buildPaginationMeta(totalCount, page, limit),
        },
      };
      return response;
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: 'Error al listar tipos de documento',
      });
    }
  },

  // ==========================================
  // GET - GET /document-types/:id
  // ==========================================
  getById: async ({ params: { id }, query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const documentType = await db.query.documentTypes.findFirst({
        where: eq(documentTypes.id, id),
        with: buildTypedIncludes(query?.include, DOCUMENT_TYPE_INCLUDES),
      });

      if (!documentType) {
        throwHttpError({
          status: 404,
          message: 'not found',
          code: 'NOT_FOUND',
        });
      }

      return { status: 200, body: documentType };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: `Error al obtener tipo de documento ${id}`,
      });
    }
  },

  // ==========================================
  // CREATE - POST /document-types
  // ==========================================
  create: async ({ body }, { request, appRoute, nextRequest }) => {
    let session: UnifiedAuthContext | undefined;
    const ipAddress = getClientIp(nextRequest);
    const userAgent = nextRequest.headers.get('user-agent');
    try {
      session = await getAuthContextAndValidatePermission(request, appRoute.metadata);
      if (!session) {
        throwHttpError({
          status: 401,
          message: 'Not authenticated',
          code: 'UNAUTHENTICATED',
        });
      }

      const newDocumentType = await db.transaction(async (tx) => {
        const [newDocumentType] = await tx.insert(documentTypes).values(body).returning();

        return newDocumentType;
      });

      logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'create',
        functionName: 'create',
        resourceId: newDocumentType.id.toString(),
        resourceLabel: `${newDocumentType.name}`,
        status: 'success',
        afterValue: {
          ...newDocumentType,
        },
        ipAddress,
        userAgent,
      });

      return { status: 201, body: newDocumentType };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: 'Error al crear tipo de documento',
      });
      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'create',
        functionName: 'create',
        status: 'failure',
        errorMessage: error?.body.message,
        metadata: {
          body,
        },
        ipAddress,
        userAgent,
      });
      return error;
    }
  },

  // ==========================================
  // UPDATE - PATCH /document-types/:id
  // ==========================================
  update: async ({ params: { id }, body }, { request, appRoute, nextRequest }) => {
    let session: UnifiedAuthContext | undefined;
    const ipAddress = getClientIp(nextRequest);
    const userAgent = nextRequest.headers.get('user-agent');
    try {
      session = await getAuthContextAndValidatePermission(request, appRoute.metadata);
      if (!session) {
        throwHttpError({
          status: 401,
          message: 'Not authenticated',
          code: 'UNAUTHENTICATED',
        });
      }

      const existing = await db.query.documentTypes.findFirst({
        where: eq(documentTypes.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Document con ID ${id} no encontrado`,
          code: 'NOT_FOUND',
        });
      }

      const updated = await db.transaction(async (tx) => {
        const [updated] = await tx
          .update(documentTypes)
          .set(body)
          .where(eq(documentTypes.id, id))
          .returning();

        return updated;
      });

      logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'update',
        resourceId: existing.id.toString(),
        resourceLabel: `${existing.name}`,
        status: 'success',
        beforeValue: {
          ...existing,
        },
        afterValue: {
          ...updated,
        },
        ipAddress,
        userAgent,
      });

      return { status: 200, body: updated };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: `Error al actualizar tipo de documento ${id}`,
      });
      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'update',
        resourceId: id.toString(),
        status: 'failure',
        errorMessage: error?.body.message,
        metadata: {
          body,
        },
        ipAddress,
        userAgent,
      });
      return error;
    }
  },

  // ==========================================
  // DELETE - DELETE /document-types/:id
  // ==========================================
  delete: async ({ params: { id } }, { request, appRoute, nextRequest }) => {
    let session: UnifiedAuthContext | undefined;
    const ipAddress = getClientIp(nextRequest);
    const userAgent = nextRequest.headers.get('user-agent');
    try {
      session = await getAuthContextAndValidatePermission(request, appRoute.metadata);
      if (!session) {
        throwHttpError({
          status: 401,
          message: 'Not authenticated',
          code: 'UNAUTHENTICATED',
        });
      }

      const existing = await db.query.documentTypes.findFirst({
        where: eq(documentTypes.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Documento con ID ${id} no encontrado`,
          code: 'NOT_FOUND',
        });
      }

      await db.delete(documentTypes).where(eq(documentTypes.id, id));

      logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'delete',
        functionName: 'delete',
        resourceId: existing.id.toString(),
        resourceLabel: `${existing.name}`,
        status: 'success',
        beforeValue: {
          ...existing,
        },
        ipAddress,
        userAgent,
      });

      return {
        status: 200,
        body: existing,
      };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: `Error al eliminar tipo de documento ${id}`,
      });
      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'delete',
        functionName: 'delete',
        resourceId: id.toString(),
        status: 'failure',
        errorMessage: error?.body.message,
        ipAddress,
        userAgent,
      });
      return error;
    }
  },
});
