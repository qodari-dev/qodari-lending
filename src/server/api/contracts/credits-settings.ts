import {
  GetCreditsSettingsQuerySchema,
  UpdateCreditsSettingsBodySchema,
} from '@/schemas/credits-settings';
import { TsRestErrorSchema, TsRestMetaData } from '@/schemas/ts-rest';
import { CreditsSettings } from '@/server/db';
import { initContract } from '@ts-rest/core';

const c = initContract();
const resourceKey = 'credits-settings';

export const creditsSettingsContract = c.router(
  {
    // GET /credits-settings - obtener configuración
    get: {
      method: 'GET',
      path: '/',
      query: GetCreditsSettingsQuerySchema,
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey,
          actionKey: 'read',
        },
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<CreditsSettings>(),
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        404: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
      summary: 'Obtener configuración de créditos',
    },

    // PATCH /credits-settings - actualizar configuración
    update: {
      method: 'PATCH',
      path: '/',
      body: UpdateCreditsSettingsBodySchema,
      metadata: {
        auth: 'required',
        permissionKey: {
          resourceKey,
          actionKey: 'update',
        },
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<CreditsSettings>(),
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        404: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
      summary: 'Actualizar configuración de créditos',
    },
  },
  {
    pathPrefix: '/credits-settings',
  }
);
