import {
  CreditExtractReportResponse,
  GenerateCancelledRejectedCreditsReportBodySchema,
  GenerateCancelledRejectedCreditsReportResponseSchema,
  GenerateCreditClearancePdfBodySchema,
  GenerateCreditClearancePdfResponseSchema,
  GenerateLiquidatedCreditsReportBodySchema,
  GenerateLiquidatedCreditsReportResponseSchema,
  GenerateLiquidatedNotDisbursedCreditsReportBodySchema,
  GenerateLiquidatedNotDisbursedCreditsReportResponseSchema,
  GenerateMinutesPdfBodySchema,
  GenerateMinutesPdfResponseSchema,
  GenerateNonLiquidatedCreditsReportBodySchema,
  GenerateNonLiquidatedCreditsReportResponseSchema,
  GeneratePaidInstallmentsReportBodySchema,
  GeneratePaidInstallmentsReportResponseSchema,
  GenerateSettledCreditsReportBodySchema,
  GenerateSettledCreditsReportResponseSchema,
  GenerateThirdPartyClearancePdfBodySchema,
  GenerateThirdPartyClearancePdfResponseSchema,
  GetCreditExtractReportQuerySchema,
  ListMinutesReportOptionsResponseSchema,
} from '@/schemas/credit-report';
import { IdParamSchema } from '@/schemas/shared';
import { TsRestErrorSchema, TsRestMetaData } from '@/schemas/ts-rest';
import { initContract } from '@ts-rest/core';

const c = initContract();
const resourceKey = 'report-credits';

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

export const creditReport = c.router(
  {
    generatePaidInstallments: {
      method: 'POST',
      path: '/paid-installments/generate',
      body: GeneratePaidInstallmentsReportBodySchema,
      metadata,
      responses: { 200: GeneratePaidInstallmentsReportResponseSchema, ...errorResponses },
    },
    generateLiquidatedCredits: {
      method: 'POST',
      path: '/liquidated-credits/generate',
      body: GenerateLiquidatedCreditsReportBodySchema,
      metadata,
      responses: { 200: GenerateLiquidatedCreditsReportResponseSchema, ...errorResponses },
    },
    generateNonLiquidatedCredits: {
      method: 'POST',
      path: '/non-liquidated-credits/generate',
      body: GenerateNonLiquidatedCreditsReportBodySchema,
      metadata,
      responses: { 200: GenerateNonLiquidatedCreditsReportResponseSchema, ...errorResponses },
    },
    generateLiquidatedNotDisbursedCredits: {
      method: 'POST',
      path: '/liquidated-not-disbursed-credits/generate',
      body: GenerateLiquidatedNotDisbursedCreditsReportBodySchema,
      metadata,
      responses: {
        200: GenerateLiquidatedNotDisbursedCreditsReportResponseSchema,
        ...errorResponses,
      },
    },
    generateCancelledRejectedCredits: {
      method: 'POST',
      path: '/cancelled-rejected-credits/generate',
      body: GenerateCancelledRejectedCreditsReportBodySchema,
      metadata,
      responses: { 200: GenerateCancelledRejectedCreditsReportResponseSchema, ...errorResponses },
    },
    generateSettledCredits: {
      method: 'POST',
      path: '/settled-credits/generate',
      body: GenerateSettledCreditsReportBodySchema,
      metadata,
      responses: { 200: GenerateSettledCreditsReportResponseSchema, ...errorResponses },
    },
    generateMinutesPdf: {
      method: 'POST',
      path: '/minutes/pdf',
      body: GenerateMinutesPdfBodySchema,
      metadata,
      responses: { 200: GenerateMinutesPdfResponseSchema, ...errorResponses },
    },
    listMinutesOptions: {
      method: 'GET',
      path: '/minutes/options',
      query: c.type<Record<string, never>>(),
      metadata,
      responses: { 200: ListMinutesReportOptionsResponseSchema, ...errorResponses },
    },
    generateCreditClearancePdf: {
      method: 'POST',
      path: '/credit-clearance/pdf',
      body: GenerateCreditClearancePdfBodySchema,
      metadata,
      responses: { 200: GenerateCreditClearancePdfResponseSchema, ...errorResponses },
    },
    generateThirdPartyClearancePdf: {
      method: 'POST',
      path: '/third-party-clearance/pdf',
      body: GenerateThirdPartyClearancePdfBodySchema,
      metadata,
      responses: { 200: GenerateThirdPartyClearancePdfResponseSchema, ...errorResponses },
    },
    getExtract: {
      method: 'GET',
      path: '/extract',
      query: GetCreditExtractReportQuerySchema,
      metadata,
      responses: { 200: c.type<CreditExtractReportResponse>(), ...errorResponses },
    },
    getExtractByLoanId: {
      method: 'GET',
      path: '/extract/by-loan/:id',
      pathParams: IdParamSchema,
      query: c.type<Record<string, never>>(),
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey: 'loans',
          actionKey: 'read',
        },
      } satisfies TsRestMetaData,
      responses: { 200: c.type<CreditExtractReportResponse>(), ...errorResponses },
    },
  },
  { pathPrefix: '/credit-reports' }
);
