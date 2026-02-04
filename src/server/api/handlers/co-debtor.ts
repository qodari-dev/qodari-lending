import { db, coDebtors } from '@/server/db';
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

type CoDebtorColumn = keyof typeof coDebtors.$inferSelect;

const CO_DEBTOR_FIELDS: FieldMap = {
  id: coDebtors.id,
  identificationTypeId: coDebtors.identificationTypeId,
  documentNumber: coDebtors.documentNumber,
  homeAddress: coDebtors.homeAddress,
  homeCityId: coDebtors.homeCityId,
  homePhone: coDebtors.homePhone,
  companyName: coDebtors.companyName,
  workAddress: coDebtors.workAddress,
  workCityId: coDebtors.workCityId,
  workPhone: coDebtors.workPhone,
  createdAt: coDebtors.createdAt,
  updatedAt: coDebtors.updatedAt,
} satisfies Partial<Record<CoDebtorColumn, (typeof coDebtors)[CoDebtorColumn]>>;

const CO_DEBTOR_QUERY_CONFIG: QueryConfig = {
  fields: CO_DEBTOR_FIELDS,
  searchFields: [coDebtors.documentNumber, coDebtors.companyName],
  defaultSort: { column: coDebtors.createdAt, order: 'desc' },
};

const CO_DEBTOR_INCLUDES = createIncludeMap<typeof db.query.coDebtors>()({
  loanApplicationCoDebtors: {
    relation: 'loanApplicationCoDebtors',
    config: {
      with: {
        loanApplication: true,
      },
    },
  },
  identificationType: {
    relation: 'identificationType',
    config: true,
  },
  homeCity: {
    relation: 'homeCity',
    config: true,
  },
  workCity: {
    relation: 'workCity',
    config: true,
  },
});

// ============================================
// HANDLER
// ============================================

export const coDebtor = tsr.router(contract.coDebtor, {
  // ==========================================
  // LIST - GET /co-debtors
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
      } = buildQuery({ page, limit, search, where, sort }, CO_DEBTOR_QUERY_CONFIG);

      const [data, countResult] = await Promise.all([
        db.query.coDebtors.findMany({
          where: whereClause,
          with: buildTypedIncludes(include, CO_DEBTOR_INCLUDES),
          orderBy: orderBy.length ? orderBy : undefined,
          limit: queryLimit,
          offset,
        }),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(coDebtors)
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
        genericMsg: 'Error al listar codeudores',
      });
    }
  },

  // ==========================================
  // GET - GET /co-debtors/:id
  // ==========================================
  getById: async ({ params: { id }, query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const coDebtor = await db.query.coDebtors.findFirst({
        where: eq(coDebtors.id, id),
        with: buildTypedIncludes(query?.include, CO_DEBTOR_INCLUDES),
      });

      if (!coDebtor) {
        throwHttpError({
          status: 404,
          message: 'not found',
          code: 'NOT_FOUND',
        });
      }

      return { status: 200, body: coDebtor };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: `Error al obtener codeudor ${id}`,
      });
    }
  },

  // ==========================================
  // CREATE - POST /co-debtors
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

      const newCoDebtor = await db.transaction(async (tx) => {
        const [newCoDebtor] = await tx.insert(coDebtors).values(body).returning();

        return newCoDebtor;
      });

      logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'create',
        functionName: 'create',
        resourceId: newCoDebtor.id.toString(),
        resourceLabel: `${newCoDebtor.documentNumber}`,
        status: 'success',
        afterValue: {
          ...newCoDebtor,
        },
        ipAddress,
        userAgent,
      });

      return { status: 201, body: newCoDebtor };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: 'Error al crear codeudor',
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
  // UPDATE - PATCH /co-debtors/:id
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

      const existing = await db.query.coDebtors.findFirst({
        where: eq(coDebtors.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Codeudor con ID ${id} no encontrado`,
          code: 'NOT_FOUND',
        });
      }

      const updated = await db.transaction(async (tx) => {
        const [updated] = await tx
          .update(coDebtors)
          .set(body)
          .where(eq(coDebtors.id, id))
          .returning();

        return updated;
      });

      logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'update',
        resourceId: existing.id.toString(),
        resourceLabel: `${existing.documentNumber}`,
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
        genericMsg: `Error al actualizar codeudor ${id}`,
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
  // DELETE - DELETE /co-debtors/:id
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

      const existing = await db.query.coDebtors.findFirst({
        where: eq(coDebtors.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Codeudor con ID ${id} no encontrado`,
          code: 'NOT_FOUND',
        });
      }

      await db.delete(coDebtors).where(eq(coDebtors.id, id));

      logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'delete',
        functionName: 'delete',
        resourceId: existing.id.toString(),
        resourceLabel: `${existing.documentNumber}`,
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
        genericMsg: `Error al eliminar codeudor ${id}`,
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
