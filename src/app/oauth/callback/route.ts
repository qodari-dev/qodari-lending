import { env } from '@/env';
import { createIamCallbackHandler } from '@/iam/libs/callback';

const handler = createIamCallbackHandler({
  tokenEndpoint: env.IAM_TOKEN_URL,
  clientId: env.IAM_CLIENT_ID,
  clientSecret: env.IAM_CLIENT_SECRET,
  redirectUri: env.IAM_REDIRECT_URI,
  accessTokenCookieName: env.ACCESS_TOKEN_NAME,
  refreshTokenCookieName: env.REFRESH_TOKEN_NAME,
  defaultRedirectPath: '/',
  refreshTokenMaxAgeSeconds: 60 * 60 * 24 * 15,
});

export { handler as GET };
