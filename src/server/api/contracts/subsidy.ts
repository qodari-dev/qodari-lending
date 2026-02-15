import {
  GenerateNotPerformedPledgesReportBodySchema,
  GenerateNotPerformedPledgesReportResponseSchema,
  GeneratePerformedPledgesReportBodySchema,
  GeneratePerformedPledgesReportResponseSchema,
  GeneratePledgePaymentVoucherBodySchema,
  GeneratePledgePaymentVoucherResponseSchema,
} from '@/schemas/subsidy';
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

export const subsidy = c.router(
  {
    generatePledgePaymentVoucher: {
      method: 'POST',
      path: '/pledge-payment-voucher/generate',
      body: GeneratePledgePaymentVoucherBodySchema,
      metadata,
      responses: {
        200: GeneratePledgePaymentVoucherResponseSchema,
        ...errorResponses,
      },
    },
    generatePerformedPledgesReport: {
      method: 'POST',
      path: '/pledges-performed-report/generate',
      body: GeneratePerformedPledgesReportBodySchema,
      metadata,
      responses: {
        200: GeneratePerformedPledgesReportResponseSchema,
        ...errorResponses,
      },
    },
    generateNotPerformedPledgesReport: {
      method: 'POST',
      path: '/pledges-not-performed-report/generate',
      body: GenerateNotPerformedPledgesReportBodySchema,
      metadata,
      responses: {
        200: GenerateNotPerformedPledgesReportResponseSchema,
        ...errorResponses,
      },
    },
  },
  { pathPrefix: '/subsidy' }
);
