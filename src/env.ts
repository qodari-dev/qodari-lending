import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  /*
   * Serverside Environment variables, not available on the client.
   * Will throw if you access these variables on the client.
   */
  server: {
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DATABASE_URL: z.url(),
    ACCESS_TOKEN_NAME: z.string(),
    REFRESH_TOKEN_NAME: z.string(),
    IAM_BASE_URL: z.string(),
    IAM_TOKEN_URL: z.string(),
    IAM_CLIENT_ID: z.string(),
    IAM_CLIENT_SECRET: z.string(),
    IAM_REDIRECT_URI: z.string(),
    IAM_ISSUER: z.string(),
    IAM_APP_SLUG: z.string(),
    IAM_SLUG: z.string(),
    IAM_JWT_SECRET: z.string(),
    IAM_M2M_CLIENT_ID: z.string(),
    IAM_M2M_CLIENT_SECRET: z.string(),
  },
  /*
   * Environment variables available on the client (and server).
   *
   * 💡 You'll get type errors if these are not prefixed with NEXT_PUBLIC_.
   */
  client: {
    NEXT_PUBLIC_API_URL: z.url(),
    NEXT_PUBLIC_APP_URL: z.url(),
    NEXT_PUBLIC_IAM_PORTAL_URL: z.url(),
  },
  /*
   * Specify what values should be validated by your schemas above.
   *
   * If you're using Next.js < 13.4.4, you'll need to specify the runtimeEnv manually
   * For Next.js >= 13.4.4, you can use the experimental__runtimeEnv option and
   * only specify client-side variables.
   */
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_IAM_PORTAL_URL: process.env.NEXT_PUBLIC_IAM_PORTAL_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    ACCESS_TOKEN_NAME: process.env.ACCESS_TOKEN_NAME,
    REFRESH_TOKEN_NAME: process.env.REFRESH_TOKEN_NAME,
    IAM_BASE_URL: process.env.IAM_BASE_URL,
    IAM_TOKEN_URL: process.env.IAM_TOKEN_URL,
    IAM_CLIENT_ID: process.env.IAM_CLIENT_ID,
    IAM_CLIENT_SECRET: process.env.IAM_CLIENT_SECRET,
    IAM_REDIRECT_URI: process.env.IAM_REDIRECT_URI,
    IAM_ISSUER: process.env.IAM_ISSUER,
    IAM_APP_SLUG: process.env.IAM_APP_SLUG,
    IAM_SLUG: process.env.IAM_SLUG,
    IAM_JWT_SECRET: process.env.IAM_JWT_SECRET,
    IAM_M2M_CLIENT_ID: process.env.IAM_M2M_CLIENT_ID,
    IAM_M2M_CLIENT_SECRET: process.env.IAM_M2M_CLIENT_SECRET,
  },
  // experimental__runtimeEnv: {
  //   NEXT_PUBLIC_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_PUBLISHABLE_KEY,
  // }
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
