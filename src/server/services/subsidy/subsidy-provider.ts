import type {
  SubsidyBeneficiary,
  SubsidyContribution,
  SubsidyPayment,
  SubsidySource,
  SubsidyWorker,
} from './subsidy.types';

export type SubsidyProviderKey = SubsidySource;

export type SubsidyLookupInput = {
  identificationTypeCode?: string;
  documentNumber: string;
};

export interface SubsidyProvider {
  readonly key: SubsidyProviderKey;
  getWorker(input: SubsidyLookupInput): Promise<SubsidyWorker | null>;
  getBeneficiaries(input: SubsidyLookupInput): Promise<SubsidyBeneficiary[]>;
  getContributions(input: SubsidyLookupInput): Promise<SubsidyContribution[]>;
  getSubsidyPayments(input: SubsidyLookupInput): Promise<SubsidyPayment[]>;
}
