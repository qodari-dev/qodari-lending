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
  provisionExpenseGlAccount: {
    relation: 'provisionExpenseGlAccount',
    config: true,
  },
  portfolioProvisionGlAccount: {
    relation: 'portfolioProvisionGlAccount',
    config: true,
  },
  provisionRecoveryGlAccount: {
    relation: 'provisionRecoveryGlAccount',
    config: true,
  },
  pledgeSubsidyGlAccount: {
    relation: 'pledgeSubsidyGlAccount',
    config: true,
  },
  pledgePaymentReceiptType: {
    relation: 'pledgePaymentReceiptType',
    config: true,
  },
  writeOffGlAccount: {
    relation: 'writeOffGlAccount',
    config: true,
  },
  refinancingReceiptType: {
    relation: 'refinancingReceiptType',
    config: true,
  },
});

const DEFAULT_APP_SLUG = env.IAM_APP_SLUG;

async function getOrCreateSettings() {
  const existing = await db.query.creditsSettings.findFirst({
    where: eq(creditsSettings.appSlug, DEFAULT_APP_SLUG),
  });
  if (existing) return existing;

  const [created] = await db
    .insert(creditsSettings)
    .values({ appSlug: DEFAULT_APP_SLUG, accountingSystemCode: '01' })
    .returning();
  return created;
}

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

      const base = await getOrCreateSettings();

      const settings = await db.query.creditsSettings.findFirst({
        where: eq(creditsSettings.id, base.id),
        with: buildTypedIncludes(query?.include, CREDITS_SETTINGS_INCLUDES),
      });

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

      const existing = await getOrCreateSettings();

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
