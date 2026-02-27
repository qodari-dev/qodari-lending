import { executeLateInterestProcessRun } from '@/server/causation/late-interest-run';
import type { LateInterestJobData } from '@/server/causation/types';
import { redisConnection } from '@/server/clients/redis';
import { db, processRuns } from '@/server/db';
import { Queue, Worker } from 'bullmq';
import { eq } from 'drizzle-orm';

const QUEUE_NAME = 'causation-late-interest';
const JOB_NAME = 'process-late-interest-run';

export const lateInterestQueue = new Queue<LateInterestJobData>(QUEUE_NAME, {
  connection: redisConnection,
});

export async function enqueueLateInterestJob(data: LateInterestJobData) {
  await lateInterestQueue.add(JOB_NAME, data, {
    jobId: `late-interest-run-${data.processRunId}`,
    attempts: 1,
    removeOnComplete: 500,
    removeOnFail: 500,
  });
}

export function createLateInterestWorker() {
  const worker = new Worker<LateInterestJobData>(
    QUEUE_NAME,
    async (job) => {
      await executeLateInterestProcessRun(job.data.processRunId);
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
