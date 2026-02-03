import { UnifiedAuthContext } from './auth-context';

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

//TODO: Implement audit logging enviando los datos a IAM audit log endpoint
export async function logAudit(
  session: UnifiedAuthContext | undefined,
  params: AuditLogParams
): Promise<void> {
  if (!session) return;
  const insertData = {
    ...params,
    ...(session.type === 'api_client'
      ? {
          actorType: 'api_client',
          apiClientId: session.apiClientId,
          apiClientName: session.apiClientName,
          applicationId: session.applicationId,
          applicationName: session.applicationName,
        }
      : {
          actorType: 'user',
          userId: session.sub,
          userName: `${session.user?.firstName} ${session.user?.lastName}`,
          applicationName: 'iam',
        }),
    accountId: session.accountId,
    errorMessage: params.errorMessage,
    beforeValue: params.beforeValue,
    afterValue: params.afterValue,
    metadata: params.metadata,
  };

  console.log(insertData);
  return;
}
