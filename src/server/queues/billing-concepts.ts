import { executeBillingConceptsProcessRun } from '@/server/services/causation/billing-concepts-run';
import type { BillingConceptsJobData } from '@/server/services/causation/types';
import { redisConnection } from '@/server/clients/redis';
import { db, processRuns } from '@/server/db';
import { Queue, Worker } from 'bullmq';
import { eq } from 'drizzle-orm';

const QUEUE_NAME = 'causation-billing-concepts';
const JOB_NAME = 'process-billing-concepts-run';

export const billingConceptsQueue = new Queue<BillingConceptsJobData>(QUEUE_NAME, {
  connection: redisConnection,
});

export async function enqueueBillingConceptsJob(data: BillingConceptsJobData) {
  await billingConceptsQueue.add(JOB_NAME, data, {
    jobId: `billing-concepts-run-${data.processRunId}`,
    attempts: 1,
    removeOnComplete: 500,
    removeOnFail: 500,
  });
}

export function createBillingConceptsWorker() {
  const worker = new Worker<BillingConceptsJobData>(
    QUEUE_NAME,
    async (job) => {
      await executeBillingConceptsProcessRun(job.data.processRunId);
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
