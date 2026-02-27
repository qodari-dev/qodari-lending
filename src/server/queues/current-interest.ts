import { executeCurrentInterestProcessRun } from '@/server/services/causation/current-interest-run';
import type { CurrentInterestJobData } from '@/server/services/causation/types';
import { redisConnection } from '@/server/clients/redis';
import { db, processRuns } from '@/server/db';
import { Queue, Worker } from 'bullmq';
import { eq } from 'drizzle-orm';

const QUEUE_NAME = 'causation-current-interest';
const JOB_NAME = 'process-current-interest-run';

export const currentInterestQueue = new Queue<CurrentInterestJobData>(QUEUE_NAME, {
  connection: redisConnection,
});

export async function enqueueCurrentInterestJob(data: CurrentInterestJobData) {
  await currentInterestQueue.add(JOB_NAME, data, {
    jobId: `current-interest-run-${data.processRunId}`,
    attempts: 1,
    removeOnComplete: 500,
    removeOnFail: 500,
  });
}

export function createCurrentInterestWorker() {
  const worker = new Worker<CurrentInterestJobData>(
    QUEUE_NAME,
    async (job) => {
      await executeCurrentInterestProcessRun(job.data.processRunId);
    },
    { connection: redisConnection, concurrency: 1 }
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

  return worker;
}
