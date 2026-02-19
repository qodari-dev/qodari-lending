import { createAndQueueBillingConceptsRun } from '@/server/causation/billing-concepts-run-service';
import { env } from '@/env';
import { createAndQueueCurrentInsuranceRun } from '@/server/causation/current-insurance-run-service';
import { createAndQueueCurrentInterestRun } from '@/server/causation/current-interest-run-service';
import { createAndQueueLateInterestRun } from '@/server/causation/late-interest-run-service';
import { CronJob } from 'cron';
import { addDays } from 'date-fns';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';
const SYSTEM_USER_NAME = 'SYSTEM_CRON';

declare global {
  var __causationBillingConceptsCronJob: CronJob | undefined;
  var __causationCurrentInterestCronJob: CronJob | undefined;
  var __causationCurrentInsuranceCronJob: CronJob | undefined;
  var __causationLateInterestCronJob: CronJob | undefined;
}

function isPausedScheduler() {
  return env.PAUSE_SCHEDULER === '1' || env.PAUSE_SCHEDULER === 'true';
}

function normalizeDateToStart(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

async function enqueueDailyCurrentInterestRun() {
  const yesterday = normalizeDateToStart(addDays(new Date(), -1));

  try {
    await createAndQueueCurrentInterestRun({
      processDate: yesterday,
      transactionDate: yesterday,
      scopeType: 'GENERAL',
      executedByUserId: SYSTEM_USER_ID,
      executedByUserName: SYSTEM_USER_NAME,
      triggerSource: 'CRON',
    });
  } catch (error) {
    const status =
      typeof (error as { status?: unknown })?.status === 'number'
        ? (error as { status: number }).status
        : 0;

    if (status === 409) {
      // Ya existe corrida para la fecha; evita ruido por reintentos/instancias múltiples.
      return;
    }

    console.error('[cron][current-interest]', error);
  }
}

async function enqueueDailyBillingConceptsRun() {
  const yesterday = normalizeDateToStart(addDays(new Date(), -1));

  try {
    await createAndQueueBillingConceptsRun({
      processDate: yesterday,
      transactionDate: yesterday,
      scopeType: 'GENERAL',
      executedByUserId: SYSTEM_USER_ID,
      executedByUserName: SYSTEM_USER_NAME,
      triggerSource: 'CRON',
    });
  } catch (error) {
    const status =
      typeof (error as { status?: unknown })?.status === 'number'
        ? (error as { status: number }).status
        : 0;

    if (status === 409) {
      return;
    }

    console.error('[cron][billing-concepts]', error);
  }
}

async function enqueueDailyCurrentInsuranceRun() {
  const yesterday = normalizeDateToStart(addDays(new Date(), -1));

  try {
    await createAndQueueCurrentInsuranceRun({
      processDate: yesterday,
      transactionDate: yesterday,
      scopeType: 'GENERAL',
      executedByUserId: SYSTEM_USER_ID,
      executedByUserName: SYSTEM_USER_NAME,
      triggerSource: 'CRON',
    });
  } catch (error) {
    const status =
      typeof (error as { status?: unknown })?.status === 'number'
        ? (error as { status: number }).status
        : 0;

    if (status === 409) {
      return;
    }

    console.error('[cron][current-insurance]', error);
  }
}

async function enqueueDailyLateInterestRun() {
  const yesterday = normalizeDateToStart(addDays(new Date(), -1));

  try {
    await createAndQueueLateInterestRun({
      processDate: yesterday,
      transactionDate: yesterday,
      scopeType: 'GENERAL',
      executedByUserId: SYSTEM_USER_ID,
      executedByUserName: SYSTEM_USER_NAME,
      triggerSource: 'CRON',
    });
  } catch (error) {
    const status =
      typeof (error as { status?: unknown })?.status === 'number'
        ? (error as { status: number }).status
        : 0;

    if (status === 409) {
      return;
    }

    console.error('[cron][late-interest]', error);
  }
}

export function startCrons() {
  if (
    globalThis.__causationBillingConceptsCronJob &&
    globalThis.__causationCurrentInterestCronJob &&
    globalThis.__causationCurrentInsuranceCronJob &&
    globalThis.__causationLateInterestCronJob
  ) {
    return;
  }

  const billingConceptsJob = new CronJob(
    env.BILLING_CONCEPTS_CRON,
    enqueueDailyBillingConceptsRun,
    null,
    false,
    env.SCHEDULER_TIMEZONE
  );
  const currentInterestJob = new CronJob(
    env.CURRENT_INTEREST_CRON,
    enqueueDailyCurrentInterestRun,
    null,
    false,
    env.SCHEDULER_TIMEZONE
  );
  const currentInsuranceJob = new CronJob(
    env.CURRENT_INSURANCE_CRON,
    enqueueDailyCurrentInsuranceRun,
    null,
    false,
    env.SCHEDULER_TIMEZONE
  );
  const lateInterestJob = new CronJob(
    env.LATE_INTEREST_CRON,
    enqueueDailyLateInterestRun,
    null,
    false,
    env.SCHEDULER_TIMEZONE
  );

  if (!isPausedScheduler()) {
    billingConceptsJob.start();
    currentInterestJob.start();
    currentInsuranceJob.start();
    lateInterestJob.start();
  }

  globalThis.__causationBillingConceptsCronJob = billingConceptsJob;
  globalThis.__causationCurrentInterestCronJob = currentInterestJob;
  globalThis.__causationCurrentInsuranceCronJob = currentInsuranceJob;
  globalThis.__causationLateInterestCronJob = lateInterestJob;
}
