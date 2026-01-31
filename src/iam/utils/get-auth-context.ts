import { cookies } from 'next/headers';
import { verifyIamAccessToken, type IamAccessTokenPayload } from './verify-access-token';

export type AuthContext = IamAccessTokenPayload & {
  userId: string;
};

export async function getIamAuthContext(): Promise<AuthContext | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('timer_at')?.value;

  if (!accessToken) {
    return null;
  }

  try {
    const payload = await verifyIamAccessToken(accessToken);

    return {
      ...payload,
      userId: payload.sub as string,
    };
  } catch (e) {
    console.error('[timer] invalid access token:', e);
    return null;
  }
}
