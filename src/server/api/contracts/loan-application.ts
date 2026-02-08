import {
  ApproveLoanApplicationBodySchema,
  CancelLoanApplicationBodySchema,
  CreateLoanApplicationBodySchema,
  GetLoanApplicationQuerySchema,
  ListLoanApplicationActNumbersQuerySchema,
  ListLoanApplicationsQuerySchema,
  PresignLoanApplicationDocumentBodySchema,
  PresignLoanApplicationDocumentViewBodySchema,
  PresignLoanApplicationDocumentViewResponseSchema,
  PresignLoanApplicationDocumentResponseSchema,
  RejectLoanApplicationBodySchema,
  UpdateLoanApplicationBodySchema,
} from '@/schemas/loan-application';
import { IdParamSchema } from '@/schemas/shared';
import { TsRestErrorSchema, TsRestMetaData } from '@/schemas/ts-rest';
import { LoanApplicationActNumbers, LoanApplications } from '@/server/db';
import { Paginated } from '@/server/utils/query/schemas';
import { initContract } from '@ts-rest/core';

const c = initContract();
const resourceKey = 'loan-applications';

export const loanApplication = c.router(
  {
    list: {
      method: 'GET',
      path: '/',
      query: ListLoanApplicationsQuerySchema,
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey,
          actionKey: 'read',
        },
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<Paginated<LoanApplications>>(),
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
    listActNumbers: {
      method: 'GET',
      path: '/act-numbers/list',
      query: ListLoanApplicationActNumbersQuerySchema,
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey,
          actionKey: 'read',
        },
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<LoanApplicationActNumbers[]>(),
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
      query: GetLoanApplicationQuerySchema,
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey,
          actionKey: 'read',
        },
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<LoanApplications>(),
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
      body: CreateLoanApplicationBodySchema,
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey,
          actionKey: 'create',
        },
      } satisfies TsRestMetaData,
      responses: {
        201: c.type<LoanApplications>(),
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
      body: UpdateLoanApplicationBodySchema,
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey,
          actionKey: 'update',
        },
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<LoanApplications>(),
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        404: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
    cancel: {
      method: 'POST',
      path: '/:id/cancel',
      pathParams: IdParamSchema,
      body: CancelLoanApplicationBodySchema,
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey,
          actionKey: 'cancel',
        },
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<LoanApplications>(),
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        404: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
    reject: {
      method: 'POST',
      path: '/:id/reject',
      pathParams: IdParamSchema,
      body: RejectLoanApplicationBodySchema,
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey,
          actionKey: 'reject',
        },
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<LoanApplications>(),
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        404: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
    approve: {
      method: 'POST',
      path: '/:id/approve',
      pathParams: IdParamSchema,
      body: ApproveLoanApplicationBodySchema,
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey,
          actionKey: 'approve',
        },
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<LoanApplications>(),
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        404: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
    presignDocumentUpload: {
      method: 'POST',
      path: '/documents/presign',
      body: PresignLoanApplicationDocumentBodySchema,
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey,
          actionKey: 'create',
        },
      } satisfies TsRestMetaData,
      responses: {
        200: PresignLoanApplicationDocumentResponseSchema,
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
    presignDocumentView: {
      method: 'POST',
      path: '/documents/presign-view',
      body: PresignLoanApplicationDocumentViewBodySchema,
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey,
          actionKey: 'read',
        },
      } satisfies TsRestMetaData,
      responses: {
        200: PresignLoanApplicationDocumentViewResponseSchema,
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
  },
  { pathPrefix: '/loan-applications' }
);
