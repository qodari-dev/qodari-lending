import type {
  SubsidyBeneficiary,
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
}
