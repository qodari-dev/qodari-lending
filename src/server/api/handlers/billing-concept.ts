import { contract } from '@/server/api/contracts';
import { db, billingConcepts, billingConceptRules } from '@/server/db';
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
import { toDbDate } from '@/server/utils/value-utils';
import { tsr } from '@ts-rest/serverless/next';
import { eq, sql } from 'drizzle-orm';

// ============================================
// CONFIG
// ============================================

type BillingConceptColumn = keyof typeof billingConcepts.$inferSelect;

const BILLING_CONCEPT_FIELDS: FieldMap = {
  id: billingConcepts.id,
  code: billingConcepts.code,
  name: billingConcepts.name,
  isSystem: billingConcepts.isSystem,
  conceptType: billingConcepts.conceptType,
  defaultFrequency: billingConcepts.defaultFrequency,
  defaultFinancingMode: billingConcepts.defaultFinancingMode,
  defaultGlAccountId: billingConcepts.defaultGlAccountId,
  isActive: billingConcepts.isActive,
  createdAt: billingConcepts.createdAt,
  updatedAt: billingConcepts.updatedAt,
} satisfies Partial<Record<BillingConceptColumn, (typeof billingConcepts)[BillingConceptColumn]>>;

const BILLING_CONCEPT_QUERY_CONFIG: QueryConfig = {
  fields: BILLING_CONCEPT_FIELDS,
  searchFields: [billingConcepts.code, billingConcepts.name],
  defaultSort: { column: billingConcepts.createdAt, order: 'desc' },
};

const BILLING_CONCEPT_INCLUDES = createIncludeMap<typeof db.query.billingConcepts>()({
  defaultGlAccount: {
    relation: 'defaultGlAccount',
    config: true,
  },
  billingConceptRules: {
    relation: 'billingConceptRules',
    config: true,
  },
});

function normalizeRuleDates<
  T extends {
    effectiveFrom?: Date | null;
    effectiveTo?: Date | null;
  },
>(rule: T): Omit<T, 'effectiveFrom' | 'effectiveTo'> & {
  effectiveFrom: string | null | undefined;
  effectiveTo: string | null | undefined;
} {
  return {
    ...rule,
    effectiveFrom: toDbDate(rule.effectiveFrom),
    effectiveTo: toDbDate(rule.effectiveTo),
  };
}

