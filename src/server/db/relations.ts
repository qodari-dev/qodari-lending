// ---------------------------------------------------------------------
// relations.ts - Relaciones de Drizzle ORM
// ---------------------------------------------------------------------
// Este archivo contiene todas las definiciones de relaciones entre tablas.
// Las relaciones permiten hacer queries con joins usando Drizzle Query API.
// ---------------------------------------------------------------------

import { relations } from 'drizzle-orm';
import {
  documentTypes,
  rejectionReasons,
  repaymentMethods,
  paymentGuaranteeTypes,
  paymentFrequencies,
  investmentTypes,
  paymentTenderTypes,
  banks,
  glAccounts,
  costCenters,
  accountingDistributions,
  accountingDistributionLines,
  paymentReceiptTypes,
  userPaymentReceiptTypes,
  affiliationOffices,
  accountingPeriods,
  creditFunds,
  creditFundBudgets,
  userAffiliationOffices,
  thirdPartyTypes,
  thirdParties,
  insuranceCompanies,
  insuranceRateRanges,
  creditProducts,
  creditProductCategories,
  creditProductDocuments,
  creditProductAccounts,
  loanApplications,
  loanApplicationPledges,
  loanApplicationCoDebtors,
  loanApplicationDocuments,
  loans,
  loanAgreementHistory,
  loanStatusHistory,
  loanInstallments,
  loanApplicationActNumbers,
  portfolioEntries,
  accountingEntries,
  loanRefinancingLinks,
  processRuns,
  loanProcessStates,
  portfolioAgingSnapshots,
  payrollExcessPayments,
  loanPayments,
  loanPaymentMethodAllocations,
  creditsSettings,
  billingConcepts,
  billingConceptRules,
  creditProductBillingConcepts,
  loanBillingConcepts,
  creditProductLateInterestRules,
  agreements,
  billingCycleProfiles,
  billingCycleProfileCycles,
  loanApplicationRiskAssessments,
  channels,
  loanApplicationStatusHistory,
  loanApplicationEvents,
  creditProductRefinancePolicies,
  agingProfiles,
  agingBuckets,
  portfolioProvisionSnapshots,
  portfolioProvisionSnapshotDetails,
  paymentAllocationPolicies,
  paymentAllocationPolicyRules,
  cities,
  identificationTypes,
} from './schema';

// ---------------------------------------------------------------------
// Tipos de identificacion
// ---------------------------------------------------------------------
export const identificationTypesRelations = relations(identificationTypes, ({ many }) => ({
  thirdParties: many(thirdParties),
  insuranceCompanies: many(insuranceCompanies),
}));

// ---------------------------------------------------------------------
// Cities
// ---------------------------------------------------------------------
export const citiesRelations = relations(cities, ({ many }) => ({
  thirdPartiesHome: many(thirdParties, { relationName: 'thirdPartyHomeCity' }),
  thirdPartiesWork: many(thirdParties, { relationName: 'thirdPartyWorkCity' }),
  affiliationOffices: many(affiliationOffices),
  insuranceCompanies: many(insuranceCompanies),
  agreements: many(agreements),
}));

// ---------------------------------------------------------------------
// Concr43 - Tipos de documentos requeridos en solicitudes
// ---------------------------------------------------------------------
export const documentTypesRelations = relations(documentTypes, ({ many }) => ({
  creditProductDocuments: many(creditProductDocuments),
  loanApplicationDocuments: many(loanApplicationDocuments),
}));

// ---------------------------------------------------------------------
// Concr14 - Motivos de rechazo
// ---------------------------------------------------------------------
export const rejectionReasonsRelations = relations(rejectionReasons, ({ many }) => ({
  loanApplications: many(loanApplications),
}));

// ---------------------------------------------------------------------
// Concr15 - Formas de pago (del crédito)
// ---------------------------------------------------------------------
export const repaymentMethodsRelations = relations(repaymentMethods, ({ many }) => ({
  loanApplications: many(loanApplications),
  loans: many(loans),
}));

// ---------------------------------------------------------------------
// Concr11 - Garantías de pago
// ---------------------------------------------------------------------
export const paymentGuaranteeTypesRelations = relations(paymentGuaranteeTypes, ({ many }) => ({
  loans: many(loans),
  loanApplications: many(loanApplications),
}));

// ---------------------------------------------------------------------
// Concr13 - Periodicidad de pagos
// ---------------------------------------------------------------------
export const paymentFrequenciesRelations = relations(paymentFrequencies, ({ many }) => ({
  loanApplications: many(loanApplications),
  loans: many(loans),
}));

// ---------------------------------------------------------------------
// Concr56 - Tipos de inversión
// ---------------------------------------------------------------------
export const investmentTypesRelations = relations(investmentTypes, ({ many }) => ({
  loanApplications: many(loanApplications),
}));

// ---------------------------------------------------------------------
// Concr53 - Formas de pago tesorería (medios de pago del abono)
// ---------------------------------------------------------------------
export const paymentTenderTypesRelations = relations(paymentTenderTypes, ({ many }) => ({
  loanPaymentMethodAllocations: many(loanPaymentMethodAllocations),
}));

// ---------------------------------------------------------------------
// Concr61 - Bancos
// ---------------------------------------------------------------------
export const banksRelations = relations(banks, ({ many }) => ({
  loanApplications: many(loanApplications),
  loans: many(loans),
}));

