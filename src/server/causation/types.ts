export const CAUSATION_SCOPE_TYPE_OPTIONS = ['GENERAL', 'CREDIT_PRODUCT', 'LOAN'] as const;
export type CausationScopeType = (typeof CAUSATION_SCOPE_TYPE_OPTIONS)[number];

export type CurrentInterestJobData = {
  processRunId: number;
};

export type CurrentInterestRunSummary = {
  reviewedCredits: number;
  accruedCredits: number;
  failedCredits: number;
  totalAccruedAmount: number;
  errors: Array<{
    loanId: number;
    creditNumber: string;
    reason: string;
  }>;
};