function normalizeNullableDecimal(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeRuleByCalcMethod<
  T extends {
    rate?: string | null;
    amount?: string | null;
    valueFrom?: string | null;
    valueTo?: string | null;
  },
>(
  rule: T,
  calcMethod: 'FIXED_AMOUNT' | 'PERCENTAGE' | 'TIERED_FIXED_AMOUNT' | 'TIERED_PERCENTAGE'
): Omit<T, 'rate' | 'amount' | 'valueFrom' | 'valueTo'> & {
  rate: string | null;
  amount: string | null;
  valueFrom: string | null;
  valueTo: string | null;
} {
  const isTiered = calcMethod === 'TIERED_FIXED_AMOUNT' || calcMethod === 'TIERED_PERCENTAGE';
  const usesRate = calcMethod === 'PERCENTAGE' || calcMethod === 'TIERED_PERCENTAGE';
  const usesAmount = calcMethod === 'FIXED_AMOUNT' || calcMethod === 'TIERED_FIXED_AMOUNT';

  return {
    ...rule,
    rate: usesRate ? normalizeNullableDecimal(rule.rate) : null,
    amount: usesAmount ? normalizeNullableDecimal(rule.amount) : null,
    valueFrom: isTiered ? normalizeNullableDecimal(rule.valueFrom) : null,
    valueTo: isTiered ? normalizeNullableDecimal(rule.valueTo) : null,
  };
}

// ============================================
// HANDLER
// ============================================

export const billingConcept = tsr.router(contract.billingConcept, {
  list: async ({ query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const { page, limit, search, where, sort, include } = query;
      const {
        whereClause,
        orderBy,
        limit: queryLimit,
        offset,
      } = buildQuery({ page, limit, search, where, sort }, BILLING_CONCEPT_QUERY_CONFIG);

      const [data, countResult] = await Promise.all([
        db.query.billingConcepts.findMany({
          where: whereClause,
          with: buildTypedIncludes(include, BILLING_CONCEPT_INCLUDES),
          orderBy: orderBy.length ? orderBy : undefined,
          limit: queryLimit,
          offset,
        }),
        db.select({ count: sql<number>`count(*)::int` }).from(billingConcepts).where(whereClause),
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
        genericMsg: 'Error al listar conceptos de facturacion',
      });
    }
  },

  getById: async ({ params: { id }, query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const concept = await db.query.billingConcepts.findFirst({
        where: eq(billingConcepts.id, id),
        with: buildTypedIncludes(query?.include, BILLING_CONCEPT_INCLUDES),
      });

      if (!concept) {
        throwHttpError({
          status: 404,
          message: 'not found',
          code: 'NOT_FOUND',
        });
      }

      return { status: 200, body: concept };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: `Error al obtener concepto de facturacion ${id}`,
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

      const { billingConceptRules: rulesData, ...conceptData } = body;
      const normalizedRules = rulesData?.map((rule) =>
        normalizeRuleByCalcMethod(rule, conceptData.calcMethod)
      );

      const [created] = await db.transaction(async (tx) => {
        const [concept] = await tx.insert(billingConcepts).values(conceptData).returning();

        if (normalizedRules?.length) {
          await tx.insert(billingConceptRules).values(
            normalizedRules.map((rule) => ({
              ...normalizeRuleDates(rule),
              billingConceptId: concept.id,
            }))
          );
        }

        return [concept];
      });

      logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'create',
        functionName: 'create',
        resourceId: created.id.toString(),
        resourceLabel: `${created.code} - ${created.name}`,
        status: 'success',
        afterValue: {
          ...created,
          _billingConceptRules: normalizedRules ?? [],
        },
        ipAddress,
        userAgent,
      });

      return { status: 201, body: created };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: 'Error al crear concepto de facturacion',
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

      const existing = await db.query.billingConcepts.findFirst({
        where: eq(billingConcepts.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Concepto de facturacion con ID ${id} no encontrado`,
          code: 'NOT_FOUND',
        });
      }

      const existingRules = await db.query.billingConceptRules.findMany({
        where: eq(billingConceptRules.billingConceptId, id),
      });

      const { billingConceptRules: rulesData, ...conceptData } = body;
      const effectiveCalcMethod = conceptData.calcMethod ?? existing.calcMethod;
      const normalizedRules = rulesData?.map((rule) =>
        normalizeRuleByCalcMethod(rule, effectiveCalcMethod)
      );

      const [updated] = await db.transaction(async (tx) => {
        const [conceptUpdated] = await tx
          .update(billingConcepts)
          .set(conceptData)
          .where(eq(billingConcepts.id, id))
          .returning();

        if (normalizedRules) {
          await tx.delete(billingConceptRules).where(eq(billingConceptRules.billingConceptId, id));

          if (normalizedRules.length) {
            await tx.insert(billingConceptRules).values(
              normalizedRules.map((rule) => ({
                ...normalizeRuleDates(rule),
                billingConceptId: id,
              }))
            );
          }
        }

        return [conceptUpdated];
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
          _billingConceptRules: existingRules,
        },
        afterValue: {
          ...updated,
          _billingConceptRules: normalizedRules ?? existingRules,
        },
        ipAddress,
        userAgent,
      });

      return { status: 200, body: updated };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: `Error al actualizar concepto de facturacion ${id}`,
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

      const existing = await db.query.billingConcepts.findFirst({
        where: eq(billingConcepts.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Concepto de facturacion con ID ${id} no encontrado`,
          code: 'NOT_FOUND',
        });
      }

      const existingRules = await db.query.billingConceptRules.findMany({
        where: eq(billingConceptRules.billingConceptId, id),
      });

      const [deleted] = await db.delete(billingConcepts).where(eq(billingConcepts.id, id)).returning();

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
          _billingConceptRules: existingRules,
        },
        afterValue: {
          ...deleted,
          _billingConceptRules: existingRules,
        },
        ipAddress,
        userAgent,
      });

      return { status: 200, body: deleted };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: `Error al eliminar concepto de facturacion ${id}`,
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
