import type { CurrentInterestJobData } from '@/server/causation/types';
import { Queue } from 'bullmq';
import { getBullMqRedisConnection } from './redis';

export const CURRENT_INTEREST_QUEUE_NAME = 'causation-current-interest';
const CURRENT_INTEREST_JOB_NAME = 'process-current-interest-run';

function createCurrentInterestQueue() {
  return new Queue<CurrentInterestJobData>(CURRENT_INTEREST_QUEUE_NAME, {
    connection: getBullMqRedisConnection(),
  });
}

type CurrentInterestQueue = ReturnType<typeof createCurrentInterestQueue>;

declare global {
  var __currentInterestQueue: CurrentInterestQueue | undefined;
}

function getCurrentInterestQueue() {
  if (!globalThis.__currentInterestQueue) {
    globalThis.__currentInterestQueue = createCurrentInterestQueue();
  }

  return globalThis.__currentInterestQueue;
}

export function getCurrentInterestQueueInstance() {
  return getCurrentInterestQueue();
}

export async function enqueueCurrentInterestJob(data: CurrentInterestJobData) {
  const queue = getCurrentInterestQueue();

  await queue.add(CURRENT_INTEREST_JOB_NAME, data, {
    jobId: `current-interest-run-${data.processRunId}`,
    attempts: 1,
    removeOnComplete: 500,
    removeOnFail: 500,
  });
}
