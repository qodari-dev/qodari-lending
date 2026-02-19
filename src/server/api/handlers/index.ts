import { contract } from '@/server/api/contracts';
import { createNextHandler } from '@ts-rest/serverless/next';
import { accountingInterface } from './accounting-interface';
import { accountingDistribution } from './accounting-distribution';
import { affiliationOffice } from './affiliation-office';
import { agreement } from './agreement';
import { agingProfile } from './aging-profile';
import { creditFund } from './credit-fund';
import { accountingPeriod } from './accounting-period';
import { auth } from './auth';
import { bankFile } from './bank-file';
import { bank } from './bank';
import { billingConcept } from './billing-concept';
import { billingCycleProfile } from './billing-cycle-profile';
import { causation } from './causation';
import { channel } from './channel';
import { city } from './city';
import { costCenter } from './cost-center';
import { creditProduct } from './credit-product';
import { creditReport } from './credit-report';
import { creditSimulation } from './credit-simulation';
import { creditsSettingsHandler } from './credits-settings';
import { dashboard } from './dashboard';
import { documentType } from './document-type';
import { glAccount } from './gl-account';
import { identificationType } from './identification-type';
import { iamUser } from './iam-user';
import { insuranceCompany } from './insurance-company';
import { insuranceReport } from './insurance-report';
import { investmentType } from './investment-type';
import { loan } from './loan';
import { loanApplication } from './loan-application';
import { loanRefinancing } from './loan-refinancing';
import { loanPayment } from './loan-payment';
import { loanWriteOff } from './loan-write-off';
import { paymentFrequency } from './payment-frequency';
import { paymentGuaranteeType } from './payment-guarantee-type';
import { paymentAllocationPolicy } from './payment-allocation-policy';
import { paymentReceiptType } from './payment-receipt-type';
import { paymentTenderType } from './payment-tender-type';
import { portfolioReport } from './portfolio-report';
import { rejectionReason } from './rejection-reason';
import { riskCenterReport } from './risk-center-report';
import { repaymentMethod } from './repayment-method';
import { subsidy } from './subsidy';
import { thirdParty } from './third-party';
import { thirdPartyType } from './third-party-type';

export const handler = createNextHandler(contract, {
  accountingInterface,
  accountingDistribution,
  accountingPeriod,
  affiliationOffice,
  agreement,
  agingProfile,
  auth,
  bankFile,
  bank,
  billingConcept,
  billingCycleProfile,
  causation,
  channel,
  city,
  costCenter,
  creditFund,
  creditProduct,
  creditReport,
  creditSimulation,
  creditsSettings: creditsSettingsHandler,
  dashboard,
  documentType,
  glAccount,
  iamUser,
  identificationType,
  insuranceCompany,
  insuranceReport,
  investmentType,
  loan,
  loanApplication,
  loanRefinancing,
  loanPayment,
  loanWriteOff,
  paymentAllocationPolicy,
  paymentFrequency,
  paymentGuaranteeType,
  paymentReceiptType,
  paymentTenderType,
  portfolioReport,
  rejectionReason,
  riskCenterReport,
  repaymentMethod,
  subsidy,
  thirdParty,
  thirdPartyType,
},
{
  jsonQuery: true,
  responseValidation: true,
  handlerType: 'app-router',
});
