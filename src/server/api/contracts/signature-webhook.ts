import {
  SignatureWebhookEventBodySchema,
  SignatureWebhookEventResponseSchema,
} from '@/schemas/signature-webhook';
import { TsRestErrorSchema, TsRestMetaData } from '@/schemas/ts-rest';
import { initContract } from '@ts-rest/core';

const c = initContract();

export const signatureWebhook = c.router(
  {
    event: {
      method: 'POST',
      path: '/events',
      body: SignatureWebhookEventBodySchema,
      metadata: {
        auth: 'public',
      } satisfies TsRestMetaData,
      responses: {
        200: SignatureWebhookEventResponseSchema,
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        404: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
  },
  { pathPrefix: '/signature-webhooks' }
);
