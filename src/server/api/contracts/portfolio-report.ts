import {
  GenerateCreditBalanceCertificateBodySchema,
  GenerateCreditBalanceCertificateResponseSchema,
  GenerateCreditsForCollectionBodySchema,
  GenerateCreditsForCollectionResponseSchema,
  GenerateCurrentPortfolioBodySchema,
  GenerateCurrentPortfolioResponseSchema,
  GenerateHistoricalPortfolioByPeriodBodySchema,
  GenerateHistoricalPortfolioByPeriodResponseSchema,
  GeneratePayrollPortfolioByAgreementBodySchema,
  GeneratePayrollPortfolioByAgreementResponseSchema,
  GeneratePortfolioByCreditTypeBodySchema,
  GeneratePortfolioByCreditTypeResponseSchema,
  GeneratePortfolioIndicatorsBodySchema,
  GeneratePortfolioIndicatorsResponseSchema,
  GenerateThirdPartyBalanceCertificateBodySchema,
  GenerateThirdPartyBalanceCertificateResponseSchema,
} from '@/schemas/portfolio-report';
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

export const portfolioReport = c.router(
  {
    generateCurrentPortfolio: {
      method: 'POST',
      path: '/current-portfolio/generate',
      body: GenerateCurrentPortfolioBodySchema,
      metadata,
      responses: {
        200: GenerateCurrentPortfolioResponseSchema,
        ...errorResponses,
      },
    },
    generateHistoricalPortfolioByPeriod: {
      method: 'POST',
      path: '/historical-portfolio-by-period/generate',
      body: GenerateHistoricalPortfolioByPeriodBodySchema,
      metadata,
      responses: {
        200: GenerateHistoricalPortfolioByPeriodResponseSchema,
        ...errorResponses,
      },
    },
    generateCreditsForCollection: {
      method: 'POST',
      path: '/credits-for-collection/generate',
      body: GenerateCreditsForCollectionBodySchema,
      metadata,
      responses: {
        200: GenerateCreditsForCollectionResponseSchema,
        ...errorResponses,
      },
    },
    generatePayrollPortfolioByAgreement: {
      method: 'POST',
      path: '/payroll-portfolio-by-agreement/generate',
      body: GeneratePayrollPortfolioByAgreementBodySchema,
      metadata,
      responses: {
        200: GeneratePayrollPortfolioByAgreementResponseSchema,
        ...errorResponses,
      },
    },
    generatePortfolioByCreditType: {
      method: 'POST',
      path: '/portfolio-by-credit-type/generate',
      body: GeneratePortfolioByCreditTypeBodySchema,
      metadata,
      responses: {
        200: GeneratePortfolioByCreditTypeResponseSchema,
        ...errorResponses,
      },
    },
    generateCreditBalanceCertificate: {
      method: 'POST',
      path: '/credit-balance-certificate/generate',
      body: GenerateCreditBalanceCertificateBodySchema,
      metadata,
      responses: {
        200: GenerateCreditBalanceCertificateResponseSchema,
        ...errorResponses,
      },
    },
    generateThirdPartyBalanceCertificate: {
      method: 'POST',
      path: '/third-party-balance-certificate/generate',
      body: GenerateThirdPartyBalanceCertificateBodySchema,
      metadata,
      responses: {
        200: GenerateThirdPartyBalanceCertificateResponseSchema,
        ...errorResponses,
      },
    },
    generatePortfolioIndicators: {
      method: 'POST',
      path: '/portfolio-indicators/generate',
      body: GeneratePortfolioIndicatorsBodySchema,
      metadata,
      responses: {
        200: GeneratePortfolioIndicatorsResponseSchema,
        ...errorResponses,
      },
    },
  },
  { pathPrefix: '/portfolio-reports' }
);
