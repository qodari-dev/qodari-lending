import { env } from '@/env';
import type { SubsidyProvider } from './subsidy-provider';
import { comfenalcoSubsidyProvider } from './providers/comfenalco-provider';
import { syseuSubsidyProvider } from './providers/syseu-provider';

export function getSubsidyProvider(): SubsidyProvider | null {
  if (env.SUBSIDY_PROVIDER === 'COMFENALCO') {
    return comfenalcoSubsidyProvider;
  }

  if (env.SUBSIDY_PROVIDER === 'SYSEU') {
    return syseuSubsidyProvider;
  }

  return null;
}
