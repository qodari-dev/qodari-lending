import { db, cities } from '@/server/db';
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

type CityColumn = keyof typeof cities.$inferSelect;

const CITY_FIELDS: FieldMap = {
  id: cities.id,
  code: cities.code,
  name: cities.name,
  isActive: cities.isActive,
  createdAt: cities.createdAt,
  updatedAt: cities.updatedAt,
} satisfies Partial<Record<CityColumn, (typeof cities)[CityColumn]>>;

const CITY_QUERY_CONFIG: QueryConfig = {
  fields: CITY_FIELDS,
  searchFields: [cities.code, cities.name],
  defaultSort: { column: cities.createdAt, order: 'desc' },
};

const CITY_INCLUDES = createIncludeMap<typeof db.query.cities>()({
  thirdPartiesHome: {
    relation: 'thirdPartiesHome',
    config: true,
  },
  thirdPartiesWork: {
    relation: 'thirdPartiesWork',
    config: true,
  },
});

// ============================================
// HANDLER
// ============================================

export const city = tsr.router(contract.city, {
  // ==========================================
  // LIST - GET /cities
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
      } = buildQuery({ page, limit, search, where, sort }, CITY_QUERY_CONFIG);

      console.log('==============================');
      console.log(whereClause);

      const [data, countResult] = await Promise.all([
        db.query.cities.findMany({
          where: whereClause,
          with: buildTypedIncludes(include, CITY_INCLUDES),
          orderBy: orderBy.length ? orderBy : undefined,
          limit: queryLimit,
          offset,
        }),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(cities)
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
        genericMsg: 'Error al listar ciudades',
      });
    }
  },

  // ==========================================
  // GET - GET /cities/:id
  // ==========================================
  getById: async ({ params: { id }, query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const city = await db.query.cities.findFirst({
        where: eq(cities.id, id),
        with: buildTypedIncludes(query?.include, CITY_INCLUDES),
      });

      if (!city) {
        throwHttpError({
          status: 404,
          message: 'not found',
          code: 'NOT_FOUND',
        });
      }

      return { status: 200, body: city };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: `Error al obtener ciudad ${id}`,
      });
    }
  },

  // ==========================================
  // CREATE - POST /cities
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

      const newCity = await db.transaction(async (tx) => {
        const [newCity] = await tx.insert(cities).values(body).returning();

        return newCity;
      });

      logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'create',
        functionName: 'create',
        resourceId: newCity.id.toString(),
        resourceLabel: `${newCity.code} - ${newCity.name}`,
        status: 'success',
        afterValue: {
          ...newCity,
        },
        ipAddress,
        userAgent,
      });

      return { status: 201, body: newCity };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: 'Error al crear ciudad',
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
  // UPDATE - PATCH /cities/:id
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

      const existing = await db.query.cities.findFirst({
        where: eq(cities.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Ciudad con ID ${id} no encontrada`,
          code: 'NOT_FOUND',
        });
      }

      const updated = await db.transaction(async (tx) => {
        const [updated] = await tx.update(cities).set(body).where(eq(cities.id, id)).returning();

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
        genericMsg: `Error al actualizar ciudad ${id}`,
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
  // DELETE - DELETE /cities/:id
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

      const existing = await db.query.cities.findFirst({
        where: eq(cities.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Ciudad con ID ${id} no encontrada`,
          code: 'NOT_FOUND',
        });
      }

      await db.delete(cities).where(eq(cities.id, id));

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
        genericMsg: `Error al eliminar ciudad ${id}`,
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
