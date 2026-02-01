import { TsRestErrorSchema, TsRestMetaData } from '@/schemas/ts-rest';
import { initContract } from '@ts-rest/core';

const c = initContract();

export const documentType = c.router(
  {
    list: {
      method: 'GET',
      path: '/',
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey: 'documentTypes',
          actionKey: 'read',
        },
      } satisfies TsRestMetaData,
      responses: {
        200: c.noBody(),
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
  },
  { pathPrefix: '/document-types' }
);
