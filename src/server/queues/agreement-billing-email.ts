import { processAgreementBillingEmailDispatch } from '@/server/billing-emails/agreement-billing-email-service';
import { redisConnection } from '@/server/clients/redis';
import { Queue, Worker } from 'bullmq';

export type AgreementBillingEmailJobData = {
  dispatchId: number;
};

const QUEUE_NAME = 'agreement-billing-email';
const JOB_NAME = 'process-agreement-billing-email-dispatch';

export const agreementBillingEmailQueue = new Queue<AgreementBillingEmailJobData>(QUEUE_NAME, {
  connection: redisConnection,
});

export async function enqueueAgreementBillingEmailJob(data: AgreementBillingEmailJobData) {
  await agreementBillingEmailQueue.add(JOB_NAME, data, {
    attempts: 1,
    removeOnComplete: 500,
    removeOnFail: 500,
  });
}

export function createAgreementBillingEmailWorker() {
  const worker = new Worker<AgreementBillingEmailJobData>(
    QUEUE_NAME,
    async (job) => {
      await processAgreementBillingEmailDispatch(job.data.dispatchId);
    },
    { connection: redisConnection, concurrency: 1 }
  );

  worker.on('failed', (job, error) => {
    const dispatchId = job?.data?.dispatchId;
    console.error('[worker][agreement-billing-email][failed]', { dispatchId, error });
  });

  return worker;
}
