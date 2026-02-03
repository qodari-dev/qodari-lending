import { db, paymentFrequencies } from '@/server/db';
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

type PaymentFrequencyColumn = keyof typeof paymentFrequencies.$inferSelect;

const PAYMENT_FREQUENCY_FIELDS: FieldMap = {
  id: paymentFrequencies.id,
  name: paymentFrequencies.name,
  daysInterval: paymentFrequencies.daysInterval,
  isActive: paymentFrequencies.isActive,
  createdAt: paymentFrequencies.createdAt,
  updatedAt: paymentFrequencies.updatedAt,
} satisfies Partial<
  Record<PaymentFrequencyColumn, (typeof paymentFrequencies)[PaymentFrequencyColumn]>
>;

const PAYMENT_FREQUENCY_QUERY_CONFIG: QueryConfig = {
  fields: PAYMENT_FREQUENCY_FIELDS,
  searchFields: [paymentFrequencies.name],
  defaultSort: { column: paymentFrequencies.createdAt, order: 'desc' },
};

const PAYMENT_FREQUENCY_INCLUDES = createIncludeMap<typeof db.query.paymentFrequencies>()({
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

export const paymentFrequency = tsr.router(contract.paymentFrequency, {
  // ==========================================
  // LIST - GET /payment-frequencies
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
      } = buildQuery({ page, limit, search, where, sort }, PAYMENT_FREQUENCY_QUERY_CONFIG);

      const [data, countResult] = await Promise.all([
        db.query.paymentFrequencies.findMany({
          where: whereClause,
          with: buildTypedIncludes(include, PAYMENT_FREQUENCY_INCLUDES),
          orderBy: orderBy.length ? orderBy : undefined,
          limit: queryLimit,
          offset,
        }),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(paymentFrequencies)
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
        genericMsg: 'Error al listar periodicidades de pago',
      });
    }
  },

  // ==========================================
  // GET - GET /payment-frequencies/:id
  // ==========================================
  getById: async ({ params: { id }, query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const paymentFrequency = await db.query.paymentFrequencies.findFirst({
        where: eq(paymentFrequencies.id, id),
        with: buildTypedIncludes(query?.include, PAYMENT_FREQUENCY_INCLUDES),
      });

      if (!paymentFrequency) {
        throwHttpError({
          status: 404,
          message: 'Periodicidad de pago no encontrada',
          code: 'NOT_FOUND',
        });
      }

      return { status: 200, body: paymentFrequency };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: `Error al obtener periodicidad de pago ${id}`,
      });
    }
  },

  // ==========================================
  // CREATE - POST /payment-frequencies
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

      const newPaymentFrequency = await db.transaction(async (tx) => {
        const [newPaymentFrequency] = await tx
          .insert(paymentFrequencies)
          .values(body)
          .returning();

        return newPaymentFrequency;
      });

      logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'create',
        functionName: 'create',
        resourceId: newPaymentFrequency.id.toString(),
        resourceLabel: `${newPaymentFrequency.name}`,
        status: 'success',
        afterValue: {
          ...newPaymentFrequency,
        },
        ipAddress,
        userAgent,
      });

      return { status: 201, body: newPaymentFrequency };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: 'Error al crear periodicidad de pago',
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
  // UPDATE - PATCH /payment-frequencies/:id
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

      const existing = await db.query.paymentFrequencies.findFirst({
        where: eq(paymentFrequencies.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Periodicidad de pago con ID ${id} no encontrada`,
          code: 'NOT_FOUND',
        });
      }

      const updated = await db.transaction(async (tx) => {
        const [updated] = await tx
          .update(paymentFrequencies)
          .set(body)
          .where(eq(paymentFrequencies.id, id))
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
        genericMsg: `Error al actualizar periodicidad de pago ${id}`,
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
  // DELETE - DELETE /payment-frequencies/:id
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

      const existing = await db.query.paymentFrequencies.findFirst({
        where: eq(paymentFrequencies.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Periodicidad de pago con ID ${id} no encontrada`,
          code: 'NOT_FOUND',
        });
      }

      await db.delete(paymentFrequencies).where(eq(paymentFrequencies.id, id));

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
        genericMsg: `Error al eliminar periodicidad de pago ${id}`,
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
