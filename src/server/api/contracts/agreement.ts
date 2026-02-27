import {
  ListAgreementBillingEmailDispatchesQuerySchema,
  ListAgreementBillingEmailDispatchesResponseSchema,
  RetryAgreementBillingEmailDispatchResponseSchema,
  RunAgreementBillingEmailsBodySchema,
  RunAgreementBillingEmailsResponseSchema,
  CreateAgreementBodySchema,
  GetAgreementQuerySchema,
  ListAgreementsQuerySchema,
  UpdateAgreementBodySchema,
} from '@/schemas/agreement';
import { IdParamSchema } from '@/schemas/shared';
import { TsRestErrorSchema, TsRestMetaData } from '@/schemas/ts-rest';
import { Agreements } from '@/server/db';
import { Paginated } from '@/server/utils/query/schemas';
import { initContract } from '@ts-rest/core';

const c = initContract();
const resourceKey = 'agreements';

export const agreement = c.router(
  {
    list: {
      method: 'GET',
      path: '/',
      query: ListAgreementsQuerySchema,
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey,
          actionKey: 'read',
        },
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<Paginated<Agreements>>(),
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
      query: GetAgreementQuerySchema,
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey,
          actionKey: 'read',
        },
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<Agreements>(),
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
      body: CreateAgreementBodySchema,
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey,
          actionKey: 'create',
        },
      } satisfies TsRestMetaData,
      responses: {
        201: c.type<Agreements>(),
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
      summary: 'Actualizar convenio',
      pathParams: IdParamSchema,
      body: UpdateAgreementBodySchema,
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey,
          actionKey: 'update',
        },
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<Agreements>(),
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        404: TsRestErrorSchema,
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
        200: c.type<Agreements>(),
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        404: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
    runBillingEmails: {
      method: 'POST',
      path: '/run-billing-emails',
      body: RunAgreementBillingEmailsBodySchema,
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey,
          actionKey: 'run',
        },
      } satisfies TsRestMetaData,
      responses: {
        200: RunAgreementBillingEmailsResponseSchema,
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
    listBillingEmailDispatches: {
      method: 'GET',
      path: '/:id/billing-email-dispatches',
      pathParams: IdParamSchema,
      query: ListAgreementBillingEmailDispatchesQuerySchema,
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey,
          actionKey: 'read',
        },
      } satisfies TsRestMetaData,
      responses: {
        200: ListAgreementBillingEmailDispatchesResponseSchema,
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        404: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
    retryBillingEmailDispatch: {
      method: 'POST',
      path: '/billing-email-dispatches/:id/retry',
      pathParams: IdParamSchema,
      body: c.noBody(),
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey,
          actionKey: 'run',
        },
      } satisfies TsRestMetaData,
      responses: {
        200: RetryAgreementBillingEmailDispatchResponseSchema,
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        409: TsRestErrorSchema,
        404: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
  },
  { pathPrefix: '/agreements' }
);
