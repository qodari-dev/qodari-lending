import { cookies } from 'next/headers';
import { env } from '@/env';
import { AccessTokenPayload, verifyAccessToken } from './verify-access-token';

export type AuthContext = AccessTokenPayload & {
  userId: string;
};

export async function getIamAuthContext(): Promise<AuthContext | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(env.ACCESS_TOKEN_NAME)?.value;

  if (!accessToken) {
    return null;
  }

  try {
    const payload = await verifyAccessToken(accessToken, env.IAM_JWT_SECRET);

    return {
      ...payload,
      userId: payload.sub as string,
    };
  } catch (e) {
    console.error('[lending] invalid access token:', e);
    return null;
  }
}
