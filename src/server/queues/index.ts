import { createAgreementBillingEmailWorker } from './agreement-billing-email';
import { createBillingConceptsWorker } from './billing-concepts';
import { createCurrentInsuranceWorker } from './current-insurance';
import { createCurrentInterestWorker } from './current-interest';
import { createLateInterestWorker } from './late-interest';
import { createSubsidyPledgePaymentVoucherWorker } from './subsidy-pledge-payment-voucher';

declare global {
  var __workersBootstrapDone: boolean | undefined;
}

export function startWorkers() {
  if (globalThis.__workersBootstrapDone) return;
  globalThis.__workersBootstrapDone = true;

  createAgreementBillingEmailWorker();
  createBillingConceptsWorker();
  createCurrentInterestWorker();
  createCurrentInsuranceWorker();
  createLateInterestWorker();
  createSubsidyPledgePaymentVoucherWorker();
}
