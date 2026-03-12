import type {
  SubsidyBeneficiary,
  SubsidyCurrentPeriod,
  SubsidyContribution,
  SubsidyPayment,
  SubsidyPledge,
  SubsidySalaryHistory,
  SubsidySpouse,
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
  getSpouses?(input: SubsidyLookupInput): Promise<SubsidySpouse[]>;
  getSalaryHistory(input: SubsidyLookupInput): Promise<SubsidySalaryHistory[]>;
  getContributions(input: SubsidyLookupInput): Promise<SubsidyContribution[]>;
  getSubsidyPayments(input: SubsidyLookupInput): Promise<SubsidyPayment[]>;
  getPledges(input: SubsidyLookupInput): Promise<SubsidyPledge[]>;
  getCurrentPeriod(): Promise<SubsidyCurrentPeriod | null>;
}
