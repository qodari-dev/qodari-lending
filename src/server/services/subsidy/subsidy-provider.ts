import type {
  SubsidyBeneficiary,
  SubsidySpouse,
  SubsidyTransfer,
  SubsidyWorker,
} from './subsidy.types';

export type SubsidyProviderKey = 'COMFENALCO' | 'SYSEU';

export type SubsidyLookupInput = {
  identificationTypeCode?: string;
  documentNumber: string;
};

export interface SubsidyProvider {
  readonly key: SubsidyProviderKey;
  getWorker(input: SubsidyLookupInput): Promise<SubsidyWorker | null>;
  getBeneficiaries(input: SubsidyLookupInput): Promise<SubsidyBeneficiary[]>;
  getSpouse(input: SubsidyLookupInput): Promise<SubsidySpouse | null>;
  getTransfers(input: SubsidyLookupInput): Promise<SubsidyTransfer[]>;
}
