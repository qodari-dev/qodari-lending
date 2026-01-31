import { initContract } from '@ts-rest/core';

const c = initContract();

export const user = c.router(
  {
    list: {
      method: 'GET',
      path: '/',
      responses: {
        204: c.noBody(),
      },
    },
  },
  { pathPrefix: '/users' }
);
