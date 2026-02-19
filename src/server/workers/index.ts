import { startCurrentInterestWorker } from './current-interest-worker';

declare global {
  var __workersBootstrapDone: boolean | undefined;
}

export function startWorkers() {
  if (globalThis.__workersBootstrapDone) return;

  startCurrentInterestWorker();
  globalThis.__workersBootstrapDone = true;
}
