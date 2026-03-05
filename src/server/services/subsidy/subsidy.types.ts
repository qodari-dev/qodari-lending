export type SubsidySource = 'COMFENALCO' | 'SYSEU' | 'MOCK';

export type SubsidyEmploymentRecord = {
  companyName: string;
  companyDocumentNumber: string | null;
  currentSalary: number;
  joinedCompanyAt: string | null;
  leftCompanyAt: string | null;
  joinedSubsidyAt: string | null;
  isPrimary: boolean;
};

export type SubsidyWorker = {
  fullName: string;
  documentNumber: string;
  identificationTypeCode: string | null;
  currentSalary: number;
  companyName: string | null;
  joinedCompanyAt: string | null;
  leftCompanyAt: string | null;
  joinedSubsidyAt: string | null;
  employments: SubsidyEmploymentRecord[];
};

export type SubsidyBeneficiary = {
  fullName: string;
  documentNumber: string | null;
  identificationTypeCode: string | null;
  relationship: string | null;
  age: number | null;
  isDeceased: boolean;
};

export type SubsidySpouse = {
  fullName: string;
  documentNumber: string | null;
  identificationTypeCode: string | null;
};

export type SubsidyTransfer = {
  period: string;
  companyName: string | null;
  baseSalary: number;
  amount: number;
  status: string | null;
};

export type SubsidyWorkerStudyData = {
  source: SubsidySource;
  workerName: string;
  workerDocumentNumber: string;
  salary: {
    currentSalary: number;
    averageSalaryLastSixMonths: number;
    highestSalaryLastSixMonths: number;
  };
  trajectory: {
    totalContributionMonths: number;
    currentCompanyName: string | null;
    previousCompanyName: string | null;
  };
  contributions: Array<{
    period: string;
    companyName: string;
    contributionBaseSalary: number;
    contributionValue: number;
  }>;
  companyHistory: Array<{
    companyName: string;
    fromDate: string;
    toDate: string | null;
    contributionMonths: number;
  }>;
  notes: string[];
};
