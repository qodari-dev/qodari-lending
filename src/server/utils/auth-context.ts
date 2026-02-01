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
  // M2M token (API Client with client_credentials grant)
  if (verifiedPayload.grantType === 'client_credentials') {
    return {
      type: 'api_client',
      apiClientId: verifiedPayload.sub,
      apiClientName: '',
      accountId: verifiedPayload.accountId,
      applicationId: verifiedPayload.appId,
      applicationName: '',
      permissions: verifiedPayload.permissions,
    };
  }

  // User token
  if (!verifiedPayload.user) {
    throwHttpError({
      status: 401,
      message: 'Invalid token: missing user info',
      code: 'INVALID_TOKEN',
    });
  }

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

/**
 * Unified authentication function that supports:
 * 1. Bearer token (User) - for regular users via API
 * 2. Bearer token (M2M) - for API Clients using client_credentials flow
 * 3. Cookie - for logged in users from web client (httpOnly cookie)
 *
 * Priority: Bearer token > Cookie
 */
export async function getUnifiedAuthContext(
  request: NextRequest | TsRestRequest
): Promise<UnifiedAuthContext> {
  // Try Bearer token first (for API clients and server components)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    return getAuthContext(token);
  }

  // Fallback to cookie (for web client with httpOnly cookie)
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').reduce(
      (acc, cookie) => {
        const [name, value] = cookie.trim().split('=');
        if (name && value) {
          acc[name] = value;
        }
        return acc;
      },
      {} as Record<string, string>
    );

    const token = cookies[env.ACCESS_TOKEN_NAME];
    if (token) {
      return getAuthContext(token);
    }
  }

  throwHttpError({
    status: 401,
    message: 'Not authenticated',
    code: 'UNAUTHENTICATED',
  });
}
