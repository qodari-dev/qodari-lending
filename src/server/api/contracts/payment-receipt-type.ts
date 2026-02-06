import {
  CreatePaymentReceiptTypeBodySchema,
  GetPaymentReceiptTypeQuerySchema,
  ListPaymentReceiptTypesQuerySchema,
  UpdatePaymentReceiptTypeBodySchema,
} from '@/schemas/payment-receipt-type';
import { IdParamSchema } from '@/schemas/shared';
import { TsRestErrorSchema, TsRestMetaData } from '@/schemas/ts-rest';
import { Paginated } from '@/server/utils/query/schemas';

import { PaymentReceiptTypes } from '@/server/db';
import { initContract } from '@ts-rest/core';

const c = initContract();
const resourceKey = 'payment-receipt-types';

export const paymentReceiptType = c.router(
  {
    list: {
      method: 'GET',
      path: '/',
      query: ListPaymentReceiptTypesQuerySchema,
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey,
          actionKey: 'read',
        },
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<Paginated<PaymentReceiptTypes>>(),
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
    getById: {
      method: 'GET',
      path: `/:id`,
      pathParams: IdParamSchema,
      query: GetPaymentReceiptTypeQuerySchema,
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey,
          actionKey: 'read',
        },
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<PaymentReceiptTypes>(),
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
      body: CreatePaymentReceiptTypeBodySchema,
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey,
          actionKey: 'create',
        },
      } satisfies TsRestMetaData,
      responses: {
        201: c.type<PaymentReceiptTypes>(),
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
      summary: 'Actualizar tipo de recibo de abonos',
      pathParams: IdParamSchema,
      body: UpdatePaymentReceiptTypeBodySchema,
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey,
          actionKey: 'update',
        },
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<PaymentReceiptTypes>(),
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
        200: c.type<PaymentReceiptTypes>(),
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        404: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
  },
  { pathPrefix: '/payment-receipt-types' }
);
