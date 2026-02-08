import { db, paymentReceiptTypes, userPaymentReceiptTypes } from '@/server/db';
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

type PaymentReceiptTypeColumn = keyof typeof paymentReceiptTypes.$inferSelect;

const PAYMENT_RECEIPT_TYPE_FIELDS: FieldMap = {
  id: paymentReceiptTypes.id,
  code: paymentReceiptTypes.code,
  name: paymentReceiptTypes.name,
  movementType: paymentReceiptTypes.movementType,
  glAccountId: paymentReceiptTypes.glAccountId,
  isActive: paymentReceiptTypes.isActive,
  createdAt: paymentReceiptTypes.createdAt,
  updatedAt: paymentReceiptTypes.updatedAt,
} satisfies Partial<
  Record<PaymentReceiptTypeColumn, (typeof paymentReceiptTypes)[PaymentReceiptTypeColumn]>
>;

const PAYMENT_RECEIPT_TYPE_QUERY_CONFIG: QueryConfig = {
  fields: PAYMENT_RECEIPT_TYPE_FIELDS,
  searchFields: [paymentReceiptTypes.code, paymentReceiptTypes.name],
  defaultSort: { column: paymentReceiptTypes.createdAt, order: 'desc' },
};

const PAYMENT_RECEIPT_TYPE_INCLUDES = createIncludeMap<typeof db.query.paymentReceiptTypes>()({
  glAccount: {
    relation: 'glAccount',
    config: true,
  },
  userPaymentReceiptTypes: {
    relation: 'userPaymentReceiptTypes',
    config: true,
  },
});

// ============================================
// HANDLER
// ============================================

export const paymentReceiptType = tsr.router(contract.paymentReceiptType, {
  // ==========================================
  // LIST - GET /payment-receipt-types
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
      } = buildQuery({ page, limit, search, where, sort }, PAYMENT_RECEIPT_TYPE_QUERY_CONFIG);

      const [data, countResult] = await Promise.all([
        db.query.paymentReceiptTypes.findMany({
          where: whereClause,
          with: buildTypedIncludes(include, PAYMENT_RECEIPT_TYPE_INCLUDES),
          orderBy: orderBy.length ? orderBy : undefined,
          limit: queryLimit,
          offset,
        }),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(paymentReceiptTypes)
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
        genericMsg: 'Error al listar tipos de recibos de abonos',
      });
    }
  },

  // ==========================================
  // GET - GET /payment-receipt-types/:id
  // ==========================================
  getById: async ({ params: { id }, query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const receiptType = await db.query.paymentReceiptTypes.findFirst({
        where: eq(paymentReceiptTypes.id, id),
        with: buildTypedIncludes(query?.include, PAYMENT_RECEIPT_TYPE_INCLUDES),
      });

      if (!receiptType) {
        throwHttpError({
          status: 404,
          message: 'not found',
          code: 'NOT_FOUND',
        });
      }

      return { status: 200, body: receiptType };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: `Error al obtener tipo de recibo de abonos ${id}`,
      });
    }
  },

  // ==========================================
  // CREATE - POST /payment-receipt-types
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

      const { userPaymentReceiptTypes: usersData, ...receiptTypeData } = body;

      const [created] = await db.transaction(async (tx) => {
        const [receiptType] = await tx
          .insert(paymentReceiptTypes)
          .values(receiptTypeData)
          .returning();

        if (usersData?.length) {
          await tx.insert(userPaymentReceiptTypes).values(
            usersData.map((user) => ({
              ...user,
              paymentReceiptTypeId: receiptType.id,
            }))
          );
        }

        return [receiptType];
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
          _userPaymentReceiptTypes: usersData ?? [],
        },
        ipAddress,
        userAgent,
      });

      return { status: 201, body: created };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: 'Error al crear tipo de recibo de abonos',
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
  // UPDATE - PATCH /payment-receipt-types/:id
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

      const existing = await db.query.paymentReceiptTypes.findFirst({
        where: eq(paymentReceiptTypes.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Tipo de recibo de abonos con ID ${id} no encontrado`,
          code: 'NOT_FOUND',
        });
      }

      const existingUsers = await db.query.userPaymentReceiptTypes.findMany({
        where: eq(userPaymentReceiptTypes.paymentReceiptTypeId, id),
      });

      const { userPaymentReceiptTypes: usersData, ...receiptTypeData } = body;

      const [updated] = await db.transaction(async (tx) => {
        const [receiptTypeUpdated] = await tx
          .update(paymentReceiptTypes)
          .set(receiptTypeData)
          .where(eq(paymentReceiptTypes.id, id))
          .returning();

        if (usersData?.length) {
          await tx
            .delete(userPaymentReceiptTypes)
            .where(eq(userPaymentReceiptTypes.paymentReceiptTypeId, id));

          if (usersData.length) {
            await tx.insert(userPaymentReceiptTypes).values(
              usersData.map((user) => ({
                ...user,
                paymentReceiptTypeId: id,
              }))
            );
          }
        }

        return [receiptTypeUpdated];
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
          _userPaymentReceiptTypes: existingUsers,
        },
        afterValue: {
          ...updated,
          _userPaymentReceiptTypes: usersData ?? existingUsers,
        },
        ipAddress,
        userAgent,
      });

      return { status: 200, body: updated };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: `Error al actualizar tipo de recibo de abonos ${id}`,
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
  // DELETE - DELETE /payment-receipt-types/:id
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

      const existing = await db.query.paymentReceiptTypes.findFirst({
        where: eq(paymentReceiptTypes.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Tipo de recibo de abonos con ID ${id} no encontrado`,
          code: 'NOT_FOUND',
        });
      }

      const existingUsers = await db.query.userPaymentReceiptTypes.findMany({
        where: eq(userPaymentReceiptTypes.paymentReceiptTypeId, id),
      });

      const [deleted] = await db
        .delete(paymentReceiptTypes)
        .where(eq(paymentReceiptTypes.id, id))
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
          _userPaymentReceiptTypes: existingUsers,
        },
        afterValue: {
          ...deleted,
          _userPaymentReceiptTypes: existingUsers,
        },
        ipAddress,
        userAgent,
      });

      return { status: 200, body: deleted };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: `Error al eliminar tipo de recibo de abonos ${id}`,
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
