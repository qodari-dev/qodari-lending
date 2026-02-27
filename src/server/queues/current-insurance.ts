import { executeCurrentInsuranceProcessRun } from '@/server/services/causation/current-insurance-run';
import type { CurrentInsuranceJobData } from '@/server/services/causation/types';
import { redisConnection } from '@/server/clients/redis';
import { db, processRuns } from '@/server/db';
import { Queue, Worker } from 'bullmq';
import { eq } from 'drizzle-orm';

const QUEUE_NAME = 'causation-current-insurance';
const JOB_NAME = 'process-current-insurance-run';

export const currentInsuranceQueue = new Queue<CurrentInsuranceJobData>(QUEUE_NAME, {
  connection: redisConnection,
});

export async function enqueueCurrentInsuranceJob(data: CurrentInsuranceJobData) {
  await currentInsuranceQueue.add(JOB_NAME, data, {
    jobId: `current-insurance-run-${data.processRunId}`,
    attempts: 1,
    removeOnComplete: 500,
    removeOnFail: 500,
  });
}

export function createCurrentInsuranceWorker() {
  const worker = new Worker<CurrentInsuranceJobData>(
    QUEUE_NAME,
    async (job) => {
      await executeCurrentInsuranceProcessRun(job.data.processRunId);
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
