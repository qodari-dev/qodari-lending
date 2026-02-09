import { contract } from '@/server/api/contracts';
import {
  db,
  paymentAllocationPolicies,
  paymentAllocationPolicyRules,
} from '@/server/db';
import { logAudit } from '@/server/utils/audit-logger';
import { UnifiedAuthContext } from '@/server/utils/auth-context';
import { genericTsRestErrorResponse, throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { getClientIp } from '@/server/utils/get-client-ip';
import { buildTypedIncludes, createIncludeMap } from '@/server/utils/query/include-builder';
import {
  buildPaginationMeta,
  buildQuery,
  FieldMap,
  QueryConfig,
} from '@/server/utils/query/query-builder';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { tsr } from '@ts-rest/serverless/next';
import { asc, eq, sql } from 'drizzle-orm';

type PaymentAllocationPolicyColumn = keyof typeof paymentAllocationPolicies.$inferSelect;

const PAYMENT_ALLOCATION_POLICY_FIELDS: FieldMap = {
  id: paymentAllocationPolicies.id,
  name: paymentAllocationPolicies.name,
  overpaymentHandling: paymentAllocationPolicies.overpaymentHandling,
  isActive: paymentAllocationPolicies.isActive,
  createdAt: paymentAllocationPolicies.createdAt,
  updatedAt: paymentAllocationPolicies.updatedAt,
} satisfies Partial<
  Record<
    PaymentAllocationPolicyColumn,
    (typeof paymentAllocationPolicies)[PaymentAllocationPolicyColumn]
  >
>;

const PAYMENT_ALLOCATION_POLICY_QUERY_CONFIG: QueryConfig = {
  fields: PAYMENT_ALLOCATION_POLICY_FIELDS,
  searchFields: [paymentAllocationPolicies.name],
  defaultSort: { column: paymentAllocationPolicies.createdAt, order: 'desc' },
};

const PAYMENT_ALLOCATION_POLICY_INCLUDES =
  createIncludeMap<typeof db.query.paymentAllocationPolicies>()({
    paymentAllocationPolicyRules: {
      relation: 'paymentAllocationPolicyRules',
      config: {
        with: {
          billingConcept: true,
        },
        orderBy: [asc(paymentAllocationPolicyRules.priority)],
      },
    },
  });

function normalizePolicyPayload(
  payload: Partial<{
    name: string;
    note: string | null;
  }>
) {
  return {
    ...payload,
    ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
    ...(payload.note !== undefined ? { note: payload.note?.trim() || null } : {}),
  };
}

export const paymentAllocationPolicy = tsr.router(contract.paymentAllocationPolicy, {
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
        PAYMENT_ALLOCATION_POLICY_QUERY_CONFIG
      );

      const [data, countResult] = await Promise.all([
        db.query.paymentAllocationPolicies.findMany({
          where: whereClause,
          with: buildTypedIncludes(include, PAYMENT_ALLOCATION_POLICY_INCLUDES),
          orderBy: orderBy.length ? orderBy : undefined,
          limit: queryLimit,
          offset,
        }),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(paymentAllocationPolicies)
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
        genericMsg: 'Error al listar politicas de aplicacion de pagos',
      });
    }
  },

  getById: async ({ params: { id }, query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const item = await db.query.paymentAllocationPolicies.findFirst({
        where: eq(paymentAllocationPolicies.id, id),
        with: buildTypedIncludes(query?.include, PAYMENT_ALLOCATION_POLICY_INCLUDES),
      });

      if (!item) {
        throwHttpError({
          status: 404,
          message: 'not found',
          code: 'NOT_FOUND',
        });
      }

      return { status: 200 as const, body: item };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: `Error al obtener politica de aplicacion ${id}`,
      });
    }
  },

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

      const { paymentAllocationPolicyRules: rulesData, ...policyData } = body;
      const payload = {
        ...policyData,
        name: policyData.name.trim(),
        note: policyData.note?.trim() || null,
      };

      const [created] = await db.transaction(async (tx) => {
        const [policy] = await tx.insert(paymentAllocationPolicies).values(payload).returning();

        if (rulesData?.length) {
          await tx.insert(paymentAllocationPolicyRules).values(
            rulesData.map((rule) => ({
              ...rule,
              paymentAllocationPolicyId: policy.id,
            }))
          );
        }

        return [policy];
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
          _paymentAllocationPolicyRules: rulesData ?? [],
        },
        ipAddress,
        userAgent,
      });

      return { status: 201 as const, body: created };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: 'Error al crear politica de aplicacion de pagos',
      });

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'create',
        functionName: 'create',
        status: 'failure',
        errorMessage: error?.body.message,
        metadata: { body },
        ipAddress,
        userAgent,
      });

      return error;
    }
  },

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

      const existing = await db.query.paymentAllocationPolicies.findFirst({
        where: eq(paymentAllocationPolicies.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Politica de aplicacion con ID ${id} no encontrada`,
          code: 'NOT_FOUND',
        });
      }

      const existingRules = await db.query.paymentAllocationPolicyRules.findMany({
        where: eq(paymentAllocationPolicyRules.paymentAllocationPolicyId, id),
        orderBy: [asc(paymentAllocationPolicyRules.priority)],
      });

      const { paymentAllocationPolicyRules: rulesData, ...policyData } = body;
      const payload = normalizePolicyPayload(policyData);

      const [updated] = await db.transaction(async (tx) => {
        const [policyUpdated] = await tx
          .update(paymentAllocationPolicies)
          .set(payload)
          .where(eq(paymentAllocationPolicies.id, id))
          .returning();

        if (rulesData) {
          await tx
            .delete(paymentAllocationPolicyRules)
            .where(eq(paymentAllocationPolicyRules.paymentAllocationPolicyId, id));

          if (rulesData.length) {
            await tx.insert(paymentAllocationPolicyRules).values(
              rulesData.map((rule) => ({
                ...rule,
                paymentAllocationPolicyId: id,
              }))
            );
          }
        }

        return [policyUpdated];
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
          _paymentAllocationPolicyRules: existingRules,
        },
        afterValue: {
          ...updated,
          _paymentAllocationPolicyRules: rulesData ?? existingRules,
        },
        ipAddress,
        userAgent,
      });

      return { status: 200 as const, body: updated };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: `Error al actualizar politica de aplicacion ${id}`,
      });

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'update',
        resourceId: id.toString(),
        status: 'failure',
        errorMessage: error?.body.message,
        metadata: { body },
        ipAddress,
        userAgent,
      });

      return error;
    }
  },

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

      const existing = await db.query.paymentAllocationPolicies.findFirst({
        where: eq(paymentAllocationPolicies.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Politica de aplicacion con ID ${id} no encontrada`,
          code: 'NOT_FOUND',
        });
      }

      const existingRules = await db.query.paymentAllocationPolicyRules.findMany({
        where: eq(paymentAllocationPolicyRules.paymentAllocationPolicyId, id),
        orderBy: [asc(paymentAllocationPolicyRules.priority)],
      });

      const [deleted] = await db
        .delete(paymentAllocationPolicies)
        .where(eq(paymentAllocationPolicies.id, id))
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
          _paymentAllocationPolicyRules: existingRules,
        },
        afterValue: {
          ...deleted,
          _paymentAllocationPolicyRules: existingRules,
        },
        ipAddress,
        userAgent,
      });

      return { status: 200 as const, body: deleted };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: `Error al eliminar politica de aplicacion ${id}`,
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
