import { db, accountingPeriods } from '@/server/db';
import { genericTsRestErrorResponse, throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { tsr } from '@ts-rest/serverless/next';
import { eq, sql } from 'drizzle-orm';
import { contract } from '../contracts';

import { logAudit } from '@/server/utils/audit-logger';
import { UnifiedAuthContext } from '@/server/utils/auth-context';
import { getClientIp } from '@/server/utils/get-client-ip';
import { buildPaginationMeta, buildQuery, FieldMap, QueryConfig } from '@/server/utils/query/query-builder';

// ============================================
// CONFIG
// ============================================

type AccountingPeriodColumn = keyof typeof accountingPeriods.$inferSelect;

const ACCOUNTING_PERIOD_FIELDS: FieldMap = {
  id: accountingPeriods.id,
  year: accountingPeriods.year,
  month: accountingPeriods.month,
  isClosed: accountingPeriods.isClosed,
  closedAt: accountingPeriods.closedAt,
  createdAt: accountingPeriods.createdAt,
  updatedAt: accountingPeriods.updatedAt,
} satisfies Partial<Record<AccountingPeriodColumn, (typeof accountingPeriods)[AccountingPeriodColumn]>>;

const ACCOUNTING_PERIOD_QUERY_CONFIG: QueryConfig = {
  fields: ACCOUNTING_PERIOD_FIELDS,
  searchFields: [],
  defaultSort: { column: accountingPeriods.year, order: 'desc' },
};

// ============================================
// HANDLER
// ============================================

export const accountingPeriod = tsr.router(contract.accountingPeriod, {
  // ==========================================
  // LIST - GET /accounting-periods
  // ==========================================
  list: async ({ query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const { page, limit, search, where, sort } = query;

      const {
        whereClause,
        orderBy,
        limit: queryLimit,
        offset,
      } = buildQuery({ page, limit, search, where, sort }, ACCOUNTING_PERIOD_QUERY_CONFIG);

      const [data, countResult] = await Promise.all([
        db.query.accountingPeriods.findMany({
          where: whereClause,
          orderBy: orderBy.length ? orderBy : undefined,
          limit: queryLimit,
          offset,
        }),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(accountingPeriods)
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
        genericMsg: 'Error al listar periodos contables',
      });
    }
  },

  // ==========================================
  // GET - GET /accounting-periods/:id
  // ==========================================
  getById: async ({ params: { id } }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const period = await db.query.accountingPeriods.findFirst({
        where: eq(accountingPeriods.id, id),
      });

      if (!period) {
        throwHttpError({
          status: 404,
          message: 'not found',
          code: 'NOT_FOUND',
        });
      }

      return { status: 200, body: period };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: `Error al obtener periodo contable ${id}`,
      });
    }
  },

  // ==========================================
  // CREATE - POST /accounting-periods
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

      const newPeriod = await db.transaction(async (tx) => {
        const [created] = await tx.insert(accountingPeriods).values(body).returning();
        return created;
      });

      logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'create',
        functionName: 'create',
        resourceId: newPeriod.id.toString(),
        resourceLabel: `${newPeriod.year}-${String(newPeriod.month).padStart(2, '0')}`,
        status: 'success',
        afterValue: {
          ...newPeriod,
        },
        ipAddress,
        userAgent,
      });

      return { status: 201, body: newPeriod };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: 'Error al crear periodo contable',
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
  // UPDATE - PATCH /accounting-periods/:id
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

      const existing = await db.query.accountingPeriods.findFirst({
        where: eq(accountingPeriods.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Periodo contable con ID ${id} no encontrado`,
          code: 'NOT_FOUND',
        });
      }

      // No se puede editar si está cerrado
      if (existing.isClosed) {
        throwHttpError({
          status: 409,
          message: 'No se puede editar un periodo contable cerrado',
          code: 'CONFLICT',
        });
      }

      const updated = await db.transaction(async (tx) => {
        const [result] = await tx
          .update(accountingPeriods)
          .set(body)
          .where(eq(accountingPeriods.id, id))
          .returning();

        return result;
      });

      logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'update',
        resourceId: existing.id.toString(),
        resourceLabel: `${existing.year}-${String(existing.month).padStart(2, '0')}`,
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
        genericMsg: `Error al actualizar periodo contable ${id}`,
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
  // DELETE - DELETE /accounting-periods/:id
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

      const existing = await db.query.accountingPeriods.findFirst({
        where: eq(accountingPeriods.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Periodo contable con ID ${id} no encontrado`,
          code: 'NOT_FOUND',
        });
      }

      // No se puede eliminar si está cerrado
      if (existing.isClosed) {
        throwHttpError({
          status: 409,
          message: 'No se puede eliminar un periodo contable cerrado',
          code: 'CONFLICT',
        });
      }

      await db.delete(accountingPeriods).where(eq(accountingPeriods.id, id));

      logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'delete',
        functionName: 'delete',
        resourceId: existing.id.toString(),
        resourceLabel: `${existing.year}-${String(existing.month).padStart(2, '0')}`,
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
        genericMsg: `Error al eliminar periodo contable ${id}`,
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
