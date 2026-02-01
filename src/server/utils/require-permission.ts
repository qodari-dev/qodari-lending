import type { NextRequest } from 'next/server';
import { getUnifiedAuthContext, UnifiedAuthContext } from './auth-context';
import { throwHttpError } from './generic-ts-rest-error';
import { TsRestMetaData } from '@/schemas/ts-rest';
import { TsRestRequest } from '@ts-rest/serverless/next';

/**
 * Validates authentication and permissions based on route metadata.
 *
 * @returns UnifiedAuthContext if auth is required, undefined if public
 * @throws 401 if not authenticated (when auth is required)
 * @throws 403 if missing required permission
 */
export async function getAuthContextAndValidatePermission(
  request: NextRequest | TsRestRequest,
  metadata: TsRestMetaData
): Promise<UnifiedAuthContext | undefined> {
  // Public routes don't require authentication
  if (metadata.auth === 'public') {
    return undefined;
  }

  // Get authenticated context (throws 401 if not authenticated)
  const ctx = await getUnifiedAuthContext(request);

  // Build permission key if defined
  const permissionKey = metadata.permissionKey
    ? `${metadata.permissionKey.resourceKey}:${metadata.permissionKey.actionKey}`
    : undefined;

  // Skip permission check if:
  // - No permission key defined (only auth required)
  // - User is admin
  if (!permissionKey || (ctx.type === 'user' && ctx.user?.isAdmin)) {
    return ctx;
  }

  // Check if user/api-client has the required permission
  const hasPerm = ctx.permissions?.includes(permissionKey);

  if (!hasPerm) {
    throwHttpError({
      status: 403,
      message: 'Forbidden',
      code: 'FORBIDDEN',
    });
  }

  return ctx;
}
