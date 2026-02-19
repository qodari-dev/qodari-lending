import type { CurrentInsuranceJobData } from '@/server/causation/types';
import { Queue } from 'bullmq';
import { getBullMqRedisConnection } from './redis';

export const CURRENT_INSURANCE_QUEUE_NAME = 'causation-current-insurance';
const CURRENT_INSURANCE_JOB_NAME = 'process-current-insurance-run';

function createCurrentInsuranceQueue() {
  return new Queue<CurrentInsuranceJobData>(CURRENT_INSURANCE_QUEUE_NAME, {
    connection: getBullMqRedisConnection(),
  });
}

type CurrentInsuranceQueue = ReturnType<typeof createCurrentInsuranceQueue>;

declare global {
  var __currentInsuranceQueue: CurrentInsuranceQueue | undefined;
}

function getCurrentInsuranceQueue() {
  if (!globalThis.__currentInsuranceQueue) {
    globalThis.__currentInsuranceQueue = createCurrentInsuranceQueue();
  }

  return globalThis.__currentInsuranceQueue;
}

export function getCurrentInsuranceQueueInstance() {
  return getCurrentInsuranceQueue();
}

export async function enqueueCurrentInsuranceJob(data: CurrentInsuranceJobData) {
  const queue = getCurrentInsuranceQueue();

  await queue.add(CURRENT_INSURANCE_JOB_NAME, data, {
    jobId: `current-insurance-run-${data.processRunId}`,
    attempts: 1,
    removeOnComplete: 500,
    removeOnFail: 500,
  });
}
