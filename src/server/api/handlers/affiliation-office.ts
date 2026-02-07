import { db, affiliationOffices, userAffiliationOffices } from '@/server/db';
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

type AffiliationOfficeColumn = keyof typeof affiliationOffices.$inferSelect;

const AFFILIATION_OFFICE_FIELDS: FieldMap = {
  id: affiliationOffices.id,
  name: affiliationOffices.name,
  cityId: affiliationOffices.cityId,
  address: affiliationOffices.address,
  phone: affiliationOffices.phone,
  representativeName: affiliationOffices.representativeName,
  email: affiliationOffices.email,
  costCenterId: affiliationOffices.costCenterId,
  isActive: affiliationOffices.isActive,
  createdAt: affiliationOffices.createdAt,
  updatedAt: affiliationOffices.updatedAt,
} satisfies Partial<
  Record<AffiliationOfficeColumn, (typeof affiliationOffices)[AffiliationOfficeColumn]>
>;

const AFFILIATION_OFFICE_QUERY_CONFIG: QueryConfig = {
  fields: AFFILIATION_OFFICE_FIELDS,
  searchFields: [affiliationOffices.name, affiliationOffices.representativeName],
  defaultSort: { column: affiliationOffices.createdAt, order: 'desc' },
};

const AFFILIATION_OFFICE_INCLUDES = createIncludeMap<typeof db.query.affiliationOffices>()({
  city: {
    relation: 'city',
    config: true,
  },
  costCenter: {
    relation: 'costCenter',
    config: true,
  },
  userAffiliationOffices: {
    relation: 'userAffiliationOffices',
    config: true,
  },
});

type AffiliationOfficeUserInput = {
  userId: string;
  userName: string;
  isPrimary: boolean;
};

function normalizePrimaryUsers(users?: AffiliationOfficeUserInput[]) {
  if (!users) return undefined;

  let primaryAssigned = false;
  return users.map((user) => {
    if (!user.isPrimary) return user;

    if (primaryAssigned) {
      return { ...user, isPrimary: false };
    }

    primaryAssigned = true;
    return user;
  });
}

// ============================================
// HANDLER
// ============================================

export const affiliationOffice = tsr.router(contract.affiliationOffice, {
  // ==========================================
  // LIST - GET /affiliation-offices
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
      } = buildQuery({ page, limit, search, where, sort }, AFFILIATION_OFFICE_QUERY_CONFIG);

      const [data, countResult] = await Promise.all([
        db.query.affiliationOffices.findMany({
          where: whereClause,
          with: buildTypedIncludes(include, AFFILIATION_OFFICE_INCLUDES),
          orderBy: orderBy.length ? orderBy : undefined,
          limit: queryLimit,
          offset,
        }),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(affiliationOffices)
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
        genericMsg: 'Error al listar oficinas de afiliacion',
      });
    }
  },

  // ==========================================
  // GET - GET /affiliation-offices/:id
  // ==========================================
  getById: async ({ params: { id }, query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const office = await db.query.affiliationOffices.findFirst({
        where: eq(affiliationOffices.id, id),
        with: buildTypedIncludes(query?.include, AFFILIATION_OFFICE_INCLUDES),
      });

      if (!office) {
        throwHttpError({
          status: 404,
          message: 'not found',
          code: 'NOT_FOUND',
        });
      }

      return { status: 200, body: office };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: `Error al obtener oficina de afiliacion ${id}`,
      });
    }
  },

  // ==========================================
  // CREATE - POST /affiliation-offices
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

      const { userAffiliationOffices: usersData, ...officeData } = body;
      const normalizedUsers = normalizePrimaryUsers(usersData);

      const [created] = await db.transaction(async (tx) => {
        const [office] = await tx.insert(affiliationOffices).values(officeData).returning();

        if (normalizedUsers?.length) {
          await tx.insert(userAffiliationOffices).values(
            normalizedUsers.map((user) => ({
              ...user,
              affiliationOfficeId: office.id,
            }))
          );
        }

        return [office];
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
          _userAffiliationOffices: normalizedUsers ?? [],
        },
        ipAddress,
        userAgent,
      });

      return { status: 201, body: created };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: 'Error al crear oficina de afiliacion',
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
  // UPDATE - PATCH /affiliation-offices/:id
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

      const existing = await db.query.affiliationOffices.findFirst({
        where: eq(affiliationOffices.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Oficina de afiliacion con ID ${id} no encontrada`,
          code: 'NOT_FOUND',
        });
      }

      const existingUsers = await db.query.userAffiliationOffices.findMany({
        where: eq(userAffiliationOffices.affiliationOfficeId, id),
      });

      const { userAffiliationOffices: usersData, ...officeData } = body;
      const normalizedUsers = normalizePrimaryUsers(usersData);

      const [updated] = await db.transaction(async (tx) => {
        const [officeUpdated] = await tx
          .update(affiliationOffices)
          .set(officeData)
          .where(eq(affiliationOffices.id, id))
          .returning();

        if (usersData !== undefined) {
          await tx
            .delete(userAffiliationOffices)
            .where(eq(userAffiliationOffices.affiliationOfficeId, id));

          if (normalizedUsers?.length) {
            await tx.insert(userAffiliationOffices).values(
              normalizedUsers.map((user) => ({
                ...user,
                affiliationOfficeId: id,
              }))
            );
          }
        }

        return [officeUpdated];
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
          _userAffiliationOffices: existingUsers,
        },
        afterValue: {
          ...updated,
          _userAffiliationOffices: normalizedUsers ?? existingUsers,
        },
        ipAddress,
        userAgent,
      });

      return { status: 200, body: updated };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: `Error al actualizar oficina de afiliacion ${id}`,
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
  // DELETE - DELETE /affiliation-offices/:id
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

      const existing = await db.query.affiliationOffices.findFirst({
        where: eq(affiliationOffices.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Oficina de afiliacion con ID ${id} no encontrada`,
          code: 'NOT_FOUND',
        });
      }

      const existingUsers = await db.query.userAffiliationOffices.findMany({
        where: eq(userAffiliationOffices.affiliationOfficeId, id),
      });

      const [deleted] = await db
        .delete(affiliationOffices)
        .where(eq(affiliationOffices.id, id))
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
          _userAffiliationOffices: existingUsers,
        },
        afterValue: {
          ...deleted,
          _userAffiliationOffices: existingUsers,
        },
        ipAddress,
        userAgent,
      });

      return { status: 200, body: deleted };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: `Error al eliminar oficina de afiliacion ${id}`,
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
