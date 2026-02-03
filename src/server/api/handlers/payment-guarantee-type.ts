import { db, paymentGuaranteeTypes } from '@/server/db';
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

type PaymentGuaranteeTypeColumn = keyof typeof paymentGuaranteeTypes.$inferSelect;

const PAYMENT_GUARANTEE_TYPE_FIELDS: FieldMap = {
  id: paymentGuaranteeTypes.id,
  name: paymentGuaranteeTypes.name,
  isActive: paymentGuaranteeTypes.isActive,
  createdAt: paymentGuaranteeTypes.createdAt,
  updatedAt: paymentGuaranteeTypes.updatedAt,
} satisfies Partial<
  Record<PaymentGuaranteeTypeColumn, (typeof paymentGuaranteeTypes)[PaymentGuaranteeTypeColumn]>
>;

const PAYMENT_GUARANTEE_TYPE_QUERY_CONFIG: QueryConfig = {
  fields: PAYMENT_GUARANTEE_TYPE_FIELDS,
  searchFields: [paymentGuaranteeTypes.name],
  defaultSort: { column: paymentGuaranteeTypes.createdAt, order: 'desc' },
};

const PAYMENT_GUARANTEE_TYPE_INCLUDES = createIncludeMap<typeof db.query.paymentGuaranteeTypes>()({
  loans: {
    relation: 'loans',
    config: true,
  },
});

// ============================================
// HANDLER
// ============================================

export const paymentGuaranteeType = tsr.router(contract.paymentGuaranteeType, {
  // ==========================================
  // LIST - GET /payment-guarantee-types
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
      } = buildQuery({ page, limit, search, where, sort }, PAYMENT_GUARANTEE_TYPE_QUERY_CONFIG);

      const [data, countResult] = await Promise.all([
        db.query.paymentGuaranteeTypes.findMany({
          where: whereClause,
          with: buildTypedIncludes(include, PAYMENT_GUARANTEE_TYPE_INCLUDES),
          orderBy: orderBy.length ? orderBy : undefined,
          limit: queryLimit,
          offset,
        }),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(paymentGuaranteeTypes)
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
        genericMsg: 'Error al listar garantías de pago',
      });
    }
  },

  // ==========================================
  // GET - GET /payment-guarantee-types/:id
  // ==========================================
  getById: async ({ params: { id }, query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const paymentGuaranteeType = await db.query.paymentGuaranteeTypes.findFirst({
        where: eq(paymentGuaranteeTypes.id, id),
        with: buildTypedIncludes(query?.include, PAYMENT_GUARANTEE_TYPE_INCLUDES),
      });

      if (!paymentGuaranteeType) {
        throwHttpError({
          status: 404,
          message: 'Garantía de pago no encontrada',
          code: 'NOT_FOUND',
        });
      }

      return { status: 200, body: paymentGuaranteeType };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: `Error al obtener garantía de pago ${id}`,
      });
    }
  },

  // ==========================================
  // CREATE - POST /payment-guarantee-types
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

      const newPaymentGuaranteeType = await db.transaction(async (tx) => {
        const [newPaymentGuaranteeType] = await tx
          .insert(paymentGuaranteeTypes)
          .values(body)
          .returning();

        return newPaymentGuaranteeType;
      });

      logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'create',
        functionName: 'create',
        resourceId: newPaymentGuaranteeType.id.toString(),
        resourceLabel: `${newPaymentGuaranteeType.name}`,
        status: 'success',
        afterValue: {
          ...newPaymentGuaranteeType,
        },
        ipAddress,
        userAgent,
      });

      return { status: 201, body: newPaymentGuaranteeType };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: 'Error al crear garantía de pago',
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
  // UPDATE - PATCH /payment-guarantee-types/:id
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

      const existing = await db.query.paymentGuaranteeTypes.findFirst({
        where: eq(paymentGuaranteeTypes.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Garantía de pago con ID ${id} no encontrada`,
          code: 'NOT_FOUND',
        });
      }

      const updated = await db.transaction(async (tx) => {
        const [updated] = await tx
          .update(paymentGuaranteeTypes)
          .set(body)
          .where(eq(paymentGuaranteeTypes.id, id))
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
        genericMsg: `Error al actualizar garantía de pago ${id}`,
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
  // DELETE - DELETE /payment-guarantee-types/:id
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

      const existing = await db.query.paymentGuaranteeTypes.findFirst({
        where: eq(paymentGuaranteeTypes.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Garantía de pago con ID ${id} no encontrada`,
          code: 'NOT_FOUND',
        });
      }

      await db.delete(paymentGuaranteeTypes).where(eq(paymentGuaranteeTypes.id, id));

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
        genericMsg: `Error al eliminar garantía de pago ${id}`,
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
