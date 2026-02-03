import { db, glAccounts } from '@/server/db';
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

type GlAccountColumn = keyof typeof glAccounts.$inferSelect;

const GL_ACCOUNT_FIELDS: FieldMap = {
  id: glAccounts.id,
  code: glAccounts.code,
  name: glAccounts.name,
  thirdPartySetting: glAccounts.thirdPartySetting,
  requiresCostCenter: glAccounts.requiresCostCenter,
  detailType: glAccounts.detailType,
  isBank: glAccounts.isBank,
  isActive: glAccounts.isActive,
  createdAt: glAccounts.createdAt,
  updatedAt: glAccounts.updatedAt,
} satisfies Partial<Record<GlAccountColumn, (typeof glAccounts)[GlAccountColumn]>>;

const GL_ACCOUNT_QUERY_CONFIG: QueryConfig = {
  fields: GL_ACCOUNT_FIELDS,
  searchFields: [glAccounts.code, glAccounts.name],
  defaultSort: { column: glAccounts.createdAt, order: 'desc' },
};

const GL_ACCOUNT_INCLUDES = createIncludeMap<typeof db.query.glAccounts>()({
  accountingEntries: {
    relation: 'accountingEntries',
    config: true,
  },
  accountingDistributionLines: {
    relation: 'accountingDistributionLines',
    config: true,
  },
  portfolioEntries: {
    relation: 'portfolioEntries',
    config: true,
  },
});

// ============================================
// HANDLER
// ============================================

export const glAccount = tsr.router(contract.glAccount, {
  // ==========================================
  // LIST - GET /gl-accounts
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
      } = buildQuery({ page, limit, search, where, sort }, GL_ACCOUNT_QUERY_CONFIG);

      const [data, countResult] = await Promise.all([
        db.query.glAccounts.findMany({
          where: whereClause,
          with: buildTypedIncludes(include, GL_ACCOUNT_INCLUDES),
          orderBy: orderBy.length ? orderBy : undefined,
          limit: queryLimit,
          offset,
        }),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(glAccounts)
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
        genericMsg: 'Error al listar cuentas contables',
      });
    }
  },

  // ==========================================
  // GET - GET /gl-accounts/:id
  // ==========================================
  getById: async ({ params: { id }, query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const glAccount = await db.query.glAccounts.findFirst({
        where: eq(glAccounts.id, id),
        with: buildTypedIncludes(query?.include, GL_ACCOUNT_INCLUDES),
      });

      if (!glAccount) {
        throwHttpError({
          status: 404,
          message: 'not found',
          code: 'NOT_FOUND',
        });
      }

      return { status: 200, body: glAccount };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: `Error al obtener cuenta contable ${id}`,
      });
    }
  },

  // ==========================================
  // CREATE - POST /gl-accounts
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

      const newGlAccount = await db.transaction(async (tx) => {
        const [newGlAccount] = await tx.insert(glAccounts).values(body).returning();

        return newGlAccount;
      });

      logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'create',
        functionName: 'create',
        resourceId: newGlAccount.id.toString(),
        resourceLabel: `${newGlAccount.code} - ${newGlAccount.name}`,
        status: 'success',
        afterValue: {
          ...newGlAccount,
        },
        ipAddress,
        userAgent,
      });

      return { status: 201, body: newGlAccount };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: 'Error al crear cuenta contable',
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
  // UPDATE - PATCH /gl-accounts/:id
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

      const existing = await db.query.glAccounts.findFirst({
        where: eq(glAccounts.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Cuenta contable con ID ${id} no encontrada`,
          code: 'NOT_FOUND',
        });
      }

      const updated = await db.transaction(async (tx) => {
        const [updated] = await tx
          .update(glAccounts)
          .set(body)
          .where(eq(glAccounts.id, id))
          .returning();

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
        genericMsg: `Error al actualizar cuenta contable ${id}`,
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
  // DELETE - DELETE /gl-accounts/:id
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

      const existing = await db.query.glAccounts.findFirst({
        where: eq(glAccounts.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Cuenta contable con ID ${id} no encontrada`,
          code: 'NOT_FOUND',
        });
      }

      await db.delete(glAccounts).where(eq(glAccounts.id, id));

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
        genericMsg: `Error al eliminar cuenta contable ${id}`,
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
