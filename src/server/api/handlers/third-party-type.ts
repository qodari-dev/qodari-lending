import { db, thirdPartyTypes } from '@/server/db';
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

type ThirdPartyTypeColumn = keyof typeof thirdPartyTypes.$inferSelect;

const THIRD_PARTY_TYPE_FIELDS: FieldMap = {
  id: thirdPartyTypes.id,
  name: thirdPartyTypes.name,
  createdAt: thirdPartyTypes.createdAt,
  updatedAt: thirdPartyTypes.updatedAt,
} satisfies Partial<Record<ThirdPartyTypeColumn, (typeof thirdPartyTypes)[ThirdPartyTypeColumn]>>;

const THIRD_PARTY_TYPE_QUERY_CONFIG: QueryConfig = {
  fields: THIRD_PARTY_TYPE_FIELDS,
  searchFields: [thirdPartyTypes.name],
  defaultSort: { column: thirdPartyTypes.createdAt, order: 'desc' },
};

const THIRD_PARTY_TYPE_INCLUDES = createIncludeMap<typeof db.query.thirdPartyTypes>()({
  thirdParties: {
    relation: 'thirdParties',
    config: true,
  },
});

// ============================================
// HANDLER
// ============================================

export const thirdPartyType = tsr.router(contract.thirdPartyType, {
  // ==========================================
  // LIST - GET /third-party-types
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
      } = buildQuery({ page, limit, search, where, sort }, THIRD_PARTY_TYPE_QUERY_CONFIG);

      const [data, countResult] = await Promise.all([
        db.query.thirdPartyTypes.findMany({
          where: whereClause,
          with: buildTypedIncludes(include, THIRD_PARTY_TYPE_INCLUDES),
          orderBy: orderBy.length ? orderBy : undefined,
          limit: queryLimit,
          offset,
        }),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(thirdPartyTypes)
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
        genericMsg: 'Error al listar tipos de tercero',
      });
    }
  },

  // ==========================================
  // GET - GET /third-party-types/:id
  // ==========================================
  getById: async ({ params: { id }, query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const thirdPartyType = await db.query.thirdPartyTypes.findFirst({
        where: eq(thirdPartyTypes.id, id),
        with: buildTypedIncludes(query?.include, THIRD_PARTY_TYPE_INCLUDES),
      });

      if (!thirdPartyType) {
        throwHttpError({
          status: 404,
          message: 'not found',
          code: 'NOT_FOUND',
        });
      }

      return { status: 200, body: thirdPartyType };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: `Error al obtener tipo de tercero ${id}`,
      });
    }
  },

  // ==========================================
  // CREATE - POST /third-party-types
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

      const newThirdPartyType = await db.transaction(async (tx) => {
        const [newThirdPartyType] = await tx.insert(thirdPartyTypes).values(body).returning();

        return newThirdPartyType;
      });

      logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'create',
        functionName: 'create',
        resourceId: newThirdPartyType.id.toString(),
        resourceLabel: `${newThirdPartyType.name}`,
        status: 'success',
        afterValue: {
          ...newThirdPartyType,
        },
        ipAddress,
        userAgent,
      });

      return { status: 201, body: newThirdPartyType };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: 'Error al crear tipo de tercero',
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
  // UPDATE - PATCH /third-party-types/:id
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

      const existing = await db.query.thirdPartyTypes.findFirst({
        where: eq(thirdPartyTypes.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Tipo de tercero con ID ${id} no encontrado`,
          code: 'NOT_FOUND',
        });
      }

      const updated = await db.transaction(async (tx) => {
        const [updated] = await tx
          .update(thirdPartyTypes)
          .set(body)
          .where(eq(thirdPartyTypes.id, id))
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
        genericMsg: `Error al actualizar tipo de tercero ${id}`,
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
  // DELETE - DELETE /third-party-types/:id
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

      const existing = await db.query.thirdPartyTypes.findFirst({
        where: eq(thirdPartyTypes.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Tipo de tercero con ID ${id} no encontrado`,
          code: 'NOT_FOUND',
        });
      }

      await db.delete(thirdPartyTypes).where(eq(thirdPartyTypes.id, id));

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
        genericMsg: `Error al eliminar tipo de tercero ${id}`,
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
