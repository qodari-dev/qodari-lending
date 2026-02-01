import { initContract } from '@ts-rest/core';
import { documentType } from './document-type';
import { auth } from './auth';

const c = initContract();

export const contract = c.router(
  {
    documentType,
    auth,
  },
  {
    pathPrefix: '/api/v1',
  }
);

export type Contract = typeof contract;
