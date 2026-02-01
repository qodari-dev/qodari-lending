import type { NextRequest } from 'next/server';

import { throwHttpError } from './generic-ts-rest-error';
import { TsRestRequest } from '@ts-rest/serverless/next';
import { AuthContext } from '@/iam/utils/get-auth-context';
import { env } from '@/env';
import { AccessTokenPayload, verifyAccessToken } from '@/iam/utils/verify-access-token';

// M2M Auth Context for API Clients using Bearer tokens
export type M2MAuthContext = {
  type: 'api_client';
  apiClientId: string;
  apiClientName: string;
  accountId: string;
  applicationId: string;
  applicationName: string;
  permissions: string[];
};

// Unified Auth Context that can be either user or API client
export type UnifiedAuthContext = (AuthContext & { type: 'user' }) | M2MAuthContext;

/**
 * Get Auth Context from Bearer token
 * Used for Users & API Clients
 */
export async function getAuthContext(token: string): Promise<UnifiedAuthContext> {
  const tokenParts = token.split('.');
  if (tokenParts.length !== 3) {
    throwHttpError({
      status: 401,
      message: 'Invalid token format',
      code: 'INVALID_TOKEN',
    });
  }

  let verifiedPayload: AccessTokenPayload;
  try {
    verifiedPayload = await verifyAccessToken(token, env.IAM_JWT_SECRET);
  } catch (error) {
    throwHttpError({
      status: 401,
      message: error instanceof Error ? error.message : 'Invalid token',
      code: 'INVALID_TOKEN',
    });
  }
  if (!verifiedPayload.grantType && verifiedPayload.user) {
    // User token
    return {
      type: 'user',
      sub: verifiedPayload.sub,
      accountId: verifiedPayload.accountId,
      appId: verifiedPayload.appId,
      userId: verifiedPayload.sub,
      roles: verifiedPayload.roles,
      permissions: verifiedPayload.permissions,
      user: {
        email: verifiedPayload.user.email,
        firstName: verifiedPayload.user.firstName,
        lastName: verifiedPayload.user.lastName,
        isAdmin: verifiedPayload.user.isAdmin,
      },
    };
  }

  //M2M token
  if (verifiedPayload.grantType !== 'client_credentials') {
    throwHttpError({
      status: 401,
      message: 'Invalid token type for M2M authentication',
      code: 'INVALID_TOKEN_TYPE',
    });
  }

  return {
    type: 'api_client',
    apiClientId: '',
    apiClientName: '',
    accountId: verifiedPayload.accountId,
    applicationId: verifiedPayload.appId,
    applicationName: '',
    permissions: verifiedPayload.permissions,
  };
}

/**
 * Unified authentication function that supports both:
 * 1. Bearer token (Uuser) - for regular users
 * 2. Bearer token (M2M) - for API Clients using client_credentials flow
 *
 * Priority: Bearer token
 */
export async function getUnifiedAuthContext(
  request: NextRequest | TsRestRequest
): Promise<UnifiedAuthContext> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throwHttpError({
      status: 401,
      message: 'Not authenticated',
      code: 'UNAUTHENTICATED',
    });
  }
  const token = authHeader.slice(7);
  const authContext = await getAuthContext(token);
  return authContext;
}
