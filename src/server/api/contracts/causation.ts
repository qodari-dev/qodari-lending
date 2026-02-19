import {
  CausationBillingConceptsRunStatusResponseSchema,
  CausationCurrentInsuranceRunStatusResponseSchema,
  CausationCurrentInterestRunStatusResponseSchema,
  CausationLateInterestRunStatusResponseSchema,
  CloseCausationPeriodBodySchema,
  CloseCausationPeriodResponseSchema,
  ProcessCausationBillingConceptsBodySchema,
  ProcessCausationBillingConceptsResponseSchema,
  ProcessCausationCurrentInsuranceBodySchema,
  ProcessCausationCurrentInsuranceResponseSchema,
  ProcessCausationCurrentInterestBodySchema,
  ProcessCausationCurrentInterestResponseSchema,
  ProcessCausationLateInterestBodySchema,
  ProcessCausationLateInterestResponseSchema,
} from '@/schemas/causation';
import { IdParamSchema } from '@/schemas/shared';
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
    getCurrentInterestRun: {
      method: 'GET',
      path: '/current-interest/runs/:id',
      pathParams: IdParamSchema,
      query: c.type<Record<string, never>>(),
      metadata,
      responses: {
        200: CausationCurrentInterestRunStatusResponseSchema,
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
    getLateInterestRun: {
      method: 'GET',
      path: '/late-interest/runs/:id',
      pathParams: IdParamSchema,
      query: c.type<Record<string, never>>(),
      metadata,
      responses: {
        200: CausationLateInterestRunStatusResponseSchema,
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
    getCurrentInsuranceRun: {
      method: 'GET',
      path: '/current-insurance/runs/:id',
      pathParams: IdParamSchema,
      query: c.type<Record<string, never>>(),
      metadata,
      responses: {
        200: CausationCurrentInsuranceRunStatusResponseSchema,
        ...errorResponses,
      },
    },
    processBillingConcepts: {
      method: 'POST',
      path: '/billing-concepts/process',
      body: ProcessCausationBillingConceptsBodySchema,
      metadata,
      responses: {
        200: ProcessCausationBillingConceptsResponseSchema,
        ...errorResponses,
      },
    },
    getBillingConceptsRun: {
      method: 'GET',
      path: '/billing-concepts/runs/:id',
      pathParams: IdParamSchema,
      query: c.type<Record<string, never>>(),
      metadata,
      responses: {
        200: CausationBillingConceptsRunStatusResponseSchema,
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
