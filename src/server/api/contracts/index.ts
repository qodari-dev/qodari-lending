import { initContract } from '@ts-rest/core';
import { auth } from './auth';
import { bank } from './bank';
import { channel } from './channel';
import { city } from './city';
import { coDebtor } from './co-debtor';
import { costCenter } from './cost-center';
import { creditsSettingsContract } from './credits-settings';
import { documentType } from './document-type';
import { glAccount } from './gl-account';
import { identificationType } from './identification-type';
import { insuranceCompany } from './insurance-company';
import { investmentType } from './investment-type';
import { paymentFrequency } from './payment-frequency';
import { paymentGuaranteeType } from './payment-guarantee-type';
import { paymentTenderType } from './payment-tender-type';
import { rejectionReason } from './rejection-reason';
import { repaymentMethod } from './repayment-method';
import { thirdParty } from './third-party';
import { thirdPartyType } from './third-party-type';

const c = initContract();

export const contract = c.router(
  {
    auth,
    bank,
    channel,
    city,
    coDebtor,
    costCenter,
    creditsSettings: creditsSettingsContract,
    documentType,
    glAccount,
    identificationType,
    insuranceCompany,
    investmentType,
    paymentFrequency,
    paymentGuaranteeType,
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
