import { genericTsRestErrorResponse } from '@/server/utils/generic-ts-rest-error';
import { tsr } from '@ts-rest/serverless/next';
import { contract } from '../contracts';
import { cookies } from 'next/headers';
import { env } from '@/env';

const secure = env.NODE_ENV === 'production';

/**
 * Build IAM logout URL
 * GET /oauth/logout?client_id=xxx
 */
function buildIamLogoutUrl(): string {
  const url = new URL('/oauth/logout', env.IAM_BASE_URL);
  url.searchParams.set('client_id', env.IAM_CLIENT_ID);
  return url.toString();
}

export const auth = tsr.router(contract.auth, {
  // --------------------------------------
  // POST - /logout
  // --------------------------------------
  logout: async () => {
    try {
      const cookieStore = await cookies();

      // Clear access token
      cookieStore.set(env.ACCESS_TOKEN_NAME, '', {
        httpOnly: true,
        secure,
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      });

      // Clear refresh token
      cookieStore.set(env.REFRESH_TOKEN_NAME, '', {
        httpOnly: true,
        secure,
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      });

      // Return IAM logout URL for client to redirect
      const logoutUrl = buildIamLogoutUrl();

      return {
        status: 200,
        body: { logoutUrl },
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: 'Something went wrong during logout.',
        logPrefix: '[auth.logout]',
      });
    }
  },
});
