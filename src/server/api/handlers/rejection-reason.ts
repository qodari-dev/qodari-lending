import { db, rejectionReasons } from '@/server/db';
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

type RejectionReasonColumn = keyof typeof rejectionReasons.$inferSelect;

const REJECTION_REASON_FIELDS: FieldMap = {
  id: rejectionReasons.id,
  name: rejectionReasons.name,
  isActive: rejectionReasons.isActive,
  createdAt: rejectionReasons.createdAt,
  updatedAt: rejectionReasons.updatedAt,
} satisfies Partial<Record<RejectionReasonColumn, (typeof rejectionReasons)[RejectionReasonColumn]>>;

const REJECTION_REASON_QUERY_CONFIG: QueryConfig = {
  fields: REJECTION_REASON_FIELDS,
  searchFields: [rejectionReasons.name],
  defaultSort: { column: rejectionReasons.createdAt, order: 'desc' },
};

const REJECTION_REASON_INCLUDES = createIncludeMap<typeof db.query.rejectionReasons>()({
  loanApplications: {
    relation: 'loanApplications',
    config: true,
  },
});

// ============================================
// HANDLER
// ============================================

export const rejectionReason = tsr.router(contract.rejectionReason, {
  // ==========================================
  // LIST - GET /rejection-reasons
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
      } = buildQuery({ page, limit, search, where, sort }, REJECTION_REASON_QUERY_CONFIG);

      const [data, countResult] = await Promise.all([
        db.query.rejectionReasons.findMany({
          where: whereClause,
          with: buildTypedIncludes(include, REJECTION_REASON_INCLUDES),
          orderBy: orderBy.length ? orderBy : undefined,
          limit: queryLimit,
          offset,
        }),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(rejectionReasons)
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
        genericMsg: 'Error al listar motivos de rechazo',
      });
    }
  },

  // ==========================================
  // GET - GET /rejection-reasons/:id
  // ==========================================
  getById: async ({ params: { id }, query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const rejectionReason = await db.query.rejectionReasons.findFirst({
        where: eq(rejectionReasons.id, id),
        with: buildTypedIncludes(query?.include, REJECTION_REASON_INCLUDES),
      });

      if (!rejectionReason) {
        throwHttpError({
          status: 404,
          message: 'Motivo de rechazo no encontrado',
          code: 'NOT_FOUND',
        });
      }

      return { status: 200, body: rejectionReason };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: `Error al obtener motivo de rechazo ${id}`,
      });
    }
  },

  // ==========================================
  // CREATE - POST /rejection-reasons
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

      const newRejectionReason = await db.transaction(async (tx) => {
        const [newRejectionReason] = await tx.insert(rejectionReasons).values(body).returning();

        return newRejectionReason;
      });

      logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'create',
        functionName: 'create',
        resourceId: newRejectionReason.id.toString(),
        resourceLabel: `${newRejectionReason.name}`,
        status: 'success',
        afterValue: {
          ...newRejectionReason,
        },
        ipAddress,
        userAgent,
      });

      return { status: 201, body: newRejectionReason };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: 'Error al crear motivo de rechazo',
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
  // UPDATE - PATCH /rejection-reasons/:id
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

      const existing = await db.query.rejectionReasons.findFirst({
        where: eq(rejectionReasons.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Motivo de rechazo con ID ${id} no encontrado`,
          code: 'NOT_FOUND',
        });
      }

      const updated = await db.transaction(async (tx) => {
        const [updated] = await tx
          .update(rejectionReasons)
          .set(body)
          .where(eq(rejectionReasons.id, id))
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
        genericMsg: `Error al actualizar motivo de rechazo ${id}`,
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
  // DELETE - DELETE /rejection-reasons/:id
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

      const existing = await db.query.rejectionReasons.findFirst({
        where: eq(rejectionReasons.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Motivo de rechazo con ID ${id} no encontrado`,
          code: 'NOT_FOUND',
        });
      }

      await db.delete(rejectionReasons).where(eq(rejectionReasons.id, id));

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
        genericMsg: `Error al eliminar motivo de rechazo ${id}`,
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
