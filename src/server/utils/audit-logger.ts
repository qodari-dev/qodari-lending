import { env } from '@/env';
import { UnifiedAuthContext } from './auth-context';
import { iamClient } from '@/iam/clients/iam-m2m-client';
import { CreateAuditLogBody } from '@/iam/clients/types';

export type AuditLogParams = {
  accountId?: string;

  // Actor (one of the two)
  actorType?: 'user' | 'api_client';
  userId?: string;
  userName?: string;
  apiClientId?: string;
  apiClientName?: string;

  // Context
  applicationId?: string;
  applicationName?: string;

  // Operation
  action: 'create' | 'update' | 'delete' | 'read' | 'login' | 'logout' | 'other';
  actionKey: string;
  resourceKey: string;
  functionName: string;
  resourceId?: string;
  resourceLabel?: string;

  // Request info
  ipAddress?: string | null;
  userAgent?: string | null;

  // Result
  status: 'success' | 'failure';
  errorMessage?: string;

  // Changes
  beforeValue?: Record<string, unknown>;
  afterValue?: Record<string, unknown>;

  // Extra
  metadata?: Record<string, unknown>;
};

/**
 * Log audit event to IAM service (non-blocking)
 * This function will not throw errors - audit failures should not break main operations
 */
export async function logAudit(
  session: UnifiedAuthContext | undefined,
  params: AuditLogParams
): Promise<void> {
  if (!session) return;

  // Build the payload for IAM audit endpoint
  const auditData: CreateAuditLogBody = {
    actorType: session.type,
    action: params.action,
    resourceKey: params.resourceKey,
    actionKey: params.actionKey,
    functionName: params.functionName,
    resourceId: params.resourceId,
    resourceLabel: params.resourceLabel,
    status: params.status,
    errorMessage: params.errorMessage,
    beforeValue: params.beforeValue,
    afterValue: params.afterValue,
    ipAddress: params.ipAddress ?? '',
    userAgent: params.userAgent ?? '',
    ...(session.type === 'api_client'
      ? {
          apiClientId: session.apiClientId,
          apiClientName: session.apiClientName,
          applicationId: session.applicationId,
          applicationName: session.applicationName,
        }
      : {
          applicationId: session.appId,
          applicationName: env.IAM_APP_SLUG,
        }),
    metadata: {
      ...(params.metadata ?? {}),
    },
  };

  // Add userId/userName only if it's a user (not API client)
  if (session.type === 'user') {
    auditData.userId = session.sub;
    auditData.userName = `${session.user?.firstName ?? ''} ${session.user?.lastName ?? ''}`.trim();
  }

  // Fire-and-forget: don't await and silently ignore errors
  // The client already handles errors internally with console.error
  iamClient.createAuditLog(auditData).catch(() => {
    // Silently ignore - errors are already logged in the client
  });
}