// ---------------------------------------------------------------------
// Concr18 - Plan Único de Cuentas (Auxiliares)
// ---------------------------------------------------------------------
export const glAccountsRelations = relations(glAccounts, ({ many }) => ({
  accountingEntries: many(accountingEntries),
  accountingDistributionLines: many(accountingDistributionLines),
  portfolioEntries: many(portfolioEntries),
  portfolioAgingSnapshots: many(portfolioAgingSnapshots),
  loanPayments: many(loanPayments),
  paymentReceiptTypes: many(paymentReceiptTypes),

  // Concr26 - Mapeo contable por tipo de crédito (3 FKs a gl_accounts)
  creditProductAccountsAsCapital: many(creditProductAccounts, {
    relationName: 'capitalGlAccount',
  }),
  creditProductAccountsAsInterest: many(creditProductAccounts, {
    relationName: 'interestGlAccount',
  }),
  creditProductAccountsAsLateInterest: many(creditProductAccounts, {
    relationName: 'lateInterestGlAccount',
  }),

  // Concr01 - Settings
  creditsSettingsAsCashGlAccount: many(creditsSettings, {
    relationName: 'cashGlAccount',
  }),
  creditsSettingsAsMajorGlAccount: many(creditsSettings, {
    relationName: 'majorGlAccount',
  }),
  creditsSettingsAsExcessGlAccount: many(creditsSettings, {
    relationName: 'excessGlAccount',
  }),
  creditsSettingsAsPledgeSubsidyGlAccount: many(creditsSettings, {
    relationName: 'pledgeSubsidyGlAccount',
  }),
  creditsSettingsAsWriteOffGlAccount: many(creditsSettings, {
    relationName: 'writeOffGlAccount',
  }),
}));

// ---------------------------------------------------------------------
// Concr19 - Centros de costos
// ---------------------------------------------------------------------
export const costCentersRelations = relations(costCenters, ({ many }) => ({
  accountingDistributionLines: many(accountingDistributionLines),
  creditProducts: many(creditProducts),
  creditsSettings: many(creditsSettings),
  accountingEntries: many(accountingEntries),
}));

// ---------------------------------------------------------------------
// Concr05 - Distribuciones contables (tipos de distribución)
// ---------------------------------------------------------------------
export const accountingDistributionsRelations = relations(accountingDistributions, ({ many }) => ({
  accountingDistributionLines: many(accountingDistributionLines),

  // Concr07 (tipo de crédito) -> 3 referencias
  creditProductsAsCapitalDistribution: many(creditProducts, {
    relationName: 'capitalDistribution',
  }),
  creditProductsAsInterestDistribution: many(creditProducts, {
    relationName: 'interestDistribution',
  }),
  creditProductsAsLateInterestDistribution: many(creditProducts, {
    relationName: 'lateInterestDistribution',
  }),

  // Concr25 (aseguradoras) -> 1 referencia
  insuranceCompaniesAsDistribution: many(insuranceCompanies, {
    relationName: 'distribution',
  }),
}));

// ---------------------------------------------------------------------
// Concr06 - Auxiliares por distribuciones contables
// ---------------------------------------------------------------------
export const accountingDistributionLinesRelations = relations(
  accountingDistributionLines,
  ({ one }) => ({
    accountingDistribution: one(accountingDistributions, {
      fields: [accountingDistributionLines.accountingDistributionId],
      references: [accountingDistributions.id],
    }),
    glAccount: one(glAccounts, {
      fields: [accountingDistributionLines.glAccountId],
      references: [glAccounts.id],
    }),
    costCenter: one(costCenters, {
      fields: [accountingDistributionLines.costCenterId],
      references: [costCenters.id],
    }),
  })
);

// ---------------------------------------------------------------------
// Concr29 - Tipos de recibos de abonos
// ---------------------------------------------------------------------
export const paymentReceiptTypesRelations = relations(paymentReceiptTypes, ({ many, one }) => ({
  loanPayments: many(loanPayments),
  userPaymentReceiptTypes: many(userPaymentReceiptTypes),
  payrollExcessPayments: many(payrollExcessPayments),
  glAccount: one(glAccounts, {
    fields: [paymentReceiptTypes.glAccountId],
    references: [glAccounts.id],
  }),
}));

// ---------------------------------------------------------------------
// Concr31 - Usuarios para recibos de abonos
// ---------------------------------------------------------------------
export const userPaymentReceiptTypesRelations = relations(userPaymentReceiptTypes, ({ one }) => ({
  paymentReceiptType: one(paymentReceiptTypes, {
    fields: [userPaymentReceiptTypes.paymentReceiptTypeId],
    references: [paymentReceiptTypes.id],
  }),
}));

// ---------------------------------------------------------------------
// Concr46 - Oficinas de afiliación
// ---------------------------------------------------------------------
export const affiliationOfficesRelations = relations(affiliationOffices, ({ one, many }) => ({
  costCenter: one(costCenters, {
    fields: [affiliationOffices.costCenterId],
    references: [costCenters.id],
  }),
  city: one(cities, {
    fields: [affiliationOffices.cityId],
    references: [cities.id],
  }),
  loanApplications: many(loanApplications),
  loans: many(loans),
  loanApplicationDocuments: many(loanApplicationDocuments),
  loanApplicationCoDebtors: many(loanApplicationCoDebtors),
  loanApplicationActNumbers: many(loanApplicationActNumbers),
  userAffiliationOffices: many(userAffiliationOffices),
  portfolioAgingSnapshots: many(portfolioAgingSnapshots),
}));

// ---------------------------------------------------------------------
// Concr27 - Periodos contables
// ---------------------------------------------------------------------
export const accountingPeriodsRelations = relations(accountingPeriods, ({ many }) => ({
  processRuns: many(processRuns),
  portfolioAgingSnapshots: many(portfolioAgingSnapshots),
  creditFundBudgets: many(creditFundBudgets),
}));

