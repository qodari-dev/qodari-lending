import {
  GenerateBankFileBodySchema,
  GenerateBankFileResponseSchema,
  PreviewBankNoveltyBodySchema,
  PreviewBankNoveltyResponseSchema,
  ProcessBankNoveltyBodySchema,
  ProcessBankNoveltyResponseSchema,
} from '@/schemas/bank-file';
import { TsRestErrorSchema, TsRestMetaData } from '@/schemas/ts-rest';
import { initContract } from '@ts-rest/core';

const c = initContract();
const resourceKey = 'loans';

export const bankFile = c.router(
  {
    generate: {
      method: 'POST',
      path: '/generate',
      body: GenerateBankFileBodySchema,
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey,
          actionKey: 'read',
        },
      } satisfies TsRestMetaData,
      responses: {
        200: GenerateBankFileResponseSchema,
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        404: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
    previewNoveltyFile: {
      method: 'POST',
      path: '/preview-novelty-file',
      body: PreviewBankNoveltyBodySchema,
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey,
          actionKey: 'read',
        },
      } satisfies TsRestMetaData,
      responses: {
        200: PreviewBankNoveltyResponseSchema,
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
    processNoveltyFile: {
      method: 'POST',
      path: '/process-novelty-file',
      body: ProcessBankNoveltyBodySchema,
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey,
          actionKey: 'update',
        },
      } satisfies TsRestMetaData,
      responses: {
        200: ProcessBankNoveltyResponseSchema,
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        409: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
  },
  { pathPrefix: '/bank-files' }
);
