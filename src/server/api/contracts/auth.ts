import { TsRestErrorSchema } from '@/schemas/ts-rest';
import { initContract } from '@ts-rest/core';
import { z } from 'zod';

const c = initContract();

const LogoutResponseSchema = z.object({
  logoutUrl: z.string(),
});

export const auth = c.router(
  {
    logout: {
      method: 'POST',
      path: '/logout',
      summary: 'Logout - clears local cookies and returns IAM logout URL',
      body: c.noBody(),
      responses: {
        200: LogoutResponseSchema,
        400: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
  },
  { pathPrefix: '/auth' }
);
