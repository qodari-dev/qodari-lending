import type { LateInterestJobData } from '@/server/causation/types';
import { Queue } from 'bullmq';
import { getBullMqRedisConnection } from './redis';

export const LATE_INTEREST_QUEUE_NAME = 'causation-late-interest';
const LATE_INTEREST_JOB_NAME = 'process-late-interest-run';

function createLateInterestQueue() {
  return new Queue<LateInterestJobData>(LATE_INTEREST_QUEUE_NAME, {
    connection: getBullMqRedisConnection(),
  });
}

type LateInterestQueue = ReturnType<typeof createLateInterestQueue>;

declare global {
  var __lateInterestQueue: LateInterestQueue | undefined;
}

function getLateInterestQueue() {
  if (!globalThis.__lateInterestQueue) {
    globalThis.__lateInterestQueue = createLateInterestQueue();
  }

  return globalThis.__lateInterestQueue;
}

export function getLateInterestQueueInstance() {
  return getLateInterestQueue();
}

export async function enqueueLateInterestJob(data: LateInterestJobData) {
  const queue = getLateInterestQueue();

  await queue.add(LATE_INTEREST_JOB_NAME, data, {
    jobId: `late-interest-run-${data.processRunId}`,
    attempts: 1,
    removeOnComplete: 500,
    removeOnFail: 500,
  });
}