// ---------------------------------------------------------------------
// Concr47 - Fondos de créditos
// ---------------------------------------------------------------------
export const creditFundsRelations = relations(creditFunds, ({ many }) => ({
  creditFundBudgets: many(creditFundBudgets),
  creditProducts: many(creditProducts),
  loanApplications: many(loanApplications),
  loans: many(loans),
}));

// ---------------------------------------------------------------------
// Concr48 - Presupuestos por fondos de créditos
// ---------------------------------------------------------------------
export const creditFundBudgetsRelations = relations(creditFundBudgets, ({ one }) => ({
  creditFund: one(creditFunds, {
    fields: [creditFundBudgets.creditFundId],
    references: [creditFunds.id],
  }),
  accountingPeriod: one(accountingPeriods, {
    fields: [creditFundBudgets.accountingPeriodId],
    references: [accountingPeriods.id],
  }),
}));

// ---------------------------------------------------------------------
// Concr62 - Usuario ↔ Oficina de afiliación
// ---------------------------------------------------------------------
export const userAffiliationOfficesRelations = relations(userAffiliationOffices, ({ one }) => ({
  affiliationOffice: one(affiliationOffices, {
    fields: [userAffiliationOffices.affiliationOfficeId],
    references: [affiliationOffices.id],
  }),
}));

// ---------------------------------------------------------------------
// Concr21 - Tipos de terceros
// ---------------------------------------------------------------------
export const thirdPartyTypesRelations = relations(thirdPartyTypes, ({ many }) => ({
  thirdParties: many(thirdParties),
}));

// ---------------------------------------------------------------------
// Concr20 - Terceros
// ---------------------------------------------------------------------
export const thirdPartiesRelations = relations(thirdParties, ({ one, many }) => ({
  thirdPartyType: one(thirdPartyTypes, {
    fields: [thirdParties.thirdPartyTypeId],
    references: [thirdPartyTypes.id],
  }),
  homeCity: one(cities, {
    relationName: 'thirdPartyHomeCity',
    fields: [thirdParties.homeCityId],
    references: [cities.id],
  }),
  workCity: one(cities, {
    relationName: 'thirdPartyWorkCity',
    fields: [thirdParties.workCityId],
    references: [cities.id],
  }),
  identificationType: one(identificationTypes, {
    fields: [thirdParties.identificationTypeId],
    references: [identificationTypes.id],
  }),
  loanApplications: many(loanApplications),
  loanApplicationCoDebtors: many(loanApplicationCoDebtors),
  loans: many(loans),
  accountingEntries: many(accountingEntries),
  // Relaciones inversas para loans (borrower y disbursementParty)
  loansBorrowed: many(loans, { relationName: 'loanBorrower' }),
  loansDisbursed: many(loans, { relationName: 'loanDisbursementParty' }),
  portfolioEntries: many(portfolioEntries),
}));

// ---------------------------------------------------------------------
// Concr25 - Empresas de seguros
// ---------------------------------------------------------------------
export const insuranceCompaniesRelations = relations(insuranceCompanies, ({ many, one }) => ({
  insuranceRateRanges: many(insuranceRateRanges),
  identificationType: one(identificationTypes, {
    fields: [insuranceCompanies.identificationTypeId],
    references: [identificationTypes.id],
  }),
  city: one(cities, {
    fields: [insuranceCompanies.cityId],
    references: [cities.id],
  }),

  distribution: one(accountingDistributions, {
    relationName: 'distribution',
    fields: [insuranceCompanies.distributionId],
    references: [accountingDistributions.id],
  }),
}));

// ---------------------------------------------------------------------
// Concr34 - Valores de seguros (rangos)
// ---------------------------------------------------------------------
export const insuranceRateRangesRelations = relations(insuranceRateRanges, ({ one }) => ({
  insuranceCompany: one(insuranceCompanies, {
    fields: [insuranceRateRanges.insuranceCompanyId],
    references: [insuranceCompanies.id],
  }),
}));

// ---------------------------------------------------------------------
// Concr07 - Tipos / Líneas de crédito
// ---------------------------------------------------------------------
export const creditProductsRelations = relations(creditProducts, ({ one, many }) => ({
  paymentAllocationPolicy: one(paymentAllocationPolicies, {
    fields: [creditProducts.paymentAllocationPolicyId],
    references: [paymentAllocationPolicies.id],
  }),
  creditFund: one(creditFunds, {
    fields: [creditProducts.creditFundId],
    references: [creditFunds.id],
  }),
  // 3 FKs -> relationName para evitar ambigüedad
  capitalDistribution: one(accountingDistributions, {
    relationName: 'capitalDistribution',
    fields: [creditProducts.capitalDistributionId],
    references: [accountingDistributions.id],
  }),
  interestDistribution: one(accountingDistributions, {
    relationName: 'interestDistribution',
    fields: [creditProducts.interestDistributionId],
    references: [accountingDistributions.id],
  }),
  lateInterestDistribution: one(accountingDistributions, {
    relationName: 'lateInterestDistribution',
    fields: [creditProducts.lateInterestDistributionId],
    references: [accountingDistributions.id],
  }),
  costCenter: one(costCenters, {
    fields: [creditProducts.costCenterId],
    references: [costCenters.id],
  }),
  creditProductRefinancePolicy: one(creditProductRefinancePolicies, {
    fields: [creditProducts.id],
    references: [creditProductRefinancePolicies.creditProductId],
  }),
  creditProductCategories: many(creditProductCategories),
  creditProductDocuments: many(creditProductDocuments),
  creditProductAccounts: many(creditProductAccounts),
  creditProductLateInterestRules: many(creditProductLateInterestRules),
  creditProductBillingConcepts: many(creditProductBillingConcepts),
}));

