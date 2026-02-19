export const CAUSATION_SCOPE_TYPE_OPTIONS = ['GENERAL', 'CREDIT_PRODUCT', 'LOAN'] as const;
export type CausationScopeType = (typeof CAUSATION_SCOPE_TYPE_OPTIONS)[number];

export type CurrentInterestJobData = {
  processRunId: number;
};

export type LateInterestJobData = {
  processRunId: number;
};

export type CurrentInsuranceJobData = {
  processRunId: number;
};

export type BillingConceptsJobData = {
  processRunId: number;
};

export type CausationRunError = {
  loanId: number;
  creditNumber: string;
  reason: string;
};

export type CurrentInterestRunSummary = {
  reviewedCredits: number;
  accruedCredits: number;
  failedCredits: number;
  totalAccruedAmount: number;
  errors: CausationRunError[];
};

export type LateInterestRunSummary = CurrentInterestRunSummary;
export type CurrentInsuranceRunSummary = CurrentInterestRunSummary;
export type BillingConceptsRunSummary = CurrentInterestRunSummary;
