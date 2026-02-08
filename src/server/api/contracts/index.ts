import { initContract } from '@ts-rest/core';
import { accountingDistribution } from './accounting-distribution';
import { accountingPeriod } from './accounting-period';
import { affiliationOffice } from './affiliation-office';
import { agingProfile } from './aging-profile';
import { auth } from './auth';
import { bank } from './bank';
import { channel } from './channel';
import { city } from './city';
import { coDebtor } from './co-debtor';
import { creditProduct } from './credit-product';
import { creditSimulation } from './credit-simulation';
import { costCenter } from './cost-center';
import { creditFund } from './credit-fund';
import { creditsSettingsContract } from './credits-settings';
import { documentType } from './document-type';
import { glAccount } from './gl-account';
import { identificationType } from './identification-type';
import { iamUser } from './iam-user';
import { insuranceCompany } from './insurance-company';
import { investmentType } from './investment-type';
import { loanApplication } from './loan-application';
import { paymentFrequency } from './payment-frequency';
import { paymentGuaranteeType } from './payment-guarantee-type';
import { paymentReceiptType } from './payment-receipt-type';
import { paymentTenderType } from './payment-tender-type';
import { rejectionReason } from './rejection-reason';
import { repaymentMethod } from './repayment-method';
import { thirdParty } from './third-party';
import { thirdPartyType } from './third-party-type';

const c = initContract();

export const contract = c.router(
  {
    accountingDistribution,
    accountingPeriod,
    affiliationOffice,
    agingProfile,
    auth,
    bank,
    channel,
    city,
    coDebtor,
    creditProduct,
    creditSimulation,
    costCenter,
    creditFund,
    creditsSettings: creditsSettingsContract,
    documentType,
    glAccount,
    identificationType,
    iamUser,
    insuranceCompany,
    investmentType,
    loanApplication,
    paymentFrequency,
    paymentGuaranteeType,
    paymentReceiptType,
    paymentTenderType,
    rejectionReason,
    repaymentMethod,
    thirdParty,
    thirdPartyType,
  },
  {
    pathPrefix: '/api/v1',
  }
);

export type Contract = typeof contract;
