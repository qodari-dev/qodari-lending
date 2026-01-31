import { TsRestErrorSchema } from '@/schemas/ts-rest';
import { initContract } from '@ts-rest/core';

const c = initContract();

export const auth = c.router(
  {
    logout: {
      method: 'POST',
      path: '/logout',
      summary: 'Logout',
      body: c.noBody(),
      responses: {
        204: c.noBody(),
        400: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
  },
  { pathPrefix: '/auth' }
);
