import { jwtVerify, type JWTPayload } from 'jose';
import { env } from '@/env';

export type IamAccessTokenPayload = JWTPayload & {
  sub: string;
  // TODO: Add implment how to get the data from me endpoint
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    isAdmin: boolean;
  };
  accountId: string;
  roles?: string[];
  permissions?: string[];
};

const secretKey = new TextEncoder().encode(env.IAM_JWT_SECRET);

export async function verifyIamAccessToken(token: string): Promise<IamAccessTokenPayload> {
  const { payload } = await jwtVerify(token, secretKey, {
    issuer: env.IAM_ISSUER,
    audience: env.IAM_CLIENT_ID,
  });

  return payload as IamAccessTokenPayload;
}
