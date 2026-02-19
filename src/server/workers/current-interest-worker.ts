import { db, processRuns } from '@/server/db';
import { executeCurrentInterestProcessRun } from '@/server/causation/current-interest-run';
import { CURRENT_INTEREST_QUEUE_NAME } from '@/server/queues/current-interest-queue';
import { getBullMqRedisConnection } from '@/server/queues/redis';
import type { CurrentInterestJobData } from '@/server/causation/types';
import { Worker } from 'bullmq';
import { eq } from 'drizzle-orm';

declare global {
  var __currentInterestWorker: Worker<CurrentInterestJobData> | undefined;
}

export function startCurrentInterestWorker() {
  if (globalThis.__currentInterestWorker) {
    return globalThis.__currentInterestWorker;
  }

  const worker = new Worker<CurrentInterestJobData>(
    CURRENT_INTEREST_QUEUE_NAME,
    async (job) => {
      await executeCurrentInterestProcessRun(job.data.processRunId);
    },
    {
      connection: getBullMqRedisConnection(),
      concurrency: 1,
    }
  );

  worker.on('failed', async (job, error) => {
    const processRunId = Number(job?.data?.processRunId ?? 0);
    if (!Number.isFinite(processRunId) || processRunId <= 0) return;

    await db
      .update(processRuns)
      .set({
        status: 'FAILED',
        finishedAt: new Date(),
        note: `Error ejecutando corrida: ${error.message}`,
      })
      .where(eq(processRuns.id, processRunId));
  });

  globalThis.__currentInterestWorker = worker;
  return worker;
}
