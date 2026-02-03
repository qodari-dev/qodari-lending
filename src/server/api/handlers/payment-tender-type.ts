import { db, paymentTenderTypes } from '@/server/db';
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

type PaymentTenderTypeColumn = keyof typeof paymentTenderTypes.$inferSelect;

const PAYMENT_TENDER_TYPE_FIELDS: FieldMap = {
  id: paymentTenderTypes.id,
  name: paymentTenderTypes.name,
  type: paymentTenderTypes.type,
  isActive: paymentTenderTypes.isActive,
  createdAt: paymentTenderTypes.createdAt,
  updatedAt: paymentTenderTypes.updatedAt,
} satisfies Partial<
  Record<PaymentTenderTypeColumn, (typeof paymentTenderTypes)[PaymentTenderTypeColumn]>
>;

const PAYMENT_TENDER_TYPE_QUERY_CONFIG: QueryConfig = {
  fields: PAYMENT_TENDER_TYPE_FIELDS,
  searchFields: [paymentTenderTypes.name],
  defaultSort: { column: paymentTenderTypes.createdAt, order: 'desc' },
};

const PAYMENT_TENDER_TYPE_INCLUDES = createIncludeMap<typeof db.query.paymentTenderTypes>()({
  loanPaymentMethodAllocations: {
    relation: 'loanPaymentMethodAllocations',
    config: true,
  },
});

// ============================================
// HANDLER
// ============================================

export const paymentTenderType = tsr.router(contract.paymentTenderType, {
  // ==========================================
  // LIST - GET /payment-tender-types
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
      } = buildQuery({ page, limit, search, where, sort }, PAYMENT_TENDER_TYPE_QUERY_CONFIG);

      const [data, countResult] = await Promise.all([
        db.query.paymentTenderTypes.findMany({
          where: whereClause,
          with: buildTypedIncludes(include, PAYMENT_TENDER_TYPE_INCLUDES),
          orderBy: orderBy.length ? orderBy : undefined,
          limit: queryLimit,
          offset,
        }),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(paymentTenderTypes)
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
        genericMsg: 'Error al listar medios de pago',
      });
    }
  },

  // ==========================================
  // GET - GET /payment-tender-types/:id
  // ==========================================
  getById: async ({ params: { id }, query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const paymentTenderType = await db.query.paymentTenderTypes.findFirst({
        where: eq(paymentTenderTypes.id, id),
        with: buildTypedIncludes(query?.include, PAYMENT_TENDER_TYPE_INCLUDES),
      });

      if (!paymentTenderType) {
        throwHttpError({
          status: 404,
          message: 'not found',
          code: 'NOT_FOUND',
        });
      }

      return { status: 200, body: paymentTenderType };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: `Error al obtener medio de pago ${id}`,
      });
    }
  },

  // ==========================================
  // CREATE - POST /payment-tender-types
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

      const newPaymentTenderType = await db.transaction(async (tx) => {
        const [newPaymentTenderType] = await tx.insert(paymentTenderTypes).values(body).returning();

        return newPaymentTenderType;
      });

      logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'create',
        functionName: 'create',
        resourceId: newPaymentTenderType.id.toString(),
        resourceLabel: `${newPaymentTenderType.name}`,
        status: 'success',
        afterValue: {
          ...newPaymentTenderType,
        },
        ipAddress,
        userAgent,
      });

      return { status: 201, body: newPaymentTenderType };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: 'Error al crear medio de pago',
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
  // UPDATE - PATCH /payment-tender-types/:id
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

      const existing = await db.query.paymentTenderTypes.findFirst({
        where: eq(paymentTenderTypes.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Medio de pago con ID ${id} no encontrado`,
          code: 'NOT_FOUND',
        });
      }

      const updated = await db.transaction(async (tx) => {
        const [updated] = await tx
          .update(paymentTenderTypes)
          .set(body)
          .where(eq(paymentTenderTypes.id, id))
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
        genericMsg: `Error al actualizar medio de pago ${id}`,
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
  // DELETE - DELETE /payment-tender-types/:id
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

      const existing = await db.query.paymentTenderTypes.findFirst({
        where: eq(paymentTenderTypes.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Medio de pago con ID ${id} no encontrado`,
          code: 'NOT_FOUND',
        });
      }

      await db.delete(paymentTenderTypes).where(eq(paymentTenderTypes.id, id));

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
        genericMsg: `Error al eliminar medio de pago ${id}`,
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
