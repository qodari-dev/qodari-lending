import {
  SimulateLoanRefinancingBodySchema,
  SimulateLoanRefinancingResponseSchema,
} from '@/schemas/loan-refinancing';
import { TsRestErrorSchema, TsRestMetaData } from '@/schemas/ts-rest';
import { initContract } from '@ts-rest/core';

const c = initContract();
const resourceKey = 'loans';

export const loanRefinancing = c.router(
  {
    simulate: {
      method: 'POST',
      path: '/simulate',
      body: SimulateLoanRefinancingBodySchema,
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey,
          actionKey: 'read',
        },
      } satisfies TsRestMetaData,
      responses: {
        200: SimulateLoanRefinancingResponseSchema,
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        404: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
  },
  { pathPrefix: '/loan-refinancing' }
);
