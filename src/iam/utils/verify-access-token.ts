import { JWTPayload, jwtVerify } from 'jose';
import { JWSSignatureVerificationFailed, JWTExpired } from 'jose/errors';

const JWT_ALG = 'HS256';

function getJwtSecretKey(jwtSecret: string): Uint8Array {
  return new TextEncoder().encode(jwtSecret);
}

export type AccessTokenPayload = JWTPayload & {
  sub: string; // userId or apiClientId
  accountId: string; // current account
  appId: string; // application.id
  roles?: string[]; // slugs de roles de esa app en esa account (only for user tokens)
  permissions: string[]; // "resource:action" de esa app en esa account
  grantType?: 'client_credentials'; // Only for M2M tokens
  // Basic user info (only for user tokens, not M2M)
  user?: {
    email: string;
    firstName: string;
    lastName: string;
    isAdmin: boolean;
  };
};

export async function verifyAccessToken(token: string, jwtSecret: string) {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey(jwtSecret), {
      algorithms: [JWT_ALG],
    });
    return payload as AccessTokenPayload & {
      iss: string;
      aud: string | string[];
      exp: number;
      iat: number;
    };
  } catch (error) {
    if (error instanceof JWTExpired) {
      throw new Error('Token expired');
    }
    if (error instanceof JWSSignatureVerificationFailed) {
      throw new Error('Invalid signature');
    }
    throw new Error('Invalid token');
  }
}
