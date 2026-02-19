import { startBillingConceptsWorker } from './billing-concepts-worker';
import { startCurrentInterestWorker } from './current-interest-worker';
import { startCurrentInsuranceWorker } from './current-insurance-worker';
import { startLateInterestWorker } from './late-interest-worker';

declare global {
  var __workersBootstrapDone: boolean | undefined;
}

export function startWorkers() {
  if (globalThis.__workersBootstrapDone) return;

  startBillingConceptsWorker();
  startCurrentInterestWorker();
  startCurrentInsuranceWorker();
  startLateInterestWorker();
  globalThis.__workersBootstrapDone = true;
}
