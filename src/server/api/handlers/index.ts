import { contract } from '@/server/api/contracts';
import { createNextHandler } from '@ts-rest/serverless/next';
import { accountingDistribution } from './accounting-distribution';
import { agingProfile } from './aging-profile';
import { creditFund } from './credit-fund';
import { accountingPeriod } from './accounting-period';
import { auth } from './auth';
import { bank } from './bank';
import { channel } from './channel';
import { city } from './city';
import { coDebtor } from './co-debtor';
import { costCenter } from './cost-center';
import { creditsSettingsHandler } from './credits-settings';
import { documentType } from './document-type';
import { glAccount } from './gl-account';
import { identificationType } from './identification-type';
import { iamUser } from './iam-user';
import { insuranceCompany } from './insurance-company';
import { investmentType } from './investment-type';
import { paymentFrequency } from './payment-frequency';
import { paymentGuaranteeType } from './payment-guarantee-type';
import { paymentReceiptType } from './payment-receipt-type';
import { paymentTenderType } from './payment-tender-type';
import { rejectionReason } from './rejection-reason';
import { repaymentMethod } from './repayment-method';
import { thirdParty } from './third-party';
import { thirdPartyType } from './third-party-type';

export const handler = createNextHandler(
  contract,
  { accountingDistribution, accountingPeriod, agingProfile, auth, bank, channel, city, coDebtor, costCenter, creditFund, creditsSettings: creditsSettingsHandler, documentType, glAccount, iamUser, identificationType, insuranceCompany, investmentType, paymentFrequency, paymentGuaranteeType, paymentReceiptType, paymentTenderType, rejectionReason, repaymentMethod, thirdParty, thirdPartyType },
  {
    jsonQuery: true,
    responseValidation: true,
    handlerType: 'app-router',
  }
);
