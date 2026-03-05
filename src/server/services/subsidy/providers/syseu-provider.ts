import type { SubsidyProvider, SubsidyLookupInput } from '../subsidy-provider';
import type { SubsidyBeneficiary, SubsidySpouse, SubsidyTransfer, SubsidyWorker } from '../subsidy.types';

class SyseuSubsidyProvider implements SubsidyProvider {
  readonly key = 'SYSEU' as const;

  async getWorker(_input: SubsidyLookupInput): Promise<SubsidyWorker | null> {
    throw new Error('Syseu subsidy provider pendiente por implementar');
  }

  async getBeneficiaries(_input: SubsidyLookupInput): Promise<SubsidyBeneficiary[]> {
    return [];
  }

  async getSpouse(_input: SubsidyLookupInput): Promise<SubsidySpouse | null> {
    return null;
  }

  async getTransfers(_input: SubsidyLookupInput): Promise<SubsidyTransfer[]> {
    return [];
  }
}

export const syseuSubsidyProvider = new SyseuSubsidyProvider();
