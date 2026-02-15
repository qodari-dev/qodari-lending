import {
  GenerateInsuranceReportBodySchema,
  GenerateInsuranceReportResponseSchema,
} from '@/schemas/insurance-report';
import { TsRestErrorSchema, TsRestMetaData } from '@/schemas/ts-rest';
import { initContract } from '@ts-rest/core';

const c = initContract();
const resourceKey = 'loans';

export const insuranceReport = c.router(
  {
    generate: {
      method: 'POST',
      path: '/generate',
      body: GenerateInsuranceReportBodySchema,
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey,
          actionKey: 'read',
        },
      } satisfies TsRestMetaData,
      responses: {
        200: GenerateInsuranceReportResponseSchema,
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        404: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
  },
  { pathPrefix: '/insurance-reports' }
);

