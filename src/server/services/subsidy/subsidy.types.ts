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
  firstName: string | null;
  secondName: string | null;
  firstLastName: string | null;
  secondLastName: string | null;
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
  beneficiaryCode: string | null;
  fullName: string;
  documentNumber: string | null;
  identificationTypeCode: string | null;
  relationship: string | null;
  relatedSpouseDocumentNumber: string | null;
  birthDate: string | null;
  age: number | null;
  isDeceased: boolean;
};

export type SubsidySpouse = {
  fullName: string;
  documentNumber: string | null;
  identificationTypeCode: string | null;
  relationship: string | null;
  birthDate: string | null;
  isPermanentPartner: boolean;
};

export type SubsidyContribution = {
  period: string;
  companyName: string;
  companyDocumentNumber: string | null;
  workerDocumentNumber: string | null;
  baseSalary: number;
  contributionValue: number;
};

export type SubsidySalaryHistory = {
  effectiveDate: string;
  salary: number;
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

export type SubsidyCurrentPeriod = {
  period: string;
  subsidyValue: number;
};

export type SubsidyPledge = {
  mark: string | null;
  documentNumber: string | null;
  workerDocumentNumber: string | null;
  spouseDocumentNumber: string | null;
  requestedValue: number;
  creditValue: number;
  paymentValue: number;
  discountValue: number;
  accountingCode: string | null;
  crossDocumentNumber: string | null;
  effectiveDate: string | null;
  status: string | null;
  statusDate: string | null;
  isIndexed: boolean;
};

export type SubsidyWorkerStudyData = {
  source: SubsidySource;
  worker: SubsidyWorker;
  currentSalary: number;
  companyHistory: SubsidyCompanyHistory[];
  salaryHistory: SubsidySalaryHistory[];
  contributions: SubsidyContribution[];
  spouses: Array<{
    fullName: string;
    documentNumber: string | null;
    birthDate: string | null;
    relationship: string | null;
    isPermanentPartner: boolean;
  }>;
  beneficiaries: SubsidyBeneficiary[];
  subsidyPayments: SubsidyPayment[];
  notes: string[];
};
