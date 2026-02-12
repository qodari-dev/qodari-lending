import { initContract } from '@ts-rest/core';
import { accountingDistribution } from './accounting-distribution';
import { accountingPeriod } from './accounting-period';
import { agreement } from './agreement';
import { affiliationOffice } from './affiliation-office';
import { agingProfile } from './aging-profile';
import { auth } from './auth';
import { bank } from './bank';
import { billingConcept } from './billing-concept';
import { billingCycleProfile } from './billing-cycle-profile';
import { channel } from './channel';
import { city } from './city';
import { creditProduct } from './credit-product';
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
import { investmentType } from './investment-type';
import { loan } from './loan';
import { loanApplication } from './loan-application';
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

const c = initContract();

export const contract = c.router(
  {
    accountingDistribution,
    accountingPeriod,
    agreement,
    affiliationOffice,
    agingProfile,
    auth,
    bank,
    billingConcept,
    billingCycleProfile,
    channel,
    city,
    creditProduct,
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
    investmentType,
    loan,
    loanApplication,
    loanPayment,
    paymentFrequency,
    paymentGuaranteeType,
    paymentAllocationPolicy,
    paymentReceiptType,
    paymentTenderType,
    rejectionReason,
    reportCredit,
    repaymentMethod,
    thirdParty,
    thirdPartyType,
  },
  {
    pathPrefix: '/api/v1',
  }
);

export type Contract = typeof contract;