// ---------------------------------------------------------------------
// Concr30 - Categorías por tipos de crédito (rangos de cuotas + factores)
// ---------------------------------------------------------------------
export const creditProductCategoriesRelations = relations(creditProductCategories, ({ one }) => ({
  creditProduct: one(creditProducts, {
    fields: [creditProductCategories.creditProductId],
    references: [creditProducts.id],
  }),
}));

// ---------------------------------------------------------------------
// Concr44 - Tipos de crédito vs Documentos requeridos (pivot)
// ---------------------------------------------------------------------
export const creditProductDocumentsRelations = relations(creditProductDocuments, ({ one }) => ({
  creditProduct: one(creditProducts, {
    fields: [creditProductDocuments.creditProductId],
    references: [creditProducts.id],
  }),
  documentType: one(documentTypes, {
    fields: [creditProductDocuments.documentTypeId],
    references: [documentTypes.id],
  }),
}));

// ---------------------------------------------------------------------
// Concr26 - Auxiliares por tipos de crédito
// ---------------------------------------------------------------------
export const creditProductAccountsRelations = relations(creditProductAccounts, ({ one }) => ({
  creditProduct: one(creditProducts, {
    fields: [creditProductAccounts.creditProductId],
    references: [creditProducts.id],
  }),
  // 3 FKs a gl_accounts => relationName
  capitalGlAccount: one(glAccounts, {
    relationName: 'capitalGlAccount',
    fields: [creditProductAccounts.capitalGlAccountId],
    references: [glAccounts.id],
  }),
  interestGlAccount: one(glAccounts, {
    relationName: 'interestGlAccount',
    fields: [creditProductAccounts.interestGlAccountId],
    references: [glAccounts.id],
  }),
  lateInterestGlAccount: one(glAccounts, {
    relationName: 'lateInterestGlAccount',
    fields: [creditProductAccounts.lateInterestGlAccountId],
    references: [glAccounts.id],
  }),
}));

// ---------------------------------------------------------------------
// Concr39 - Solicitudes de créditos
// ---------------------------------------------------------------------
export const loanApplicationsRelations = relations(loanApplications, ({ one, many }) => ({
  affiliationOffice: one(affiliationOffices, {
    fields: [loanApplications.affiliationOfficeId],
    references: [affiliationOffices.id],
  }),
  creditFund: one(creditFunds, {
    fields: [loanApplications.creditFundId],
    references: [creditFunds.id],
  }),
  thirdParty: one(thirdParties, {
    fields: [loanApplications.thirdPartyId],
    references: [thirdParties.id],
  }),
  repaymentMethod: one(repaymentMethods, {
    fields: [loanApplications.repaymentMethodId],
    references: [repaymentMethods.id],
  }),
  bank: one(banks, {
    fields: [loanApplications.bankId],
    references: [banks.id],
  }),
  creditProduct: one(creditProducts, {
    fields: [loanApplications.creditProductId],
    references: [creditProducts.id],
  }),
  paymentFrequency: one(paymentFrequencies, {
    fields: [loanApplications.paymentFrequencyId],
    references: [paymentFrequencies.id],
  }),
  insuranceCompany: one(insuranceCompanies, {
    fields: [loanApplications.insuranceCompanyId],
    references: [insuranceCompanies.id],
  }),
  rejectionReason: one(rejectionReasons, {
    fields: [loanApplications.rejectionReasonId],
    references: [rejectionReasons.id],
  }),
  investmentType: one(investmentTypes, {
    fields: [loanApplications.investmentTypeId],
    references: [investmentTypes.id],
  }),
  channel: one(channels, {
    fields: [loanApplications.channelId],
    references: [channels.id],
  }),
  paymentGuaranteeType: one(paymentGuaranteeTypes, {
    fields: [loanApplications.paymentGuaranteeTypeId],
    references: [paymentGuaranteeTypes.id],
  }),

  loans: many(loans),
  loanApplicationCoDebtors: many(loanApplicationCoDebtors),
  loanApplicationDocuments: many(loanApplicationDocuments),
  loanApplicationPledges: many(loanApplicationPledges),
  loanApplicationStatusHistory: many(loanApplicationStatusHistory),
  loanApplicationEvents: many(loanApplicationEvents),
  loanApplicationRiskAssessments: many(loanApplicationRiskAssessments),
}));

// ---------------------------------------------------------------------
// Concr16 - Pignoraciones por núcleo familiar
// ---------------------------------------------------------------------
export const loanApplicationPledgesRelations = relations(loanApplicationPledges, ({ one }) => ({
  loanApplication: one(loanApplications, {
    fields: [loanApplicationPledges.loanApplicationId],
    references: [loanApplications.id],
  }),
}));

// ---------------------------------------------------------------------
// Concr41 - Relación solicitud - codeudor
// ---------------------------------------------------------------------
export const loanApplicationCoDebtorsRelations = relations(loanApplicationCoDebtors, ({ one }) => ({
  loanApplication: one(loanApplications, {
    fields: [loanApplicationCoDebtors.loanApplicationId],
    references: [loanApplications.id],
  }),
  thirdParty: one(thirdParties, {
    fields: [loanApplicationCoDebtors.thirdPartyId],
    references: [thirdParties.id],
  }),
}));

