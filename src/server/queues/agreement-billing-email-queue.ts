import { Queue } from 'bullmq';
import { getBullMqRedisConnection } from './redis';

export type AgreementBillingEmailJobData = {
  dispatchId: number;
};

export const AGREEMENT_BILLING_EMAIL_QUEUE_NAME = 'agreement-billing-email';
const AGREEMENT_BILLING_EMAIL_JOB_NAME = 'process-agreement-billing-email-dispatch';

function createAgreementBillingEmailQueue() {
  return new Queue<AgreementBillingEmailJobData>(AGREEMENT_BILLING_EMAIL_QUEUE_NAME, {
    connection: getBullMqRedisConnection(),
  });
}

type AgreementBillingEmailQueue = ReturnType<typeof createAgreementBillingEmailQueue>;

declare global {
  var __agreementBillingEmailQueue: AgreementBillingEmailQueue | undefined;
}

function getAgreementBillingEmailQueue() {
  if (!globalThis.__agreementBillingEmailQueue) {
    globalThis.__agreementBillingEmailQueue = createAgreementBillingEmailQueue();
  }

  return globalThis.__agreementBillingEmailQueue;
}

export function getAgreementBillingEmailQueueInstance() {
  return getAgreementBillingEmailQueue();
}

export async function enqueueAgreementBillingEmailJob(data: AgreementBillingEmailJobData) {
  const queue = getAgreementBillingEmailQueue();

  await queue.add(AGREEMENT_BILLING_EMAIL_JOB_NAME, data, {
    attempts: 1,
    removeOnComplete: 500,
    removeOnFail: 500,
  });
}
