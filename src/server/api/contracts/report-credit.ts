import {
  CreditExtractReportResponse,
  GetCreditExtractReportQuerySchema,
} from '@/schemas/report-credit';
import { TsRestErrorSchema, TsRestMetaData } from '@/schemas/ts-rest';
import { initContract } from '@ts-rest/core';

const c = initContract();
const resourceKey = 'report-credits';

export const reportCredit = c.router(
  {
    getExtract: {
      method: 'GET',
      path: '/extract',
      query: GetCreditExtractReportQuerySchema,
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey,
          actionKey: 'read',
        },
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<CreditExtractReportResponse>(),
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        404: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
  },
  { pathPrefix: '/report-credits' }
);
