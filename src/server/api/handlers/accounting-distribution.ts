import { db, accountingDistributions, accountingDistributionLines } from '@/server/db';
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

type AccountingDistributionColumn = keyof typeof accountingDistributions.$inferSelect;

const ACCOUNTING_DISTRIBUTION_FIELDS: FieldMap = {
  id: accountingDistributions.id,
  name: accountingDistributions.name,
  isActive: accountingDistributions.isActive,
  createdAt: accountingDistributions.createdAt,
  updatedAt: accountingDistributions.updatedAt,
} satisfies Partial<
  Record<
    AccountingDistributionColumn,
    (typeof accountingDistributions)[AccountingDistributionColumn]
  >
>;

const ACCOUNTING_DISTRIBUTION_QUERY_CONFIG: QueryConfig = {
  fields: ACCOUNTING_DISTRIBUTION_FIELDS,
  searchFields: [accountingDistributions.name],
  defaultSort: { column: accountingDistributions.createdAt, order: 'desc' },
};

const ACCOUNTING_DISTRIBUTION_INCLUDES = createIncludeMap<
  typeof db.query.accountingDistributions
>()({
  accountingDistributionLines: {
    relation: 'accountingDistributionLines',
    config: {
      with: {
        glAccount: true,
        costCenter: true,
      },
    },
  },
});

// ============================================
// HANDLER
// ============================================

export const accountingDistribution = tsr.router(contract.accountingDistribution, {
  // ==========================================
  // LIST - GET /accounting-distributions
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
      } = buildQuery(
        { page, limit, search, where, sort },
        ACCOUNTING_DISTRIBUTION_QUERY_CONFIG
      );

      const [data, countResult] = await Promise.all([
        db.query.accountingDistributions.findMany({
          where: whereClause,
          with: buildTypedIncludes(include, ACCOUNTING_DISTRIBUTION_INCLUDES),
          orderBy: orderBy.length ? orderBy : undefined,
          limit: queryLimit,
          offset,
        }),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(accountingDistributions)
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
        genericMsg: 'Error al listar distribuciones contables',
      });
    }
  },

  // ==========================================
  // GET - GET /accounting-distributions/:id
  // ==========================================
  getById: async ({ params: { id }, query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const distribution = await db.query.accountingDistributions.findFirst({
        where: eq(accountingDistributions.id, id),
        with: buildTypedIncludes(query?.include, ACCOUNTING_DISTRIBUTION_INCLUDES),
      });

      if (!distribution) {
        throwHttpError({
          status: 404,
          message: 'not found',
          code: 'NOT_FOUND',
        });
      }

      return { status: 200, body: distribution };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: `Error al obtener distribucion contable ${id}`,
      });
    }
  },

  // ==========================================
  // CREATE - POST /accounting-distributions
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

      const { accountingDistributionLines: linesData, ...distributionData } = body;

      const [created] = await db.transaction(async (tx) => {
        const [distribution] = await tx
          .insert(accountingDistributions)
          .values(distributionData)
          .returning();

        if (linesData?.length) {
          await tx.insert(accountingDistributionLines).values(
            linesData.map((line) => ({
              ...line,
              accountingDistributionId: distribution.id,
            }))
          );
        }

        return [distribution];
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
          _accountingDistributionLines: linesData ?? [],
        },
        ipAddress,
        userAgent,
      });

      return { status: 201, body: created };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: 'Error al crear distribucion contable',
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
  // UPDATE - PATCH /accounting-distributions/:id
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

      const existing = await db.query.accountingDistributions.findFirst({
        where: eq(accountingDistributions.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Distribucion contable con ID ${id} no encontrada`,
          code: 'NOT_FOUND',
        });
      }

      const existingLines = await db.query.accountingDistributionLines.findMany({
        where: eq(accountingDistributionLines.accountingDistributionId, id),
      });

      const { accountingDistributionLines: linesData, ...distributionData } = body;

      const [updated] = await db.transaction(async (tx) => {
        const [distributionUpdated] = await tx
          .update(accountingDistributions)
          .set(distributionData)
          .where(eq(accountingDistributions.id, id))
          .returning();

        if (linesData) {
          await tx
            .delete(accountingDistributionLines)
            .where(eq(accountingDistributionLines.accountingDistributionId, id));

          if (linesData.length) {
            await tx.insert(accountingDistributionLines).values(
              linesData.map((line) => ({
                ...line,
                accountingDistributionId: id,
              }))
            );
          }
        }

        return [distributionUpdated];
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
          _accountingDistributionLines: existingLines,
        },
        afterValue: {
          ...updated,
          _accountingDistributionLines: linesData ?? existingLines,
        },
        ipAddress,
        userAgent,
      });

      return { status: 200, body: updated };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: `Error al actualizar distribucion contable ${id}`,
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
  // DELETE - DELETE /accounting-distributions/:id
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

      const existing = await db.query.accountingDistributions.findFirst({
        where: eq(accountingDistributions.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Distribucion contable con ID ${id} no encontrada`,
          code: 'NOT_FOUND',
        });
      }

      const existingLines = await db.query.accountingDistributionLines.findMany({
        where: eq(accountingDistributionLines.accountingDistributionId, id),
      });

      const [deleted] = await db
        .delete(accountingDistributions)
        .where(eq(accountingDistributions.id, id))
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
          _accountingDistributionLines: existingLines,
        },
        afterValue: {
          ...deleted,
          _accountingDistributionLines: existingLines,
        },
        ipAddress,
        userAgent,
      });

      return { status: 200, body: deleted };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: `Error al eliminar distribucion contable ${id}`,
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
