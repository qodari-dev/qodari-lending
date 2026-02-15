import {
  GenerateCancelledRejectedCreditsReportBodySchema,
  GenerateCancelledRejectedCreditsReportResponseSchema,
  GenerateCreditClearancePdfBodySchema,
  GenerateCreditClearancePdfResponseSchema,
  GenerateLiquidatedCreditsReportBodySchema,
  GenerateLiquidatedCreditsReportResponseSchema,
  GenerateMinutesPdfBodySchema,
  GenerateMinutesPdfResponseSchema,
  GenerateMovementVoucherReportBodySchema,
  GenerateMovementVoucherReportResponseSchema,
  GenerateNonLiquidatedCreditsReportBodySchema,
  GenerateNonLiquidatedCreditsReportResponseSchema,
  GeneratePaidInstallmentsReportBodySchema,
  GeneratePaidInstallmentsReportResponseSchema,
  GenerateSettledCreditsReportBodySchema,
  GenerateSettledCreditsReportResponseSchema,
  GenerateSuperintendenciaReportBodySchema,
  GenerateSuperintendenciaReportResponseSchema,
  GenerateThirdPartyClearancePdfBodySchema,
  GenerateThirdPartyClearancePdfResponseSchema,
} from '@/schemas/credit-report';
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
    generateCancelledRejectedCredits: {
      method: 'POST',
      path: '/cancelled-rejected-credits/generate',
      body: GenerateCancelledRejectedCreditsReportBodySchema,
      metadata,
      responses: { 200: GenerateCancelledRejectedCreditsReportResponseSchema, ...errorResponses },
    },
    generateMovementVoucher: {
      method: 'POST',
      path: '/movement-voucher/generate',
      body: GenerateMovementVoucherReportBodySchema,
      metadata,
      responses: { 200: GenerateMovementVoucherReportResponseSchema, ...errorResponses },
    },
    generateSettledCredits: {
      method: 'POST',
      path: '/settled-credits/generate',
      body: GenerateSettledCreditsReportBodySchema,
      metadata,
      responses: { 200: GenerateSettledCreditsReportResponseSchema, ...errorResponses },
    },
    generateSuperintendencia: {
      method: 'POST',
      path: '/superintendencia/generate',
      body: GenerateSuperintendenciaReportBodySchema,
      metadata,
      responses: { 200: GenerateSuperintendenciaReportResponseSchema, ...errorResponses },
    },
    generateMinutesPdf: {
      method: 'POST',
      path: '/minutes/pdf',
      body: GenerateMinutesPdfBodySchema,
      metadata,
      responses: { 200: GenerateMinutesPdfResponseSchema, ...errorResponses },
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
  },
  { pathPrefix: '/credit-reports' }
);
