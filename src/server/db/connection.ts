import { env } from '@/env';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import * as relations from './relations';

export const db = drizzle({
  schema: { ...schema, ...relations },
  connection: {
    connectionString: env.DATABASE_URL,
    ssl: env.NODE_ENV === 'production',
  },
  logger: env.NODE_ENV === 'development',
});
