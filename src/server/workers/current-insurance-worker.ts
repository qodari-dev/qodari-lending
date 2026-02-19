import { executeCurrentInsuranceProcessRun } from '@/server/causation/current-insurance-run';
import type { CurrentInsuranceJobData } from '@/server/causation/types';
import { db, processRuns } from '@/server/db';
import { CURRENT_INSURANCE_QUEUE_NAME } from '@/server/queues/current-insurance-queue';
import { getBullMqRedisConnection } from '@/server/queues/redis';
import { Worker } from 'bullmq';
import { eq } from 'drizzle-orm';

declare global {
  var __currentInsuranceWorker: Worker<CurrentInsuranceJobData> | undefined;
}

export function startCurrentInsuranceWorker() {
  if (globalThis.__currentInsuranceWorker) {
    return globalThis.__currentInsuranceWorker;
  }

  const worker = new Worker<CurrentInsuranceJobData>(
    CURRENT_INSURANCE_QUEUE_NAME,
    async (job) => {
      await executeCurrentInsuranceProcessRun(job.data.processRunId);
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

  globalThis.__currentInsuranceWorker = worker;
  return worker;
}
