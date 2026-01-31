import { initContract } from '@ts-rest/core';
import { user } from './user';
import { auth } from './auth';

const c = initContract();

export const contract = c.router(
  {
    user,
    auth,
  },
  {
    pathPrefix: '/api/v1',
  }
);

export type Contract = typeof contract;
