import {
  DashboardSummaryResponseSchema,
  GetDashboardSummaryQuerySchema,
} from '@/schemas/dashboard';
import { TsRestErrorSchema, TsRestMetaData } from '@/schemas/ts-rest';
import { initContract } from '@ts-rest/core';

const c = initContract();
const resourceKey = 'dashboard';

export const dashboard = c.router(
  {
    getSummary: {
      method: 'GET',
      path: '/summary',
      query: GetDashboardSummaryQuerySchema,
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey,
          actionKey: 'read',
        },
      } satisfies TsRestMetaData,
      responses: {
        200: DashboardSummaryResponseSchema,
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        404: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
  },
  { pathPrefix: '/dashboard' }
);
