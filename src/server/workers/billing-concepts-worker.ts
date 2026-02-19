import { executeBillingConceptsProcessRun } from '@/server/causation/billing-concepts-run';
import type { BillingConceptsJobData } from '@/server/causation/types';
import { db, processRuns } from '@/server/db';
import { BILLING_CONCEPTS_QUEUE_NAME } from '@/server/queues/billing-concepts-queue';
import { getBullMqRedisConnection } from '@/server/queues/redis';
import { Worker } from 'bullmq';
import { eq } from 'drizzle-orm';

declare global {
  var __billingConceptsWorker: Worker<BillingConceptsJobData> | undefined;
}

export function startBillingConceptsWorker() {
  if (globalThis.__billingConceptsWorker) {
    return globalThis.__billingConceptsWorker;
  }

  const worker = new Worker<BillingConceptsJobData>(
    BILLING_CONCEPTS_QUEUE_NAME,
    async (job) => {
      await executeBillingConceptsProcessRun(job.data.processRunId);
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

  globalThis.__billingConceptsWorker = worker;
  return worker;
}
