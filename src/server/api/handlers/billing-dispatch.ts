import { agreementBillingEmailDispatches, db } from '@/server/db';
import { genericTsRestErrorResponse, throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { buildTypedIncludes, createIncludeMap } from '@/server/utils/query/include-builder';
import {
  buildPaginationMeta,
  buildQuery,
  FieldMap,
  QueryConfig,
} from '@/server/utils/query/query-builder';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { tsr } from '@ts-rest/serverless/next';
import { eq, sql } from 'drizzle-orm';
import { contract } from '../contracts';

type DispatchColumn = keyof typeof agreementBillingEmailDispatches.$inferSelect;

const DISPATCH_FIELDS: FieldMap = {
  id: agreementBillingEmailDispatches.id,
  agreementId: agreementBillingEmailDispatches.agreementId,
  billingCycleProfileId: agreementBillingEmailDispatches.billingCycleProfileId,
  period: agreementBillingEmailDispatches.period,
  scheduledDate: agreementBillingEmailDispatches.scheduledDate,
  status: agreementBillingEmailDispatches.status,
  triggerSource: agreementBillingEmailDispatches.triggerSource,
  dispatchNumber: agreementBillingEmailDispatches.dispatchNumber,
  attempts: agreementBillingEmailDispatches.attempts,
  totalBilledAmount: agreementBillingEmailDispatches.totalBilledAmount,
  totalCredits: agreementBillingEmailDispatches.totalCredits,
  createdAt: agreementBillingEmailDispatches.createdAt,
} satisfies Partial<
  Record<DispatchColumn, (typeof agreementBillingEmailDispatches)[DispatchColumn]>
>;

const DISPATCH_QUERY_CONFIG: QueryConfig = {
  fields: DISPATCH_FIELDS,
  searchFields: [agreementBillingEmailDispatches.period],
  defaultSort: { column: agreementBillingEmailDispatches.createdAt, order: 'desc' },
};

const DISPATCH_INCLUDES = createIncludeMap<
  typeof db.query.agreementBillingEmailDispatches
>()({
  agreement: {
    relation: 'agreement',
    config: true,
  },
  items: {
    relation: 'items',
    config: true,
  },
});

export const billingDispatch = tsr.router(contract.billingDispatch, {
  list: async ({ query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const { page, limit, search, where, sort, include } = query;

      const {
        whereClause,
        orderBy,
        limit: queryLimit,
        offset,
      } = buildQuery({ page, limit, search, where, sort }, DISPATCH_QUERY_CONFIG);

      const [data, countResult] = await Promise.all([
        db.query.agreementBillingEmailDispatches.findMany({
          where: whereClause,
          with: buildTypedIncludes(include, DISPATCH_INCLUDES),
          orderBy: orderBy.length ? orderBy : undefined,
          limit: queryLimit,
          offset,
        }),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(agreementBillingEmailDispatches)
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
        genericMsg: 'Error al listar despachos de facturación',
      });
    }
  },

  getById: async ({ params: { id }, query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const item = await db.query.agreementBillingEmailDispatches.findFirst({
        where: eq(agreementBillingEmailDispatches.id, id),
        with: buildTypedIncludes(query?.include, DISPATCH_INCLUDES),
      });

      if (!item) {
        throwHttpError({
          status: 404,
          message: 'not found',
          code: 'NOT_FOUND',
        });
      }

      return {
        status: 200 as const,
        body: item,
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: `Error al obtener despacho ${id}`,
      });
    }
  },
});
