import { db, billingCycleProfileCycles, billingCycleProfiles } from '@/server/db';
import { logAudit } from '@/server/utils/audit-logger';
import { UnifiedAuthContext } from '@/server/utils/auth-context';
import { genericTsRestErrorResponse, throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { getClientIp } from '@/server/utils/get-client-ip';
import { buildTypedIncludes, createIncludeMap } from '@/server/utils/query/include-builder';
import {
  buildPaginationMeta,
  buildQuery,
  FieldMap,
  QueryConfig,
} from '@/server/utils/query/query-builder';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { tsr } from '@ts-rest/serverless/next';
import { asc, eq, sql } from 'drizzle-orm';
import { contract } from '../contracts';

type BillingCycleProfileColumn = keyof typeof billingCycleProfiles.$inferSelect;

const BILLING_CYCLE_PROFILE_FIELDS: FieldMap = {
  id: billingCycleProfiles.id,
  name: billingCycleProfiles.name,
  creditProductId: billingCycleProfiles.creditProductId,
  agreementId: billingCycleProfiles.agreementId,
  cyclesPerMonth: billingCycleProfiles.cyclesPerMonth,
  weekendPolicy: billingCycleProfiles.weekendPolicy,
  isActive: billingCycleProfiles.isActive,
  createdAt: billingCycleProfiles.createdAt,
  updatedAt: billingCycleProfiles.updatedAt,
} satisfies Partial<
  Record<BillingCycleProfileColumn, (typeof billingCycleProfiles)[BillingCycleProfileColumn]>
>;

const BILLING_CYCLE_PROFILE_QUERY_CONFIG: QueryConfig = {
  fields: BILLING_CYCLE_PROFILE_FIELDS,
  searchFields: [billingCycleProfiles.name],
  defaultSort: { column: billingCycleProfiles.createdAt, order: 'desc' },
};

const BILLING_CYCLE_PROFILE_INCLUDES = createIncludeMap<typeof db.query.billingCycleProfiles>()({
  creditProduct: {
    relation: 'creditProduct',
    config: true,
  },
  agreement: {
    relation: 'agreement',
    config: true,
  },
  billingCycleProfileCycles: {
    relation: 'billingCycleProfileCycles',
    config: {
      orderBy: [asc(billingCycleProfileCycles.cycleInMonth)],
    },
  },
});

export const billingCycleProfile = tsr.router(contract.billingCycleProfile, {
  list: async ({ query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const { page, limit, search, where, sort, include } = query;

      const {
        whereClause,
        orderBy,
        limit: queryLimit,
        offset,
      } = buildQuery({ page, limit, search, where, sort }, BILLING_CYCLE_PROFILE_QUERY_CONFIG);

      const [data, countResult] = await Promise.all([
        db.query.billingCycleProfiles.findMany({
          where: whereClause,
          with: buildTypedIncludes(include, BILLING_CYCLE_PROFILE_INCLUDES),
          orderBy: orderBy.length ? orderBy : undefined,
          limit: queryLimit,
          offset,
        }),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(billingCycleProfiles)
          .where(whereClause),
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
        genericMsg: 'Error al listar perfiles de ciclo de facturacion',
      });
    }
  },

  getById: async ({ params: { id }, query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const item = await db.query.billingCycleProfiles.findFirst({
        where: eq(billingCycleProfiles.id, id),
        with: buildTypedIncludes(query?.include, BILLING_CYCLE_PROFILE_INCLUDES),
      });

      if (!item) {
        throwHttpError({
          status: 404,
          message: 'not found',
          code: 'NOT_FOUND',
        });
      }

      return {
        status: 200 as const,
        body: item,
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: `Error al obtener perfil de ciclo ${id}`,
      });
    }
  },

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

      const { billingCycleProfileCycles: cyclesData, ...profileData } = body;
      const profilePayload = {
        ...profileData,
        name: profileData.name.trim(),
      };

      const [created] = await db.transaction(async (tx) => {
        const [profile] = await tx
          .insert(billingCycleProfiles)
          .values(profilePayload)
          .returning();

        if (cyclesData?.length) {
          await tx.insert(billingCycleProfileCycles).values(
            cyclesData.map((cycle) => ({
              ...cycle,
              billingCycleProfileId: profile.id,
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
          _billingCycleProfileCycles: cyclesData ?? [],
        },
        ipAddress,
        userAgent,
      });

      return {
        status: 201 as const,
        body: created,
      };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: 'Error al crear perfil de ciclo de facturacion',
      });

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'create',
        functionName: 'create',
        status: 'failure',
        errorMessage: error?.body.message,
        metadata: { body },
        ipAddress,
        userAgent,
      });

      return error;
    }
  },

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

      const existing = await db.query.billingCycleProfiles.findFirst({
        where: eq(billingCycleProfiles.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Perfil de ciclo con ID ${id} no encontrado`,
          code: 'NOT_FOUND',
        });
      }

      const existingCycles = await db.query.billingCycleProfileCycles.findMany({
        where: eq(billingCycleProfileCycles.billingCycleProfileId, id),
        orderBy: [asc(billingCycleProfileCycles.cycleInMonth)],
      });

      const { billingCycleProfileCycles: cyclesData, ...profileData } = body;
      const profilePayload = {
        ...profileData,
        ...(profileData.name !== undefined ? { name: profileData.name.trim() } : {}),
      };

      const [updated] = await db.transaction(async (tx) => {
        const [profileUpdated] = await tx
          .update(billingCycleProfiles)
          .set(profilePayload)
          .where(eq(billingCycleProfiles.id, id))
          .returning();

        if (cyclesData) {
          await tx
            .delete(billingCycleProfileCycles)
            .where(eq(billingCycleProfileCycles.billingCycleProfileId, id));

          if (cyclesData.length) {
            await tx.insert(billingCycleProfileCycles).values(
              cyclesData.map((cycle) => ({
                ...cycle,
                billingCycleProfileId: id,
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
          _billingCycleProfileCycles: existingCycles,
        },
        afterValue: {
          ...updated,
          _billingCycleProfileCycles: cyclesData ?? existingCycles,
        },
        ipAddress,
        userAgent,
      });

      return {
        status: 200 as const,
        body: updated,
      };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: `Error al actualizar perfil de ciclo ${id}`,
      });

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'update',
        resourceId: id.toString(),
        status: 'failure',
        errorMessage: error?.body.message,
        metadata: { body },
        ipAddress,
        userAgent,
      });

      return error;
    }
  },

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

      const existing = await db.query.billingCycleProfiles.findFirst({
        where: eq(billingCycleProfiles.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Perfil de ciclo con ID ${id} no encontrado`,
          code: 'NOT_FOUND',
        });
      }

      const existingCycles = await db.query.billingCycleProfileCycles.findMany({
        where: eq(billingCycleProfileCycles.billingCycleProfileId, id),
        orderBy: [asc(billingCycleProfileCycles.cycleInMonth)],
      });

      const [deleted] = await db
        .delete(billingCycleProfiles)
        .where(eq(billingCycleProfiles.id, id))
        .returning();

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
          _billingCycleProfileCycles: existingCycles,
        },
        afterValue: {
          ...deleted,
          _billingCycleProfileCycles: existingCycles,
        },
        ipAddress,
        userAgent,
      });

      return {
        status: 200 as const,
        body: deleted,
      };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: `Error al eliminar perfil de ciclo ${id}`,
      });

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'delete',
        functionName: 'delete',
        resourceId: id.toString(),
        status: 'failure',
        errorMessage: error?.body.message,
        metadata: { id },
        ipAddress,
        userAgent,
      });

      return error;
    }
  },
});
