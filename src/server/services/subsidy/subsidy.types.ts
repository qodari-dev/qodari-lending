export type SubsidySource = 'COMFENALCO' | 'SYSEU';

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
  categoryCode: string | null;
  sex: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
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
  birthDate: string | null;
  age: number | null;
  isDeceased: boolean;
};

export type SubsidyContribution = {
  period: string;
  companyName: string;
  companyDocumentNumber: string | null;
  workerDocumentNumber: string | null;
  baseSalary: number;
  contributionValue: number;
};

export type SubsidyCompanyHistory = {
  companyName: string;
  companyDocumentNumber: string | null;
  fromDate: string;
  toDate: string | null;
  contributionMonths: number;
};

export type SubsidyPayment = {
  period: string;
  beneficiaryRelationship: string | null;
  paymentType: string | null;
  installmentNumber: string | null;
  installmentValue: number;
  transferPeriod: string | null;
  isVoided: boolean;
};

export type SubsidyWorkerStudyData = {
  source: SubsidySource;
  worker: SubsidyWorker;
  currentSalary: number;
  companyHistory: SubsidyCompanyHistory[];
  contributions: SubsidyContribution[];
  spouses: Array<{
    fullName: string;
    documentNumber: string | null;
    birthDate: string | null;
  }>;
  beneficiaries: SubsidyBeneficiary[];
  subsidyPayments: SubsidyPayment[];
  notes: string[];
};
