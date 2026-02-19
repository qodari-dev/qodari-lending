import { env } from '@/env';
import type { ConnectionOptions } from 'bullmq';

function buildConnectionOptions(): ConnectionOptions {
  const redisUrl = new URL(env.REDIS_URL);
  const isTls = redisUrl.protocol === 'rediss:';
  const parsedDb = Number.parseInt(redisUrl.pathname.replace('/', '') || '0', 10);

  return {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || 6379),
    username: redisUrl.username || undefined,
    password: redisUrl.password || undefined,
    db: Number.isNaN(parsedDb) ? 0 : parsedDb,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    ...(isTls ? { tls: {} } : {}),
  };
}

declare global {
  var __bullmqRedisConnection: ConnectionOptions | undefined;
}

export function getBullMqRedisConnection() {
  if (!globalThis.__bullmqRedisConnection) {
    globalThis.__bullmqRedisConnection = buildConnectionOptions();
  }

  return globalThis.__bullmqRedisConnection;
}
