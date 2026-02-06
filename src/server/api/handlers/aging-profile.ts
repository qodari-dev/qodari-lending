import { db, agingProfiles, agingBuckets } from '@/server/db';
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

type AgingProfileColumn = keyof typeof agingProfiles.$inferSelect;

const AGING_PROFILE_FIELDS: FieldMap = {
  id: agingProfiles.id,
  name: agingProfiles.name,
  isActive: agingProfiles.isActive,
  createdAt: agingProfiles.createdAt,
  updatedAt: agingProfiles.updatedAt,
} satisfies Partial<Record<AgingProfileColumn, (typeof agingProfiles)[AgingProfileColumn]>>;

const AGING_PROFILE_QUERY_CONFIG: QueryConfig = {
  fields: AGING_PROFILE_FIELDS,
  searchFields: [agingProfiles.name],
  defaultSort: { column: agingProfiles.createdAt, order: 'desc' },
};

const AGING_PROFILE_INCLUDES = createIncludeMap<typeof db.query.agingProfiles>()({
  agingBuckets: {
    relation: 'agingBuckets',
    config: true,
  },
});

// ============================================
// HANDLER
// ============================================

export const agingProfile = tsr.router(contract.agingProfile, {
  // ==========================================
  // LIST - GET /aging-profiles
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
      } = buildQuery({ page, limit, search, where, sort }, AGING_PROFILE_QUERY_CONFIG);

      const [data, countResult] = await Promise.all([
        db.query.agingProfiles.findMany({
          where: whereClause,
          with: buildTypedIncludes(include, AGING_PROFILE_INCLUDES),
          orderBy: orderBy.length ? orderBy : undefined,
          limit: queryLimit,
          offset,
        }),
        db.select({ count: sql<number>`count(*)::int` }).from(agingProfiles).where(whereClause),
      ]);

      const totalCount = countResult[0]?.count ?? 0;
      return {
        status: 200 as const,
        body: {
          data,
          meta: buildPaginationMeta(totalCount, page, limit),
        },
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: 'Error al listar perfiles de aging',
      });
    }
  },

  // ==========================================
  // GET - GET /aging-profiles/:id
  // ==========================================
  getById: async ({ params: { id }, query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const profile = await db.query.agingProfiles.findFirst({
        where: eq(agingProfiles.id, id),
        with: buildTypedIncludes(query?.include, AGING_PROFILE_INCLUDES),
      });

      if (!profile) {
        throwHttpError({
          status: 404,
          message: 'not found',
          code: 'NOT_FOUND',
        });
      }

      return { status: 200, body: profile };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: `Error al obtener perfil de aging ${id}`,
      });
    }
  },

  // ==========================================
  // CREATE - POST /aging-profiles
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

      const { agingBuckets: bucketsData, ...profileData } = body;

      const [created] = await db.transaction(async (tx) => {
        const [profile] = await tx.insert(agingProfiles).values(profileData).returning();

        if (bucketsData?.length) {
          await tx.insert(agingBuckets).values(
            bucketsData.map((bucket) => ({
              ...bucket,
              agingProfileId: profile.id,
            }))
          );
        }

        return [profile];
      });

      logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'create',
        functionName: 'create',
        resourceId: created.id.toString(),
        resourceLabel: created.name,
        status: 'success',
        afterValue: {
          ...created,
          _agingBuckets: bucketsData ?? [],
        },
        ipAddress,
        userAgent,
      });

      return { status: 201, body: created };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: 'Error al crear perfil de aging',
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
  // UPDATE - PATCH /aging-profiles/:id
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

      const existing = await db.query.agingProfiles.findFirst({
        where: eq(agingProfiles.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Perfil de aging con ID ${id} no encontrado`,
          code: 'NOT_FOUND',
        });
      }

      const existingBuckets = await db.query.agingBuckets.findMany({
        where: eq(agingBuckets.agingProfileId, id),
      });

      const { agingBuckets: bucketsData, ...profileData } = body;

      const [updated] = await db.transaction(async (tx) => {
        const [profileUpdated] = await tx
          .update(agingProfiles)
          .set(profileData)
          .where(eq(agingProfiles.id, id))
          .returning();

        if (bucketsData) {
          await tx.delete(agingBuckets).where(eq(agingBuckets.agingProfileId, id));

          if (bucketsData.length) {
            await tx.insert(agingBuckets).values(
              bucketsData.map((bucket) => ({
                ...bucket,
                agingProfileId: id,
              }))
            );
          }
        }

        return [profileUpdated];
      });

      logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'update',
        resourceId: existing.id.toString(),
        resourceLabel: existing.name,
        status: 'success',
        beforeValue: {
          ...existing,
          _agingBuckets: existingBuckets,
        },
        afterValue: {
          ...updated,
          _agingBuckets: bucketsData ?? existingBuckets,
        },
        ipAddress,
        userAgent,
      });

      return { status: 200, body: updated };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: `Error al actualizar perfil de aging ${id}`,
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
  // DELETE - DELETE /aging-profiles/:id
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

      const existing = await db.query.agingProfiles.findFirst({
        where: eq(agingProfiles.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Perfil de aging con ID ${id} no encontrado`,
          code: 'NOT_FOUND',
        });
      }

      const existingBuckets = await db.query.agingBuckets.findMany({
        where: eq(agingBuckets.agingProfileId, id),
      });

      const [deleted] = await db.delete(agingProfiles).where(eq(agingProfiles.id, id)).returning();

      logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'delete',
        functionName: 'delete',
        resourceId: existing.id.toString(),
        resourceLabel: existing.name,
        status: 'success',
        beforeValue: {
          ...existing,
          _agingBuckets: existingBuckets,
        },
        afterValue: {
          ...deleted,
          _agingBuckets: existingBuckets,
        },
        ipAddress,
        userAgent,
      });

      return { status: 200, body: deleted };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: `Error al eliminar perfil de aging ${id}`,
      });
      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'delete',
        functionName: 'delete',
        resourceId: id.toString(),
        status: 'failure',
        errorMessage: error?.body.message,
        metadata: {
          id,
        },
        ipAddress,
        userAgent,
      });
      return error;
    }
  },
});
