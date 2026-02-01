import { contract } from '@/server/api/contracts';
import { createNextHandler } from '@ts-rest/serverless/next';
import { documentType } from './document-type';
import { auth } from './auth';

export const handler = createNextHandler(
  contract,
  { documentType, auth },
  {
    jsonQuery: true,
    responseValidation: true,
    handlerType: 'app-router',
  }
);
