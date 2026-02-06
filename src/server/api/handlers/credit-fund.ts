import { db, creditFunds, creditFundBudgets } from '@/server/db';
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

type CreditFundColumn = keyof typeof creditFunds.$inferSelect;

const CREDIT_FUND_FIELDS: FieldMap = {
  id: creditFunds.id,
  name: creditFunds.name,
  isControlled: creditFunds.isControlled,
  isActive: creditFunds.isActive,
  createdAt: creditFunds.createdAt,
  updatedAt: creditFunds.updatedAt,
} satisfies Partial<Record<CreditFundColumn, (typeof creditFunds)[CreditFundColumn]>>;

const CREDIT_FUND_QUERY_CONFIG: QueryConfig = {
  fields: CREDIT_FUND_FIELDS,
  searchFields: [creditFunds.name],
  defaultSort: { column: creditFunds.createdAt, order: 'desc' },
};

const CREDIT_FUND_INCLUDES = createIncludeMap<typeof db.query.creditFunds>()({
  creditFundBudgets: {
    relation: 'creditFundBudgets',
    config: {
      with: {
        accountingPeriod: true,
      },
    },
  },
});

// ============================================
// HANDLER
// ============================================

export const creditFund = tsr.router(contract.creditFund, {
  // ==========================================
  // LIST - GET /credit-funds
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
      } = buildQuery({ page, limit, search, where, sort }, CREDIT_FUND_QUERY_CONFIG);

      const [data, countResult] = await Promise.all([
        db.query.creditFunds.findMany({
          where: whereClause,
          with: buildTypedIncludes(include, CREDIT_FUND_INCLUDES),
          orderBy: orderBy.length ? orderBy : undefined,
          limit: queryLimit,
          offset,
        }),
        db.select({ count: sql<number>`count(*)::int` }).from(creditFunds).where(whereClause),
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
        genericMsg: 'Error al listar fondos de credito',
      });
    }
  },

  // ==========================================
  // GET - GET /credit-funds/:id
  // ==========================================
  getById: async ({ params: { id }, query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const fund = await db.query.creditFunds.findFirst({
        where: eq(creditFunds.id, id),
        with: buildTypedIncludes(query?.include, CREDIT_FUND_INCLUDES),
      });

      if (!fund) {
        throwHttpError({
          status: 404,
          message: 'not found',
          code: 'NOT_FOUND',
        });
      }

      return { status: 200, body: fund };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: `Error al obtener fondo de credito ${id}`,
      });
    }
  },

  // ==========================================
  // CREATE - POST /credit-funds
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

      const { creditFundBudgets: budgetsData, ...fundData } = body;

      const [created] = await db.transaction(async (tx) => {
        const [fund] = await tx.insert(creditFunds).values(fundData).returning();

        if (budgetsData?.length) {
          await tx.insert(creditFundBudgets).values(
            budgetsData.map((budget) => ({
              ...budget,
              creditFundId: fund.id,
            }))
          );
        }

        return [fund];
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
          _creditFundBudgets: budgetsData ?? [],
        },
        ipAddress,
        userAgent,
      });

      return { status: 201, body: created };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: 'Error al crear fondo de credito',
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
  // UPDATE - PATCH /credit-funds/:id
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

      const existing = await db.query.creditFunds.findFirst({
        where: eq(creditFunds.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Fondo de credito con ID ${id} no encontrado`,
          code: 'NOT_FOUND',
        });
      }

      const existingBudgets = await db.query.creditFundBudgets.findMany({
        where: eq(creditFundBudgets.creditFundId, id),
      });

      const { creditFundBudgets: budgetsData, ...fundData } = body;

      const [updated] = await db.transaction(async (tx) => {
        const [fundUpdated] = await tx
          .update(creditFunds)
          .set(fundData)
          .where(eq(creditFunds.id, id))
          .returning();

        if (budgetsData) {
          await tx.delete(creditFundBudgets).where(eq(creditFundBudgets.creditFundId, id));

          if (budgetsData.length) {
            await tx.insert(creditFundBudgets).values(
              budgetsData.map((budget) => ({
                ...budget,
                creditFundId: id,
              }))
            );
          }
        }

        return [fundUpdated];
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
          _creditFundBudgets: existingBudgets,
        },
        afterValue: {
          ...updated,
          _creditFundBudgets: budgetsData ?? existingBudgets,
        },
        ipAddress,
        userAgent,
      });

      return { status: 200, body: updated };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: `Error al actualizar fondo de credito ${id}`,
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
  // DELETE - DELETE /credit-funds/:id
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

      const existing = await db.query.creditFunds.findFirst({
        where: eq(creditFunds.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Fondo de credito con ID ${id} no encontrado`,
          code: 'NOT_FOUND',
        });
      }

      const existingBudgets = await db.query.creditFundBudgets.findMany({
        where: eq(creditFundBudgets.creditFundId, id),
      });

      const [deleted] = await db.delete(creditFunds).where(eq(creditFunds.id, id)).returning();

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
          _creditFundBudgets: existingBudgets,
        },
        afterValue: {
          ...deleted,
          _creditFundBudgets: existingBudgets,
        },
        ipAddress,
        userAgent,
      });

      return { status: 200, body: deleted };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: `Error al eliminar fondo de credito ${id}`,
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
