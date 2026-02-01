import { NextRequest } from 'next/server';
import { createIamProxy } from '@/iam/libs/proxy';
import { env } from '@/env';

const iamProxy = createIamProxy({
  iamBaseUrl: env.IAM_BASE_URL,
  clientId: env.IAM_CLIENT_ID,
  redirectUri: env.IAM_REDIRECT_URI,
  accessTokenCookieName: env.ACCESS_TOKEN_NAME,
  publicPaths: ['/oauth/callback'],
});

export default function proxy(request: NextRequest) {
  return iamProxy(request);
}

export const config = {
  matcher: ['/((?!_next|api/public|favicon.ico|public).*)'],
};
