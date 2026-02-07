import {
  CalculateCreditSimulationBodySchema,
  CalculateCreditSimulationResponseSchema,
} from '@/schemas/credit-simulation';
import { TsRestErrorSchema, TsRestMetaData } from '@/schemas/ts-rest';
import { initContract } from '@ts-rest/core';

const c = initContract();
const resourceKey = 'credit-simulation';

export const creditSimulation = c.router(
  {
    calculate: {
      method: 'POST',
      path: '/calculate',
      body: CalculateCreditSimulationBodySchema,
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey,
          actionKey: 'read',
        },
      } satisfies TsRestMetaData,
      responses: {
        200: CalculateCreditSimulationResponseSchema,
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        404: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
  },
  { pathPrefix: '/credit-simulation' }
);
