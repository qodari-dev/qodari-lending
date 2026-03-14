import { redisConnection } from '@/server/clients/redis';
import { db, subsidyPledgePaymentVouchers } from '@/server/db';
import { executeSubsidyPledgePaymentVoucher } from '@/server/services/subsidy/subsidy-pledge-payment-voucher-service';
import { Queue, Worker } from 'bullmq';
import { eq } from 'drizzle-orm';

type SubsidyPledgePaymentVoucherJobData = {
  voucherId: number;
};

const QUEUE_NAME = 'subsidy-pledge-payment-voucher';
const JOB_NAME = 'process-subsidy-pledge-payment-voucher';

export const subsidyPledgePaymentVoucherQueue = new Queue<SubsidyPledgePaymentVoucherJobData>(
  QUEUE_NAME,
  {
    connection: redisConnection,
  }
);

export async function enqueueSubsidyPledgePaymentVoucherJob(
  data: SubsidyPledgePaymentVoucherJobData
) {
  await subsidyPledgePaymentVoucherQueue.add(JOB_NAME, data, {
    jobId: `subsidy-pledge-payment-voucher-${data.voucherId}`,
    attempts: 1,
    removeOnComplete: 500,
    removeOnFail: 500,
  });
}

export function createSubsidyPledgePaymentVoucherWorker() {
  const worker = new Worker<SubsidyPledgePaymentVoucherJobData>(
    QUEUE_NAME,
    async (job) => {
      await executeSubsidyPledgePaymentVoucher(job.data.voucherId);
    },
    { connection: redisConnection, concurrency: 1 }
  );

  worker.on('failed', async (job, error) => {
    const voucherId = Number(job?.data?.voucherId ?? 0);
    if (!Number.isFinite(voucherId) || voucherId <= 0) return;

    await db
      .update(subsidyPledgePaymentVouchers)
      .set({
        status: 'FAILED',
        finishedAt: new Date(),
        message: `Error ejecutando lote: ${error.message}`,
      })
      .where(eq(subsidyPledgePaymentVouchers.id, voucherId));
  });

  return worker;
}
