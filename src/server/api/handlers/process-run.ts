import { db, processRuns } from '@/server/db';
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

type ProcessRunColumn = keyof typeof processRuns.$inferSelect;

const PROCESS_RUN_FIELDS: FieldMap = {
  id: processRuns.id,
  processType: processRuns.processType,
  scopeType: processRuns.scopeType,
  scopeId: processRuns.scopeId,
  accountingPeriodId: processRuns.accountingPeriodId,
  processDate: processRuns.processDate,
  transactionDate: processRuns.transactionDate,
  triggerSource: processRuns.triggerSource,
  executedByUserId: processRuns.executedByUserId,
  executedByUserName: processRuns.executedByUserName,
  executedAt: processRuns.executedAt,
  startedAt: processRuns.startedAt,
  finishedAt: processRuns.finishedAt,
  status: processRuns.status,
  createdAt: processRuns.createdAt,
  updatedAt: processRuns.updatedAt,
} satisfies Partial<Record<ProcessRunColumn, (typeof processRuns)[ProcessRunColumn]>>;

const PROCESS_RUN_QUERY_CONFIG: QueryConfig = {
  fields: PROCESS_RUN_FIELDS,
  searchFields: [processRuns.executedByUserName, processRuns.note],
  defaultSort: { column: processRuns.createdAt, order: 'desc' },
};

const PROCESS_RUN_INCLUDES = createIncludeMap<typeof db.query.processRuns>()({
  accountingPeriod: {
    relation: 'accountingPeriod',
    config: true,
  },
});

export const processRun = tsr.router(contract.processRun, {
  list: async ({ query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const { page, limit, search, where, sort, include } = query;
      const {
        whereClause,
        orderBy,
        limit: queryLimit,
        offset,
      } = buildQuery({ page, limit, search, where, sort }, PROCESS_RUN_QUERY_CONFIG);

      const [data, countResult] = await Promise.all([
        db.query.processRuns.findMany({
          where: whereClause,
          with: buildTypedIncludes(include, PROCESS_RUN_INCLUDES),
          orderBy: orderBy.length ? orderBy : undefined,
          limit: queryLimit,
          offset,
        }),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(processRuns)
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
        genericMsg: 'Error al listar corridas de procesos',
      });
    }
  },

  getById: async ({ params: { id }, query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const run = await db.query.processRuns.findFirst({
        where: eq(processRuns.id, id),
        with: buildTypedIncludes(query?.include, PROCESS_RUN_INCLUDES),
      });

      if (!run) {
        throwHttpError({
          status: 404,
          message: 'not found',
          code: 'NOT_FOUND',
        });
      }

      return {
        status: 200 as const,
        body: run,
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: `Error al obtener corrida de proceso ${id}`,
      });
    }
  },
});
