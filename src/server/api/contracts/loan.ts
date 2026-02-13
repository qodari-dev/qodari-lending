import {
  GetLoanQuerySchema,
  GetLoanStatementQuerySchema,
  LiquidateLoanBodySchema,
  ListLoansQuerySchema,
  UpdateLoanBankInfoBodySchema,
  UpdateLoanLegalProcessBodySchema,
  UpdateLoanPaymentAgreementBodySchema,
  VoidLoanBodySchema,
} from '@/schemas/loan';
import type { LoanBalanceSummary, LoanStatement } from '@/schemas/loan';
import { IdParamSchema } from '@/schemas/shared';
import { TsRestErrorSchema, TsRestMetaData } from '@/schemas/ts-rest';
import { Loans } from '@/server/db';
import { Paginated } from '@/server/utils/query/schemas';
import { initContract } from '@ts-rest/core';

const c = initContract();
const resourceKey = 'loans';

export const loan = c.router(
  {
    list: {
      method: 'GET',
      path: '/',
      query: ListLoansQuerySchema,
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey,
          actionKey: 'read',
        },
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<Paginated<Loans>>(),
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
    getById: {
      method: 'GET',
      path: '/:id',
      pathParams: IdParamSchema,
      query: GetLoanQuerySchema,
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey,
          actionKey: 'read',
        },
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<Loans>(),
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        404: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
    liquidate: {
      method: 'POST',
      path: '/:id/liquidate',
      pathParams: IdParamSchema,
      body: LiquidateLoanBodySchema,
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey,
          actionKey: 'liquidate',
        },
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<Loans>(),
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        404: TsRestErrorSchema,
        409: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
    void: {
      method: 'POST',
      path: '/:id/void',
      pathParams: IdParamSchema,
      body: VoidLoanBodySchema,
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey,
          actionKey: 'void',
        },
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<Loans>(),
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        404: TsRestErrorSchema,
        409: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
    updateLegalProcess: {
      method: 'PATCH',
      path: '/:id/legal-process',
      pathParams: IdParamSchema,
      body: UpdateLoanLegalProcessBodySchema,
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey,
          actionKey: 'update',
        },
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<Loans>(),
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        404: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
    updatePaymentAgreement: {
      method: 'PATCH',
      path: '/:id/payment-agreement',
      pathParams: IdParamSchema,
      body: UpdateLoanPaymentAgreementBodySchema,
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey,
          actionKey: 'update',
        },
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<Loans>(),
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        404: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
    updateBankInfo: {
      method: 'PATCH',
      path: '/:id/bank-info',
      pathParams: IdParamSchema,
      body: UpdateLoanBankInfoBodySchema,
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey,
          actionKey: 'update-bank-info',
        },
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<Loans>(),
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        404: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
    getBalanceSummary: {
      method: 'GET',
      path: '/:id/balance-summary',
      pathParams: IdParamSchema,
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey,
          actionKey: 'read',
        },
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<LoanBalanceSummary>(),
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        404: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
    getStatement: {
      method: 'GET',
      path: '/:id/statement',
      pathParams: IdParamSchema,
      query: GetLoanStatementQuerySchema,
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey,
          actionKey: 'read',
        },
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<LoanStatement>(),
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        404: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
  },
  { pathPrefix: '/loans' }
);
