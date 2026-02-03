import { db, repaymentMethods } from '@/server/db';
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

type RepaymentMethodColumn = keyof typeof repaymentMethods.$inferSelect;

const REPAYMENT_METHOD_FIELDS: FieldMap = {
  id: repaymentMethods.id,
  name: repaymentMethods.name,
  isActive: repaymentMethods.isActive,
  createdAt: repaymentMethods.createdAt,
  updatedAt: repaymentMethods.updatedAt,
} satisfies Partial<Record<RepaymentMethodColumn, (typeof repaymentMethods)[RepaymentMethodColumn]>>;

const REPAYMENT_METHOD_QUERY_CONFIG: QueryConfig = {
  fields: REPAYMENT_METHOD_FIELDS,
  searchFields: [repaymentMethods.name],
  defaultSort: { column: repaymentMethods.createdAt, order: 'desc' },
};

const REPAYMENT_METHOD_INCLUDES = createIncludeMap<typeof db.query.repaymentMethods>()({
  loanApplications: {
    relation: 'loanApplications',
    config: true,
  },
  loans: {
    relation: 'loans',
    config: true,
  },
});

// ============================================
// HANDLER
// ============================================

export const repaymentMethod = tsr.router(contract.repaymentMethod, {
  // ==========================================
  // LIST - GET /repayment-methods
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
      } = buildQuery({ page, limit, search, where, sort }, REPAYMENT_METHOD_QUERY_CONFIG);

      const [data, countResult] = await Promise.all([
        db.query.repaymentMethods.findMany({
          where: whereClause,
          with: buildTypedIncludes(include, REPAYMENT_METHOD_INCLUDES),
          orderBy: orderBy.length ? orderBy : undefined,
          limit: queryLimit,
          offset,
        }),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(repaymentMethods)
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
        genericMsg: 'Error al listar formas de pago',
      });
    }
  },

  // ==========================================
  // GET - GET /repayment-methods/:id
  // ==========================================
  getById: async ({ params: { id }, query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const repaymentMethod = await db.query.repaymentMethods.findFirst({
        where: eq(repaymentMethods.id, id),
        with: buildTypedIncludes(query?.include, REPAYMENT_METHOD_INCLUDES),
      });

      if (!repaymentMethod) {
        throwHttpError({
          status: 404,
          message: 'Forma de pago no encontrada',
          code: 'NOT_FOUND',
        });
      }

      return { status: 200, body: repaymentMethod };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: `Error al obtener forma de pago ${id}`,
      });
    }
  },

  // ==========================================
  // CREATE - POST /repayment-methods
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

      const newRepaymentMethod = await db.transaction(async (tx) => {
        const [newRepaymentMethod] = await tx.insert(repaymentMethods).values(body).returning();

        return newRepaymentMethod;
      });

      logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'create',
        functionName: 'create',
        resourceId: newRepaymentMethod.id.toString(),
        resourceLabel: `${newRepaymentMethod.name}`,
        status: 'success',
        afterValue: {
          ...newRepaymentMethod,
        },
        ipAddress,
        userAgent,
      });

      return { status: 201, body: newRepaymentMethod };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: 'Error al crear forma de pago',
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
  // UPDATE - PATCH /repayment-methods/:id
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

      const existing = await db.query.repaymentMethods.findFirst({
        where: eq(repaymentMethods.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Forma de pago con ID ${id} no encontrada`,
          code: 'NOT_FOUND',
        });
      }

      const updated = await db.transaction(async (tx) => {
        const [updated] = await tx
          .update(repaymentMethods)
          .set(body)
          .where(eq(repaymentMethods.id, id))
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
        genericMsg: `Error al actualizar forma de pago ${id}`,
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
  // DELETE - DELETE /repayment-methods/:id
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

      const existing = await db.query.repaymentMethods.findFirst({
        where: eq(repaymentMethods.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Forma de pago con ID ${id} no encontrada`,
          code: 'NOT_FOUND',
        });
      }

      await db.delete(repaymentMethods).where(eq(repaymentMethods.id, id));

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
        genericMsg: `Error al eliminar forma de pago ${id}`,
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
