import {
  ProcessAccountingInterfaceCreditsBodySchema,
  ProcessAccountingInterfaceCreditsResponseSchema,
  ProcessAccountingInterfaceCurrentInterestBodySchema,
  ProcessAccountingInterfaceCurrentInterestResponseSchema,
  ProcessAccountingInterfaceLateInterestBodySchema,
  ProcessAccountingInterfaceLateInterestResponseSchema,
  ProcessAccountingInterfacePaymentsBodySchema,
  ProcessAccountingInterfacePaymentsResponseSchema,
  ProcessAccountingInterfaceWriteOffBodySchema,
  ProcessAccountingInterfaceWriteOffResponseSchema,
  ProcessAccountingInterfaceProvisionBodySchema,
  ProcessAccountingInterfaceProvisionResponseSchema,
} from '@/schemas/accounting-interface';
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

export const accountingInterface = c.router(
  {
    processCredits: {
      method: 'POST',
      path: '/credits/process',
      body: ProcessAccountingInterfaceCreditsBodySchema,
      metadata,
      responses: {
        200: ProcessAccountingInterfaceCreditsResponseSchema,
        ...errorResponses,
      },
    },
    processCurrentInterest: {
      method: 'POST',
      path: '/current-interest/process',
      body: ProcessAccountingInterfaceCurrentInterestBodySchema,
      metadata,
      responses: {
        200: ProcessAccountingInterfaceCurrentInterestResponseSchema,
        ...errorResponses,
      },
    },
    processLateInterest: {
      method: 'POST',
      path: '/late-interest/process',
      body: ProcessAccountingInterfaceLateInterestBodySchema,
      metadata,
      responses: {
        200: ProcessAccountingInterfaceLateInterestResponseSchema,
        ...errorResponses,
      },
    },
    processPayments: {
      method: 'POST',
      path: '/payments/process',
      body: ProcessAccountingInterfacePaymentsBodySchema,
      metadata,
      responses: {
        200: ProcessAccountingInterfacePaymentsResponseSchema,
        ...errorResponses,
      },
    },
    processWriteOff: {
      method: 'POST',
      path: '/write-off/process',
      body: ProcessAccountingInterfaceWriteOffBodySchema,
      metadata,
      responses: {
        200: ProcessAccountingInterfaceWriteOffResponseSchema,
        ...errorResponses,
      },
    },
    processProvision: {
      method: 'POST',
      path: '/provision/process',
      body: ProcessAccountingInterfaceProvisionBodySchema,
      metadata,
      responses: {
        200: ProcessAccountingInterfaceProvisionResponseSchema,
        ...errorResponses,
      },
    },
  },
  { pathPrefix: '/accounting-interface' }
);
