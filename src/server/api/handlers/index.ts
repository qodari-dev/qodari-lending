import { contract } from '@/server/api/contracts';
import { createNextHandler } from '@ts-rest/serverless/next';
import { user } from './user';
import { auth } from './auth';

export const handler = createNextHandler(
  contract,
  { user, auth },
  {
    jsonQuery: true,
    responseValidation: true,
    handlerType: 'app-router',
  }
);