// ---------------------------------------------------------------------
// Concr45 - Documentos entregados en solicitudes
// ---------------------------------------------------------------------
export const loanApplicationDocumentsRelations = relations(loanApplicationDocuments, ({ one }) => ({
  loanApplication: one(loanApplications, {
    fields: [loanApplicationDocuments.loanApplicationId],
    references: [loanApplications.id],
  }),
  documentType: one(documentTypes, {
    fields: [loanApplicationDocuments.documentTypeId],
    references: [documentTypes.id],
  }),
}));

// ---------------------------------------------------------------------
// Concr08 - Créditos aprobados / liquidados
// ---------------------------------------------------------------------
export const loansRelations = relations(loans, ({ one, many }) => ({
  borrower: one(thirdParties, {
    fields: [loans.thirdPartyId],
    references: [thirdParties.id],
    relationName: 'loanBorrower',
  }),
  disbursementParty: one(thirdParties, {
    fields: [loans.payeeThirdPartyId],
    references: [thirdParties.id],
    relationName: 'loanDisbursementParty',
  }),
  loanApplication: one(loanApplications, {
    fields: [loans.loanApplicationId],
    references: [loanApplications.id],
  }),
  agreement: one(agreements, {
    fields: [loans.agreementId],
    references: [agreements.id],
  }),
  bank: one(banks, {
    fields: [loans.bankId],
    references: [banks.id],
  }),
  creditFund: one(creditFunds, {
    fields: [loans.creditFundId],
    references: [creditFunds.id],
  }),
  repaymentMethod: one(repaymentMethods, {
    fields: [loans.repaymentMethodId],
    references: [repaymentMethods.id],
  }),
  paymentFrequency: one(paymentFrequencies, {
    fields: [loans.paymentFrequencyId],
    references: [paymentFrequencies.id],
  }),
  paymentGuaranteeType: one(paymentGuaranteeTypes, {
    fields: [loans.paymentGuaranteeTypeId],
    references: [paymentGuaranteeTypes.id],
  }),
  affiliationOffice: one(affiliationOffices, {
    fields: [loans.affiliationOfficeId],
    references: [affiliationOffices.id],
  }),
  insuranceCompany: one(insuranceCompanies, {
    fields: [loans.insuranceCompanyId],
    references: [insuranceCompanies.id],
  }),
  costCenter: one(costCenters, {
    fields: [loans.costCenterId],
    references: [costCenters.id],
  }),
  channel: one(channels, {
    fields: [loans.channelId],
    references: [channels.id],
  }),
  loanProcessStates: one(loanProcessStates, {
    fields: [loans.id],
    references: [loanProcessStates.loanId],
  }),
  loanInstallments: many(loanInstallments),
  portfolioEntries: many(portfolioEntries),
  accountingEntries: many(accountingEntries),
  loanRefinancingLinksRefinanced: many(loanRefinancingLinks, { relationName: 'refinancedLoan' }),
  loanRefinancingLinksReference: many(loanRefinancingLinks, { relationName: 'referenceLoan' }),
  portfolioAgingSnapshots: many(portfolioAgingSnapshots),
  payrollExcessPayments: many(payrollExcessPayments),
  loanPayments: many(loanPayments),
  loanAgreementHistory: many(loanAgreementHistory),
  loanStatusHistory: many(loanStatusHistory),
}));

// ---------------------------------------------------------------------
// Historial de convenios por credito
// ---------------------------------------------------------------------
export const loanAgreementHistoryRelations = relations(loanAgreementHistory, ({ one }) => ({
  loan: one(loans, {
    fields: [loanAgreementHistory.loanId],
    references: [loans.id],
  }),
  agreement: one(agreements, {
    fields: [loanAgreementHistory.agreementId],
    references: [agreements.id],
  }),
}));

// ---------------------------------------------------------------------
// Historial de estados del credito
// ---------------------------------------------------------------------
export const loanStatusHistoryRelations = relations(loanStatusHistory, ({ one }) => ({
  loan: one(loans, {
    fields: [loanStatusHistory.loanId],
    references: [loans.id],
  }),
}));

// ---------------------------------------------------------------------
// Concr09 - Plan de pagos (cuotas)
// ---------------------------------------------------------------------
export const loanInstallmentsRelations = relations(loanInstallments, ({ one }) => ({
  loan: one(loans, {
    fields: [loanInstallments.loanId],
    references: [loans.id],
  }),
}));

// ---------------------------------------------------------------------
// Concr52 — Acta diaria por oficina
// ---------------------------------------------------------------------
export const loanApplicationActNumbersRelations = relations(
  loanApplicationActNumbers,
  ({ one }) => ({
    affiliationOffice: one(affiliationOffices, {
      fields: [loanApplicationActNumbers.affiliationOfficeId],
      references: [affiliationOffices.id],
    }),
  })
);

// ---------------------------------------------------------------------
// Concr17 - Cartera por ítem (saldo actual)
// ---------------------------------------------------------------------
export const portfolioEntriesRelations = relations(portfolioEntries, ({ one }) => ({
  glAccount: one(glAccounts, {
    fields: [portfolioEntries.glAccountId],
    references: [glAccounts.id],
  }),
  thirdParty: one(thirdParties, {
    fields: [portfolioEntries.thirdPartyId],
    references: [thirdParties.id],
  }),
  loan: one(loans, {
    fields: [portfolioEntries.loanId],
    references: [loans.id],
  }),
}));

