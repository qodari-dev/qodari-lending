import {
  CreateLoanApprovalLevelBodySchema,
  GetLoanApprovalLevelQuerySchema,
  ListLoanApprovalLevelsQuerySchema,
  UpdateLoanApprovalLevelBodySchema,
} from '@/schemas/loan-approval-level';
import { IdParamSchema } from '@/schemas/shared';
import { TsRestErrorSchema, TsRestMetaData } from '@/schemas/ts-rest';
import { LoanApprovalLevels } from '@/server/db';
import { Paginated } from '@/server/utils/query/schemas';
import { initContract } from '@ts-rest/core';

const c = initContract();
const resourceKey = 'loan-approval-levels';

export const loanApprovalLevel = c.router(
  {
    list: {
      method: 'GET',
      path: '/',
      query: ListLoanApprovalLevelsQuerySchema,
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey,
          actionKey: 'read',
        },
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<Paginated<LoanApprovalLevels>>(),
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
      query: GetLoanApprovalLevelQuerySchema,
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey,
          actionKey: 'read',
        },
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<LoanApprovalLevels>(),
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        404: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
    create: {
      method: 'POST',
      path: '/',
      body: CreateLoanApprovalLevelBodySchema,
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey,
          actionKey: 'create',
        },
      } satisfies TsRestMetaData,
      responses: {
        201: c.type<LoanApprovalLevels>(),
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        409: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
    update: {
      method: 'PATCH',
      path: '/:id',
      pathParams: IdParamSchema,
      body: UpdateLoanApprovalLevelBodySchema,
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey,
          actionKey: 'update',
        },
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<LoanApprovalLevels>(),
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        404: TsRestErrorSchema,
        409: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
    delete: {
      method: 'DELETE',
      path: '/:id',
      pathParams: IdParamSchema,
      body: c.noBody(),
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey,
          actionKey: 'delete',
        },
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<LoanApprovalLevels>(),
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        404: TsRestErrorSchema,
        409: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
  },
  { pathPrefix: '/loan-approval-levels' }
);
