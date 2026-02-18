import { initContract } from '@ts-rest/core';
import { accountingInterface } from './accounting-interface';
import { accountingDistribution } from './accounting-distribution';
import { accountingPeriod } from './accounting-period';
import { agreement } from './agreement';
import { affiliationOffice } from './affiliation-office';
import { agingProfile } from './aging-profile';
import { auth } from './auth';
import { bankFile } from './bank-file';
import { bank } from './bank';
import { billingConcept } from './billing-concept';
import { billingCycleProfile } from './billing-cycle-profile';
import { causation } from './causation';
import { channel } from './channel';
import { city } from './city';
import { creditProduct } from './credit-product';
import { creditReport } from './credit-report';
import { creditSimulation } from './credit-simulation';
import { costCenter } from './cost-center';
import { creditFund } from './credit-fund';
import { creditsSettingsContract } from './credits-settings';
import { documentType } from './document-type';
import { dashboard } from './dashboard';
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
import { reportCredit } from './report-credit';
import { riskCenterReport } from './risk-center-report';
import { repaymentMethod } from './repayment-method';
import { subsidy } from './subsidy';
import { thirdParty } from './third-party';
import { thirdPartyType } from './third-party-type';

const c = initContract();

export const contract = c.router(
  {
    accountingInterface,
    accountingDistribution,
    accountingPeriod,
    agreement,
    affiliationOffice,
    agingProfile,
    auth,
    bankFile,
    bank,
    billingConcept,
    billingCycleProfile,
    causation,
    channel,
    city,
    creditProduct,
    creditReport,
    creditSimulation,
    costCenter,
    creditFund,
    creditsSettings: creditsSettingsContract,
    dashboard,
    documentType,
    glAccount,
    identificationType,
    iamUser,
    insuranceCompany,
    insuranceReport,
    investmentType,
    loan,
    loanApplication,
    loanRefinancing,
    loanPayment,
    loanWriteOff,
    paymentFrequency,
    paymentGuaranteeType,
    paymentAllocationPolicy,
    paymentReceiptType,
    paymentTenderType,
    portfolioReport,
    rejectionReason,
    reportCredit,
    riskCenterReport,
    repaymentMethod,
    subsidy,
    thirdParty,
    thirdPartyType,
  },
  {
    pathPrefix: '/api/v1',
  }
);

export type Contract = typeof contract;
