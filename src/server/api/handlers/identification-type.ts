import { db, identificationTypes } from '@/server/db';
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

type IdentificationTypeColumn = keyof typeof identificationTypes.$inferSelect;

const IDENTIFICATION_TYPE_FIELDS: FieldMap = {
  id: identificationTypes.id,
  code: identificationTypes.code,
  name: identificationTypes.name,
  isActive: identificationTypes.isActive,
  createdAt: identificationTypes.createdAt,
  updatedAt: identificationTypes.updatedAt,
} satisfies Partial<Record<IdentificationTypeColumn, (typeof identificationTypes)[IdentificationTypeColumn]>>;

const IDENTIFICATION_TYPE_QUERY_CONFIG: QueryConfig = {
  fields: IDENTIFICATION_TYPE_FIELDS,
  searchFields: [identificationTypes.code, identificationTypes.name],
  defaultSort: { column: identificationTypes.createdAt, order: 'desc' },
};

const IDENTIFICATION_TYPE_INCLUDES = createIncludeMap<typeof db.query.identificationTypes>()({
  thirdParties: {
    relation: 'thirdParties',
    config: true,
  },
  insuranceCompanies: {
    relation: 'insuranceCompanies',
    config: true,
  },
  coDebtors: {
    relation: 'coDebtors',
    config: true,
  },
});

// ============================================
// HANDLER
// ============================================

export const identificationType = tsr.router(contract.identificationType, {
  // ==========================================
  // LIST - GET /identification-types
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
      } = buildQuery({ page, limit, search, where, sort }, IDENTIFICATION_TYPE_QUERY_CONFIG);

      const [data, countResult] = await Promise.all([
        db.query.identificationTypes.findMany({
          where: whereClause,
          with: buildTypedIncludes(include, IDENTIFICATION_TYPE_INCLUDES),
          orderBy: orderBy.length ? orderBy : undefined,
          limit: queryLimit,
          offset,
        }),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(identificationTypes)
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
        genericMsg: 'Error al listar tipos de identificación',
      });
    }
  },

  // ==========================================
  // GET - GET /identification-types/:id
  // ==========================================
  getById: async ({ params: { id }, query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const identificationType = await db.query.identificationTypes.findFirst({
        where: eq(identificationTypes.id, id),
        with: buildTypedIncludes(query?.include, IDENTIFICATION_TYPE_INCLUDES),
      });

      if (!identificationType) {
        throwHttpError({
          status: 404,
          message: 'not found',
          code: 'NOT_FOUND',
        });
      }

      return { status: 200, body: identificationType };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: `Error al obtener tipo de identificación ${id}`,
      });
    }
  },

  // ==========================================
  // CREATE - POST /identification-types
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

      const newIdentificationType = await db.transaction(async (tx) => {
        const [newIdentificationType] = await tx.insert(identificationTypes).values(body).returning();

        return newIdentificationType;
      });

      logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'create',
        functionName: 'create',
        resourceId: newIdentificationType.id.toString(),
        resourceLabel: `${newIdentificationType.code} - ${newIdentificationType.name}`,
        status: 'success',
        afterValue: {
          ...newIdentificationType,
        },
        ipAddress,
        userAgent,
      });

      return { status: 201, body: newIdentificationType };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: 'Error al crear tipo de identificación',
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
  // UPDATE - PATCH /identification-types/:id
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

      const existing = await db.query.identificationTypes.findFirst({
        where: eq(identificationTypes.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Tipo de identificación con ID ${id} no encontrado`,
          code: 'NOT_FOUND',
        });
      }

      const updated = await db.transaction(async (tx) => {
        const [updated] = await tx
          .update(identificationTypes)
          .set(body)
          .where(eq(identificationTypes.id, id))
          .returning();

        return updated;
      });

      logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'update',
        resourceId: existing.id.toString(),
        resourceLabel: `${existing.code} - ${existing.name}`,
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
        genericMsg: `Error al actualizar tipo de identificación ${id}`,
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
  // DELETE - DELETE /identification-types/:id
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

      const existing = await db.query.identificationTypes.findFirst({
        where: eq(identificationTypes.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Tipo de identificación con ID ${id} no encontrado`,
          code: 'NOT_FOUND',
        });
      }

      await db.delete(identificationTypes).where(eq(identificationTypes.id, id));

      logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'delete',
        functionName: 'delete',
        resourceId: existing.id.toString(),
        resourceLabel: `${existing.code} - ${existing.name}`,
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
        genericMsg: `Error al eliminar tipo de identificación ${id}`,
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
