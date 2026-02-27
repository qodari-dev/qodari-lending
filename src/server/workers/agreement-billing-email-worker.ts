import { processAgreementBillingEmailDispatch } from '@/server/billing-emails/agreement-billing-email-service';
import {
  AGREEMENT_BILLING_EMAIL_QUEUE_NAME,
  type AgreementBillingEmailJobData,
} from '@/server/queues/agreement-billing-email-queue';
import { getBullMqRedisConnection } from '@/server/queues/redis';
import { Worker } from 'bullmq';

declare global {
  var __agreementBillingEmailWorker: Worker<AgreementBillingEmailJobData> | undefined;
}

export function startAgreementBillingEmailWorker() {
  if (globalThis.__agreementBillingEmailWorker) {
    return globalThis.__agreementBillingEmailWorker;
  }

  const worker = new Worker<AgreementBillingEmailJobData>(
    AGREEMENT_BILLING_EMAIL_QUEUE_NAME,
    async (job) => {
      await processAgreementBillingEmailDispatch(job.data.dispatchId);
    },
    {
      connection: getBullMqRedisConnection(),
      concurrency: 1,
    }
  );

  worker.on('failed', (job, error) => {
    const dispatchId = job?.data?.dispatchId;
    console.error('[worker][agreement-billing-email][failed]', { dispatchId, error });
  });

  globalThis.__agreementBillingEmailWorker = worker;
  return worker;
}
