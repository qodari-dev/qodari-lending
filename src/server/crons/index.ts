import { env } from '@/env';
import { createAndQueueCurrentInterestRun } from '@/server/causation/current-interest-run-service';
import { CronJob } from 'cron';
import { addDays } from 'date-fns';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';
const SYSTEM_USER_NAME = 'SYSTEM_CRON';

declare global {
  var __causationCurrentInterestCronJob: CronJob | undefined;
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

export function startCrons() {
  if (globalThis.__causationCurrentInterestCronJob) return;

  const job = new CronJob(
    env.CURRENT_INTEREST_CRON,
    enqueueDailyCurrentInterestRun,
    null,
    false,
    env.SCHEDULER_TIMEZONE
  );

  if (!isPausedScheduler()) {
    job.start();
  }

  globalThis.__causationCurrentInterestCronJob = job;
}