// ---------------------------------------------------------------------
// Concr22 - Movimientos contables
// ---------------------------------------------------------------------
export const accountingEntriesRelations = relations(accountingEntries, ({ one }) => ({
  glAccount: one(glAccounts, {
    fields: [accountingEntries.glAccountId],
    references: [glAccounts.id],
  }),
  costCenter: one(costCenters, {
    fields: [accountingEntries.costCenterId],
    references: [costCenters.id],
  }),
  thirdParty: one(thirdParties, {
    fields: [accountingEntries.thirdPartyId],
    references: [thirdParties.id],
  }),
  loan: one(loans, {
    fields: [accountingEntries.loanId],
    references: [loans.id],
  }),
  processRun: one(processRuns, {
    fields: [accountingEntries.processRunId],
    references: [processRuns.id],
  }),
}));

// ---------------------------------------------------------------------
// Concr23 - Refinanciaciones / Reestructuraciones (links)
// ---------------------------------------------------------------------
export const loanRefinancingLinksRelations = relations(loanRefinancingLinks, ({ one }) => ({
  refinancedLoan: one(loans, {
    fields: [loanRefinancingLinks.loanId],
    references: [loans.id],
    relationName: 'refinancedLoan',
  }),
  referenceLoan: one(loans, {
    fields: [loanRefinancingLinks.referenceLoanId],
    references: [loans.id],
    relationName: 'referenceLoan',
  }),
}));

// ---------------------------------------------------------------------
// Concr33-Concr42 Process Runs
// ---------------------------------------------------------------------
export const processRunsRelations = relations(processRuns, ({ one, many }) => ({
  accountingPeriod: one(accountingPeriods, {
    fields: [processRuns.accountingPeriodId],
    references: [accountingPeriods.id],
  }),
  loanProcessStates: many(loanProcessStates),
  accountingEntries: many(accountingEntries),
}));

// ---------------------------------------------------------------------
// Loan Process State (idempotencia por crédito + tipo)
// ---------------------------------------------------------------------
export const loanProcessStatesRelations = relations(loanProcessStates, ({ one }) => ({
  loan: one(loans, {
    fields: [loanProcessStates.loanId],
    references: [loans.id],
  }),
  lastProcessRun: one(processRuns, {
    fields: [loanProcessStates.lastProcessRunId],
    references: [processRuns.id],
  }),
}));

// ---------------------------------------------------------------------
// Concr63-Concr28 - Histórico cartera (aging snapshot)
// ---------------------------------------------------------------------
export const portfolioAgingSnapshotsRelations = relations(portfolioAgingSnapshots, ({ one }) => ({
  accountingPeriod: one(accountingPeriods, {
    fields: [portfolioAgingSnapshots.accountingPeriodId],
    references: [accountingPeriods.id],
  }),
  affiliationOffice: one(affiliationOffices, {
    fields: [portfolioAgingSnapshots.affiliationOfficeId],
    references: [affiliationOffices.id],
  }),
  creditProduct: one(creditProducts, {
    fields: [portfolioAgingSnapshots.creditProductId],
    references: [creditProducts.id],
  }),
  glAccount: one(glAccounts, {
    fields: [portfolioAgingSnapshots.glAccountId],
    references: [glAccounts.id],
  }),
  loan: one(loans, {
    fields: [portfolioAgingSnapshots.loanId],
    references: [loans.id],
  }),
  repaymentMethod: one(repaymentMethods, {
    fields: [portfolioAgingSnapshots.repaymentMethodId],
    references: [repaymentMethods.id],
  }),
  thirdParty: one(thirdParties, {
    fields: [portfolioAgingSnapshots.thirdPartyId],
    references: [thirdParties.id],
  }),
}));

// ---------------------------------------------------------------------
// Concr64 - Excedentes de nómina/libranza
// ---------------------------------------------------------------------
export const payrollExcessPaymentsRelations = relations(payrollExcessPayments, ({ one }) => ({
  loan: one(loans, {
    fields: [payrollExcessPayments.loanId],
    references: [loans.id],
  }),
}));

// ---------------------------------------------------------------------
// Concr32 - Abonos
// ---------------------------------------------------------------------
export const loanPaymentsRelations = relations(loanPayments, ({ one, many }) => ({
  loan: one(loans, {
    fields: [loanPayments.loanId],
    references: [loans.id],
  }),
  paymentReceiptType: one(paymentReceiptTypes, {
    fields: [loanPayments.receiptTypeId],
    references: [paymentReceiptTypes.id],
  }),
  glAccount: one(glAccounts, {
    fields: [loanPayments.glAccountId],
    references: [glAccounts.id],
  }),
  loanPaymentMethodAllocations: many(loanPaymentMethodAllocations),
}));

// ---------------------------------------------------------------------
// Concr35 - Valores por formas de pago en abonos
// ---------------------------------------------------------------------
export const loanPaymentMethodAllocationsRelations = relations(
  loanPaymentMethodAllocations,
  ({ one }) => ({
    loanPayment: one(loanPayments, {
      fields: [loanPaymentMethodAllocations.loanPaymentId],
      references: [loanPayments.id],
    }),
    collectionMethod: one(paymentTenderTypes, {
      fields: [loanPaymentMethodAllocations.collectionMethodId],
      references: [paymentTenderTypes.id],
    }),
  })
);

