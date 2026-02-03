import { db, creditsSettings } from '@/server/db';
import { genericTsRestErrorResponse, throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { tsr } from '@ts-rest/serverless/next';
import { eq } from 'drizzle-orm';
import { contract } from '../contracts';

import { logAudit } from '@/server/utils/audit-logger';
import { UnifiedAuthContext } from '@/server/utils/auth-context';
import { getClientIp } from '@/server/utils/get-client-ip';
import { buildTypedIncludes, createIncludeMap } from '@/server/utils/query/include-builder';
import { env } from '@/env';

// ============================================
// CONFIG
// ============================================

const CREDITS_SETTINGS_INCLUDES = createIncludeMap<typeof db.query.creditsSettings>()({
  cashGlAccount: {
    relation: 'cashGlAccount',
    config: true,
  },
  majorGlAccount: {
    relation: 'majorGlAccount',
    config: true,
  },
  excessGlAccount: {
    relation: 'excessGlAccount',
    config: true,
  },
  pledgeSubsidyGlAccount: {
    relation: 'pledgeSubsidyGlAccount',
    config: true,
  },
  writeOffGlAccount: {
    relation: 'writeOffGlAccount',
    config: true,
  },
  defaultCostCenter: {
    relation: 'defaultCostCenter',
    config: true,
  },
});

// App slug por defecto para la configuración
const DEFAULT_APP_SLUG = env.IAM_APP_SLUG;

// ============================================
// HANDLER
// ============================================

export const creditsSettingsHandler = tsr.router(contract.creditsSettings, {
  // ==========================================
  // GET - GET /credits-settings
  // ==========================================
  get: async ({ query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      let settings = await db.query.creditsSettings.findFirst({
        where: eq(creditsSettings.appSlug, DEFAULT_APP_SLUG),
        with: buildTypedIncludes(query?.include, CREDITS_SETTINGS_INCLUDES),
      });

      // Si no existe, crear uno por defecto
      if (!settings) {
        const [newSettings] = await db
          .insert(creditsSettings)
          .values({
            appSlug: DEFAULT_APP_SLUG,
            accountingSystemCode: '01',
          })
          .returning();

        settings = await db.query.creditsSettings.findFirst({
          where: eq(creditsSettings.id, newSettings.id),
          with: buildTypedIncludes(query?.include, CREDITS_SETTINGS_INCLUDES),
        });
      }

      if (!settings) {
        throwHttpError({
          status: 404,
          message: 'Configuración no encontrada',
          code: 'NOT_FOUND',
        });
      }

      return { status: 200 as const, body: settings };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: 'Error al obtener configuración de créditos',
      });
    }
  },

  // ==========================================
  // UPDATE - PATCH /credits-settings
  // ==========================================
  update: async ({ body }, { request, appRoute, nextRequest }) => {
    let session: UnifiedAuthContext | undefined;
    const ipAddress = getClientIp(nextRequest);
    const userAgent = nextRequest.headers.get('user-agent');
    try {
      session = await getAuthContextAndValidatePermission(request, appRoute.metadata);
      if (!session) {
        throwHttpError({
          status: 401,
          message: 'Not authenticated',
          code: 'UNAUTHENTICATED',
        });
      }

      // Buscar configuración existente
      let existing = await db.query.creditsSettings.findFirst({
        where: eq(creditsSettings.appSlug, DEFAULT_APP_SLUG),
      });

      // Si no existe, crear una
      if (!existing) {
        const [newSettings] = await db
          .insert(creditsSettings)
          .values({
            appSlug: DEFAULT_APP_SLUG,
            accountingSystemCode: '01',
          })
          .returning();
        existing = newSettings;
      }

      // Actualizar
      const [updated] = await db
        .update(creditsSettings)
        .set(body)
        .where(eq(creditsSettings.id, existing.id))
        .returning();

      logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'update',
        resourceId: existing.id.toString(),
        resourceLabel: 'Configuración de Créditos',
        status: 'success',
        beforeValue: { ...existing },
        afterValue: { ...updated },
        ipAddress,
        userAgent,
      });

      return { status: 200 as const, body: updated };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: 'Error al actualizar configuración de créditos',
      });
      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'update',
        status: 'failure',
        errorMessage: error?.body.message,
        metadata: { body },
        ipAddress,
        userAgent,
      });
      return error;
    }
  },
});
