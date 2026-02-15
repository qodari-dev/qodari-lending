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
import { bank } from './bank';
import { billingConcept } from './billing-concept';
import { billingCycleProfile } from './billing-cycle-profile';
import { channel } from './channel';
import { city } from './city';
import { costCenter } from './cost-center';
import { creditProduct } from './credit-product';
import { creditSimulation } from './credit-simulation';
import { creditsSettingsHandler } from './credits-settings';
import { dashboard } from './dashboard';
import { documentType } from './document-type';
import { glAccount } from './gl-account';
import { identificationType } from './identification-type';
import { iamUser } from './iam-user';
import { insuranceCompany } from './insurance-company';
import { investmentType } from './investment-type';
import { loan } from './loan';
import { loanApplication } from './loan-application';
import { loanPaymentFile } from './loan-payment-file';
import { loanPaymentPayroll } from './loan-payment-payroll';
import { loanRefinancing } from './loan-refinancing';
import { loanPayment } from './loan-payment';
import { paymentFrequency } from './payment-frequency';
import { paymentGuaranteeType } from './payment-guarantee-type';
import { paymentAllocationPolicy } from './payment-allocation-policy';
import { paymentReceiptType } from './payment-receipt-type';
import { paymentTenderType } from './payment-tender-type';
import { rejectionReason } from './rejection-reason';
import { reportCredit } from './report-credit';
import { repaymentMethod } from './repayment-method';
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
  bank,
  billingConcept,
  billingCycleProfile,
  channel,
  city,
  costCenter,
  creditFund,
  creditProduct,
  creditSimulation,
  creditsSettings: creditsSettingsHandler,
  dashboard,
  documentType,
  glAccount,
  iamUser,
  identificationType,
  insuranceCompany,
  investmentType,
  loan,
  loanApplication,
  loanPaymentFile,
  loanPaymentPayroll,
  loanRefinancing,
  loanPayment,
  paymentAllocationPolicy,
  paymentFrequency,
  paymentGuaranteeType,
  paymentReceiptType,
  paymentTenderType,
  rejectionReason,
  reportCredit,
  repaymentMethod,
  thirdParty,
  thirdPartyType,
},
{
  jsonQuery: true,
  responseValidation: true,
  handlerType: 'app-router',
});
