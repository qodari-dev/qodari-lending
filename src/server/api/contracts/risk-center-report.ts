import {
  GenerateRiskCenterCifinBodySchema,
  GenerateRiskCenterCifinResponseSchema,
  GenerateRiskCenterDatacreditoBodySchema,
  GenerateRiskCenterDatacreditoResponseSchema,
} from '@/schemas/risk-center-report';
import { TsRestErrorSchema, TsRestMetaData } from '@/schemas/ts-rest';
import { initContract } from '@ts-rest/core';

const c = initContract();
const resourceKey = 'loans';

const metadata = {
  auth: 'required',
  permissionKey: {
    resourceKey,
    actionKey: 'read',
  },
} satisfies TsRestMetaData;

const errorResponses = {
  400: TsRestErrorSchema,
  401: TsRestErrorSchema,
  403: TsRestErrorSchema,
  404: TsRestErrorSchema,
  500: TsRestErrorSchema,
};

export const riskCenterReport = c.router(
  {
    generateCifin: {
      method: 'POST',
      path: '/cifin/generate',
      body: GenerateRiskCenterCifinBodySchema,
      metadata,
      responses: {
        200: GenerateRiskCenterCifinResponseSchema,
        ...errorResponses,
      },
    },
    generateDatacredito: {
      method: 'POST',
      path: '/datacredito/generate',
      body: GenerateRiskCenterDatacreditoBodySchema,
      metadata,
      responses: {
        200: GenerateRiskCenterDatacreditoResponseSchema,
        ...errorResponses,
      },
    },
  },
  { pathPrefix: '/risk-center-reports' }
);

