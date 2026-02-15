import {
  ExecuteLoanWriteOffBodySchema,
  ExecuteLoanWriteOffResponseSchema,
  GenerateLoanWriteOffProposalBodySchema,
  GenerateLoanWriteOffProposalResponseSchema,
  ReviewLoanWriteOffProposalBodySchema,
  ReviewLoanWriteOffProposalResponseSchema,
} from '@/schemas/loan-write-off';
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

export const loanWriteOff = c.router(
  {
    generateProposal: {
      method: 'POST',
      path: '/proposal/generate',
      body: GenerateLoanWriteOffProposalBodySchema,
      metadata,
      responses: {
        200: GenerateLoanWriteOffProposalResponseSchema,
        ...errorResponses,
      },
    },
    reviewProposal: {
      method: 'POST',
      path: '/proposal/review',
      body: ReviewLoanWriteOffProposalBodySchema,
      metadata,
      responses: {
        200: ReviewLoanWriteOffProposalResponseSchema,
        ...errorResponses,
      },
    },
    execute: {
      method: 'POST',
      path: '/execute',
      body: ExecuteLoanWriteOffBodySchema,
      metadata,
      responses: {
        200: ExecuteLoanWriteOffResponseSchema,
        ...errorResponses,
      },
    },
  },
  { pathPrefix: '/loan-write-off' }
);