// ---------------------------------------------------------------------
// Concr01 - Configuración global del módulo de créditos
// ---------------------------------------------------------------------
export const creditsSettingsRelations = relations(creditsSettings, ({ one }) => ({
  cashGlAccount: one(glAccounts, {
    fields: [creditsSettings.cashGlAccountId],
    references: [glAccounts.id],
    relationName: 'cashGlAccount',
  }),
  majorGlAccount: one(glAccounts, {
    fields: [creditsSettings.majorGlAccountId],
    references: [glAccounts.id],
    relationName: 'majorGlAccount',
  }),
  excessGlAccount: one(glAccounts, {
    fields: [creditsSettings.excessGlAccountId],
    references: [glAccounts.id],
    relationName: 'excessGlAccount',
  }),
  pledgeSubsidyGlAccount: one(glAccounts, {
    fields: [creditsSettings.pledgeSubsidyGlAccountId],
    references: [glAccounts.id],
    relationName: 'pledgeSubsidyGlAccount',
  }),
  writeOffGlAccount: one(glAccounts, {
    fields: [creditsSettings.writeOffGlAccountId],
    references: [glAccounts.id],
    relationName: 'writeOffGlAccount',
  }),
  defaultCostCenter: one(costCenters, {
    fields: [creditsSettings.defaultCostCenterId],
    references: [costCenters.id],
  }),
}));

// ---------------------------------------------------------------------
// Billing Concepts - Catálogo
// ---------------------------------------------------------------------
export const billingConceptsRelations = relations(billingConcepts, ({ many, one }) => ({
  billingConceptRules: many(billingConceptRules),
  creditProductBillingConcepts: many(creditProductBillingConcepts),
  loanBillingConcepts: many(loanBillingConcepts),
  defaultGlAccount: one(glAccounts, {
    fields: [billingConcepts.defaultGlAccountId],
    references: [glAccounts.id],
  }),
}));

// ---------------------------------------------------------------------
// Billing Concept Rules - Reglas / Rangos / Vigencias
// ---------------------------------------------------------------------
export const billingConceptRulesRelations = relations(billingConceptRules, ({ one }) => ({
  billingConcept: one(billingConcepts, {
    fields: [billingConceptRules.billingConceptId],
    references: [billingConcepts.id],
  }),
}));

// ---------------------------------------------------------------------
// Concr07 (credit_products) -> Conceptos por producto
// ---------------------------------------------------------------------
export const creditProductBillingConceptsRelations = relations(
  creditProductBillingConcepts,
  ({ one }) => ({
    creditProduct: one(creditProducts, {
      fields: [creditProductBillingConcepts.creditProductId],
      references: [creditProducts.id],
    }),
    billingConcept: one(billingConcepts, {
      fields: [creditProductBillingConcepts.billingConceptId],
      references: [billingConcepts.id],
    }),
    overrideBillingConceptRule: one(billingConceptRules, {
      fields: [creditProductBillingConcepts.overrideRuleId],
      references: [billingConceptRules.id],
    }),
    overrideGlAccount: one(glAccounts, {
      fields: [creditProductBillingConcepts.overrideGlAccountId],
      references: [glAccounts.id],
    }),
  })
);

// ---------------------------------------------------------------------
// Concr08 (loans) -> Conceptos "congelados" por crédito (snapshot)
// ---------------------------------------------------------------------
export const loanBillingConceptsRelations = relations(loanBillingConcepts, ({ one }) => ({
  loan: one(loans, {
    fields: [loanBillingConcepts.loanId],
    references: [loans.id],
  }),
  billingConcept: one(billingConcepts, {
    fields: [loanBillingConcepts.billingConceptId],
    references: [billingConcepts.id],
  }),
  sourceBillingConceptRule: one(billingConceptRules, {
    fields: [loanBillingConcepts.sourceRuleId],
    references: [billingConceptRules.id],
  }),
  glAccount: one(glAccounts, {
    fields: [loanBillingConcepts.glAccountId],
    references: [glAccounts.id],
  }),
  sourceCreditProductBillingConcept: one(creditProductBillingConcepts, {
    fields: [loanBillingConcepts.sourceCreditProductConceptId],
    references: [creditProductBillingConcepts.id],
  }),
}));

// ---------------------------------------------------------------------
// Reglas de interés de mora por edad de mora (días)
// ---------------------------------------------------------------------
export const creditProductLateInterestRulesRelations = relations(
  creditProductLateInterestRules,
  ({ one }) => ({
    creditProduct: one(creditProducts, {
      fields: [creditProductLateInterestRules.creditProductId],
      references: [creditProducts.id],
    }),
  })
);

// ---------------------------------------------------------------------
// Concr59 - Convenios / Pagadurías
// ---------------------------------------------------------------------
export const agreementsRelations = relations(agreements, ({ many, one }) => ({
  loans: many(loans),
  loanAgreementHistory: many(loanAgreementHistory),
  billingCycleProfiles: many(billingCycleProfiles),
  city: one(cities, {
    fields: [agreements.cityId],
    references: [cities.id],
  }),
}));

// ---------------------------------------------------------------------
// Billing Cycle Profiles
// ---------------------------------------------------------------------
export const billingCycleProfilesRelations = relations(billingCycleProfiles, ({ one, many }) => ({
  creditProduct: one(creditProducts, {
    fields: [billingCycleProfiles.creditProductId],
    references: [creditProducts.id],
  }),
  agreement: one(agreements, {
    fields: [billingCycleProfiles.agreementId],
    references: [agreements.id],
  }),
  billingCycleProfileCycles: many(billingCycleProfileCycles),
}));

// ---------------------------------------------------------------------
// Billing Cycle Profile Cycles
// ---------------------------------------------------------------------
export const billingCycleProfileCyclesRelations = relations(
  billingCycleProfileCycles,
  ({ one }) => ({
    billingCycleProfile: one(billingCycleProfiles, {
      fields: [billingCycleProfileCycles.billingCycleProfileId],
      references: [billingCycleProfiles.id],
    }),
  })
);

