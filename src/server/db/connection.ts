import { env } from '@/env';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

export const db = drizzle({
  schema,
  connection: {
    connectionString: env.DATABASE_URL,
    ssl: env.NODE_ENV === 'production',
  },
  logger: env.NODE_ENV === 'development',
});
