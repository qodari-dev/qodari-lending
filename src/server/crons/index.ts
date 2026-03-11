import { createAndQueueBillingConceptsRun } from '@/server/services/causation/billing-concepts-run-service';
import { env } from '@/env';
import { createAndQueueCurrentInsuranceRun } from '@/server/services/causation/current-insurance-run-service';
import { createAndQueueCurrentInterestRun } from '@/server/services/causation/current-interest-run-service';
import { createAndQueueLateInterestRun } from '@/server/services/causation/late-interest-run-service';
import { enqueueAgreementBillingEmails } from '@/server/services/billing-emails/agreement-billing-email-service';
import { expireStaleSignatureEnvelopes } from '@/server/services/signature/signature-envelope-expiry-service';
import { CronJob } from 'cron';
import { addDays } from 'date-fns';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';
const SYSTEM_USER_NAME = 'SYSTEM_CRON';

declare global {
  var __cronsStarted: boolean | undefined;
}

function isPausedScheduler() {
  return env.PAUSE_SCHEDULER === '1' || env.PAUSE_SCHEDULER === 'true';
}

function normalizeDateToStart(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function handleCausationError(tag: string, error: unknown) {
  const status =
    typeof (error as { status?: unknown })?.status === 'number'
      ? (error as { status: number }).status
      : 0;

  if (status === 409) return;

  console.error(`[cron][${tag}]`, error);
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
    handleCausationError('current-interest', error);
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
    handleCausationError('billing-concepts', error);
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
    handleCausationError('current-insurance', error);
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
    handleCausationError('late-interest', error);
  }
}

async function enqueueAgreementBillingEmailsRun() {
  try {
    await enqueueAgreementBillingEmails({
      triggerSource: 'CRON',
      runDate: new Date(),
    });
  } catch (error) {
    console.error('[cron][agreement-billing-email]', error);
  }
}

async function expireStaleSignatureEnvelopesRun() {
  try {
    const result = await expireStaleSignatureEnvelopes();
    if (result.expiredCount > 0) {
      console.log(`[cron][signature-envelope-expiry] Expirados ${result.expiredCount} sobres`);
    }
  } catch (error) {
    console.error('[cron][signature-envelope-expiry]', error);
  }
}

export function startCrons() {
  if (globalThis.__cronsStarted) return;
  globalThis.__cronsStarted = true;

  if (isPausedScheduler()) return;

  const jobs = [
    { cron: env.BILLING_AGREEMENT_EMAIL_CRON, fn: enqueueAgreementBillingEmailsRun },
    { cron: env.BILLING_CONCEPTS_CRON, fn: enqueueDailyBillingConceptsRun },
    { cron: env.CURRENT_INTEREST_CRON, fn: enqueueDailyCurrentInterestRun },
    { cron: env.CURRENT_INSURANCE_CRON, fn: enqueueDailyCurrentInsuranceRun },
    { cron: env.LATE_INTEREST_CRON, fn: enqueueDailyLateInterestRun },
    { cron: env.SIGNATURE_ENVELOPE_EXPIRY_CRON, fn: expireStaleSignatureEnvelopesRun },
  ];

  for (const { cron, fn } of jobs) {
    new CronJob(cron, fn, null, true, env.SCHEDULER_TIMEZONE);
  }
}
