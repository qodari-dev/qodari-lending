import {
  CloseCausationPeriodBodySchema,
  CloseCausationPeriodResponseSchema,
  ProcessCausationCurrentInsuranceBodySchema,
  ProcessCausationCurrentInsuranceResponseSchema,
  ProcessCausationCurrentInterestBodySchema,
  ProcessCausationCurrentInterestResponseSchema,
  ProcessCausationLateInterestBodySchema,
  ProcessCausationLateInterestResponseSchema,
} from '@/schemas/causation';
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

export const causation = c.router(
  {
    processCurrentInterest: {
      method: 'POST',
      path: '/current-interest/process',
      body: ProcessCausationCurrentInterestBodySchema,
      metadata,
      responses: {
        200: ProcessCausationCurrentInterestResponseSchema,
        ...errorResponses,
      },
    },
    processLateInterest: {
      method: 'POST',
      path: '/late-interest/process',
      body: ProcessCausationLateInterestBodySchema,
      metadata,
      responses: {
        200: ProcessCausationLateInterestResponseSchema,
        ...errorResponses,
      },
    },
    processCurrentInsurance: {
      method: 'POST',
      path: '/current-insurance/process',
      body: ProcessCausationCurrentInsuranceBodySchema,
      metadata,
      responses: {
        200: ProcessCausationCurrentInsuranceResponseSchema,
        ...errorResponses,
      },
    },
    closePeriod: {
      method: 'POST',
      path: '/period-closing/close',
      body: CloseCausationPeriodBodySchema,
      metadata,
      responses: {
        200: CloseCausationPeriodResponseSchema,
        ...errorResponses,
      },
    },
  },
  { pathPrefix: '/causation' }
);
