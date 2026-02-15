import {
  ProcessLoanPaymentPayrollBodySchema,
  ProcessLoanPaymentPayrollResponseSchema,
} from '@/schemas/loan-payment-payroll';
import { TsRestErrorSchema, TsRestMetaData } from '@/schemas/ts-rest';
import { initContract } from '@ts-rest/core';

const c = initContract();
const resourceKey = 'loan-payments';

export const loanPaymentPayroll = c.router(
  {
    process: {
      method: 'POST',
      path: '/process',
      body: ProcessLoanPaymentPayrollBodySchema,
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey,
          actionKey: 'create',
        },
      } satisfies TsRestMetaData,
      responses: {
        200: ProcessLoanPaymentPayrollResponseSchema,
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        404: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
  },
  { pathPrefix: '/loan-payment-payroll' }
);
