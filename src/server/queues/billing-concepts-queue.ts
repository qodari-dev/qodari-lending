import type { BillingConceptsJobData } from '@/server/causation/types';
import { Queue } from 'bullmq';
import { getBullMqRedisConnection } from './redis';

export const BILLING_CONCEPTS_QUEUE_NAME = 'causation-billing-concepts';
const BILLING_CONCEPTS_JOB_NAME = 'process-billing-concepts-run';

function createBillingConceptsQueue() {
  return new Queue<BillingConceptsJobData>(BILLING_CONCEPTS_QUEUE_NAME, {
    connection: getBullMqRedisConnection(),
  });
}

type BillingConceptsQueue = ReturnType<typeof createBillingConceptsQueue>;

declare global {
  var __billingConceptsQueue: BillingConceptsQueue | undefined;
}

function getBillingConceptsQueue() {
  if (!globalThis.__billingConceptsQueue) {
    globalThis.__billingConceptsQueue = createBillingConceptsQueue();
  }

  return globalThis.__billingConceptsQueue;
}

export function getBillingConceptsQueueInstance() {
  return getBillingConceptsQueue();
}

export async function enqueueBillingConceptsJob(data: BillingConceptsJobData) {
  const queue = getBillingConceptsQueue();

  await queue.add(BILLING_CONCEPTS_JOB_NAME, data, {
    jobId: `billing-concepts-run-${data.processRunId}`,
    attempts: 1,
    removeOnComplete: 500,
    removeOnFail: 500,
  });
}
