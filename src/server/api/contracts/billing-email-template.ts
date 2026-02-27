import {
  CreateBillingEmailTemplateBodySchema,
  GetBillingEmailTemplateQuerySchema,
  ListBillingEmailTemplatesQuerySchema,
  UpdateBillingEmailTemplateBodySchema,
} from '@/schemas/billing-email-template';
import { IdParamSchema } from '@/schemas/shared';
import { TsRestErrorSchema, TsRestMetaData } from '@/schemas/ts-rest';
import { BillingEmailTemplates } from '@/server/db';
import { Paginated } from '@/server/utils/query/schemas';
import { initContract } from '@ts-rest/core';

const c = initContract();
const resourceKey = 'billing-email-templates';

export const billingEmailTemplate = c.router(
  {
    list: {
      method: 'GET',
      path: '/',
      query: ListBillingEmailTemplatesQuerySchema,
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey,
          actionKey: 'read',
        },
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<Paginated<BillingEmailTemplates>>(),
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
      query: GetBillingEmailTemplateQuerySchema,
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey,
          actionKey: 'read',
        },
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<BillingEmailTemplates>(),
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
      body: CreateBillingEmailTemplateBodySchema,
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey,
          actionKey: 'create',
        },
      } satisfies TsRestMetaData,
      responses: {
        201: c.type<BillingEmailTemplates>(),
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
      body: UpdateBillingEmailTemplateBodySchema,
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey,
          actionKey: 'update',
        },
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<BillingEmailTemplates>(),
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
        200: c.type<BillingEmailTemplates>(),
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        404: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
  },
  { pathPrefix: '/billing-email-templates' }
);
