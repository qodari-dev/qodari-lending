import { env } from '@/env';
import { createIamRefreshHandler } from '@/iam/libs/refresh';

const handler = createIamRefreshHandler({
  tokenEndpoint: env.IAM_TOKEN_URL,
  clientId: env.IAM_CLIENT_ID,
  clientSecret: env.IAM_CLIENT_SECRET,
  accessTokenCookieName: env.ACCESS_TOKEN_NAME,
  refreshTokenCookieName: env.REFRESH_TOKEN_NAME,
  refreshTokenMaxAgeSeconds: 60 * 60 * 24 * 15,
});

export { handler as POST };
