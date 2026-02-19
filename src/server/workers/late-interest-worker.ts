import { executeLateInterestProcessRun } from '@/server/causation/late-interest-run';
import type { LateInterestJobData } from '@/server/causation/types';
import { db, processRuns } from '@/server/db';
import { LATE_INTEREST_QUEUE_NAME } from '@/server/queues/late-interest-queue';
import { getBullMqRedisConnection } from '@/server/queues/redis';
import { Worker } from 'bullmq';
import { eq } from 'drizzle-orm';

declare global {
  var __lateInterestWorker: Worker<LateInterestJobData> | undefined;
}

export function startLateInterestWorker() {
  if (globalThis.__lateInterestWorker) {
    return globalThis.__lateInterestWorker;
  }

  const worker = new Worker<LateInterestJobData>(
    LATE_INTEREST_QUEUE_NAME,
    async (job) => {
      await executeLateInterestProcessRun(job.data.processRunId);
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

  globalThis.__lateInterestWorker = worker;
  return worker;
}