// ---------------------------------------------------------------------
// Historial de evaluaciones de riesgo por solicitud
// ---------------------------------------------------------------------
export const loanApplicationRiskAssessmentsRelations = relations(
  loanApplicationRiskAssessments,
  ({ one }) => ({
    loanApplication: one(loanApplications, {
      fields: [loanApplicationRiskAssessments.loanApplicationId],
      references: [loanApplications.id],
    }),
  })
);

// ---------------------------------------------------------------------
// Canales de creación de créditos
// ---------------------------------------------------------------------
export const channelsRelations = relations(channels, ({ many }) => ({
  loanApplications: many(loanApplications),
  loans: many(loans),
}));

// ---------------------------------------------------------------------
// Historial de estados (trazabilidad del ciclo)
// ---------------------------------------------------------------------
export const loanApplicationStatusHistoryRelations = relations(
  loanApplicationStatusHistory,
  ({ one }) => ({
    loanApplication: one(loanApplications, {
      fields: [loanApplicationStatusHistory.loanApplicationId],
      references: [loanApplications.id],
    }),
  })
);

// ---------------------------------------------------------------------
// Eventos / Integraciones (trazabilidad técnica + payloads)
// ---------------------------------------------------------------------
export const loanApplicationEventsRelations = relations(loanApplicationEvents, ({ one }) => ({
  loanApplication: one(loanApplications, {
    fields: [loanApplicationEvents.loanApplicationId],
    references: [loanApplications.id],
  }),
}));

// ---------------------------------------------------------------------
// Políticas de refinanciación / consolidación por producto
// ---------------------------------------------------------------------
export const creditProductRefinancePoliciesRelations = relations(
  creditProductRefinancePolicies,
  ({ one }) => ({
    creditProduct: one(creditProducts, {
      fields: [creditProductRefinancePolicies.creditProductId],
      references: [creditProducts.id],
    }),
  })
);

// ---------------------------------------------------------------------
// Aging Profiles - Perfiles de edades de cartera
// Nota:
// Define una versión/configuración de buckets (rangos de días) para reportes
// de cartera por edades y cálculo de provisiones.
// ---------------------------------------------------------------------
export const agingProfilesRelations = relations(agingProfiles, ({ many }) => ({
  agingBuckets: many(agingBuckets),
}));

// ---------------------------------------------------------------------
// Aging Buckets - Rangos de días para aging
// Nota:
// Define los rangos de días de mora (0, 1-30, 31-60, etc.) y su tasa de
// provisión asociada. Pertenece a un AgingProfile.
// ---------------------------------------------------------------------
export const agingBucketsRelations = relations(agingBuckets, ({ one }) => ({
  agingProfile: one(agingProfiles, {
    fields: [agingBuckets.agingProfileId],
    references: [agingProfiles.id],
  }),
}));

// ---------------------------------------------------------------------
// Portfolio Provision Snapshots (cabecera)
// ---------------------------------------------------------------------
export const portfolioProvisionSnapshotsRelations = relations(
  portfolioProvisionSnapshots,
  ({ one, many }) => ({
    accountingPeriod: one(accountingPeriods, {
      fields: [portfolioProvisionSnapshots.accountingPeriodId],
      references: [accountingPeriods.id],
    }),
    agingProfile: one(agingProfiles, {
      fields: [portfolioProvisionSnapshots.agingProfileId],
      references: [agingProfiles.id],
    }),
    portfolioProvisionSnapshotDetails: many(portfolioProvisionSnapshotDetails),
  })
);

// ---------------------------------------------------------------------
// Portfolio Provision Snapshot Details (detalle)
// ---------------------------------------------------------------------
export const portfolioProvisionSnapshotDetailsRelations = relations(
  portfolioProvisionSnapshotDetails,
  ({ one }) => ({
    portfolioProvisionSnapshot: one(portfolioProvisionSnapshots, {
      fields: [portfolioProvisionSnapshotDetails.provisionSnapshotId],
      references: [portfolioProvisionSnapshots.id],
    }),
    portfolioAgingSnapshot: one(portfolioAgingSnapshots, {
      fields: [portfolioProvisionSnapshotDetails.agingSnapshotId],
      references: [portfolioAgingSnapshots.id],
    }),
    agingBucket: one(agingBuckets, {
      fields: [portfolioProvisionSnapshotDetails.agingBucketId],
      references: [agingBuckets.id],
    }),
  })
);

// ---------------------------------------------------------------------
// Payment Allocation Policies - Políticas de prelación
// Nota:
// Define una modalidad de imputación de pagos (NORMAL, PAGO_A_CAPITAL, etc.)
// y cómo se maneja el excedente.
// ---------------------------------------------------------------------
export const paymentAllocationPoliciesRelations = relations(
  paymentAllocationPolicies,
  ({ many }) => ({
    paymentAllocationPolicyRules: many(paymentAllocationPolicyRules),
  })
);

// ---------------------------------------------------------------------
// Payment Allocation Policy Rules - Reglas de prelación
// Nota:
// Define el orden (priority) y cómo imputar por concepto dentro de una política.
// ---------------------------------------------------------------------
export const paymentAllocationPolicyRulesRelations = relations(
  paymentAllocationPolicyRules,
  ({ one }) => ({
    paymentAllocationPolicy: one(paymentAllocationPolicies, {
      fields: [paymentAllocationPolicyRules.paymentAllocationPolicyId],
      references: [paymentAllocationPolicies.id],
    }),
    billingConcept: one(billingConcepts, {
      fields: [paymentAllocationPolicyRules.billingConceptId],
      references: [billingConcepts.id],
    }),
  })
);
