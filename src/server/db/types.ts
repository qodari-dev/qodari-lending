// ---------------------------------------------------------------------
// types.ts - Tipos TypeScript inferidos del schema de Drizzle
// ---------------------------------------------------------------------
// Este archivo contiene todos los tipos inferidos de las tablas.
// Los tipos con & {...} incluyen las relaciones opcionales.
// Los tipos New* son para inserciones.
// ---------------------------------------------------------------------

import type {
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
  creditProductChargeOffPolicies,
  agingProfiles,
  agingBuckets,
  portfolioProvisionSnapshots,
  portfolioProvisionSnapshotDetails,
  paymentAllocationPolicies,
  paymentAllocationPolicyRules,
  identificationTypes,
  cities,
} from './schema';

// ---------------------------------------------------------------------
// Tipos de identificacion
// ---------------------------------------------------------------------
export type IdentificationTypes = typeof identificationTypes.$inferSelect & {
  thirdParties?: ThirdParties[];
  insuranceCompanies?: InsuranceCompanies[];
};
export type NewIdentificationTypes = typeof identificationTypes.$inferInsert;

// ---------------------------------------------------------------------
// cities
// ---------------------------------------------------------------------
export type Cities = typeof cities.$inferSelect & {
  thirdPartiesHome?: ThirdParties[];
  thirdPartiesWork?: ThirdParties[];
  insuranceCompanies?: InsuranceCompanies[];
  affiliationOffices?: AffiliationOffices[];
  agreements?: Agreements[];
};
export type NewCities = typeof cities.$inferInsert;

// ---------------------------------------------------------------------
// Concr43 - Tipos de documentos requeridos en solicitudes
// ---------------------------------------------------------------------
export type DocumentTypes = typeof documentTypes.$inferSelect & {
  creditProductDocuments?: CreditProductDocuments[];
  loanApplicationDocuments?: LoanApplicationDocuments[];
};
export type NewDocumentTypes = typeof documentTypes.$inferInsert;

// ---------------------------------------------------------------------
// Concr14 - Motivos de rechazo
// ---------------------------------------------------------------------
export type RejectionReasons = typeof rejectionReasons.$inferSelect & {
  loanApplications?: LoanApplications[];
};
export type NewRejectionReasons = typeof rejectionReasons.$inferInsert;

// ---------------------------------------------------------------------
// Concr15 - Formas de pago (del crédito)
// ---------------------------------------------------------------------
export type RepaymentMethods = typeof repaymentMethods.$inferSelect & {
  loanApplications?: LoanApplications[];
  loans?: Loans[];
};
export type NewRepaymentMethods = typeof repaymentMethods.$inferInsert;

// ---------------------------------------------------------------------
// Concr11 - Garantías de pago
// ---------------------------------------------------------------------
export type PaymentGuaranteeTypes = typeof paymentGuaranteeTypes.$inferSelect & {
  loans?: Loans[];
  loanApplications?: LoanApplications[];
};
export type NewPaymentGuaranteeTypes = typeof paymentGuaranteeTypes.$inferInsert;

// ---------------------------------------------------------------------
// Concr13 - Periodicidad de pagos
// ---------------------------------------------------------------------
export type PaymentFrequencies = typeof paymentFrequencies.$inferSelect & {
  loanApplications?: LoanApplications[];
  loans?: Loans[];
};
export type NewPaymentFrequencies = typeof paymentFrequencies.$inferInsert;

// ---------------------------------------------------------------------
// Concr56 - Tipos de inversión
// ---------------------------------------------------------------------
export type InvestmentTypes = typeof investmentTypes.$inferSelect & {
  loanApplications?: LoanApplications[];
};
export type NewInvestmentTypes = typeof investmentTypes.$inferInsert;

// ---------------------------------------------------------------------
// Concr53 - Formas de pago tesorería (medios de pago del abono)
// ---------------------------------------------------------------------
export type PaymentTenderTypes = typeof paymentTenderTypes.$inferSelect & {
  loanPaymentMethodAllocations?: LoanPaymentMethodAllocations[];
};
export type NewPaymentTenderTypes = typeof paymentTenderTypes.$inferInsert;

// ---------------------------------------------------------------------
// Concr61 - Bancos
// ---------------------------------------------------------------------
export type Banks = typeof banks.$inferSelect & {
  loanApplications?: LoanApplications[];
  loans?: Loans[];
};
export type NewBanks = typeof banks.$inferInsert;

// ---------------------------------------------------------------------
// Concr18 - Plan Único de Cuentas (Auxiliares)
// ---------------------------------------------------------------------
export type GlAccounts = typeof glAccounts.$inferSelect & {
  accountingEntries?: AccountingEntries[];
  accountingDistributionLines?: AccountingDistributionLines[];
  portfolioEntries?: PortfolioEntries[];
  portfolioAgingSnapshots?: PortfolioAgingSnapshots[];
  loanPayments?: LoanPayments[];
  paymentReceiptTypes?: PaymentReceiptTypes[];

  creditProductGlAccountsAsCapital?: CreditProductAccounts[];
  creditProductGlAccountsAsInterest?: CreditProductAccounts[];
  creditProductGlAccountsAsLateInterest?: CreditProductAccounts[];

  creditsSettingsAsCash?: CreditsSettings[];
  creditsSettingsAsMajor?: CreditsSettings[];
  creditsSettingsAsExcess?: CreditsSettings[];
  creditsSettingsAsPledgeSubsidy?: CreditsSettings[];
  creditsSettingsAsWriteOff?: CreditsSettings[];
  creditsSettingsAsFundRegister?: CreditsSettings[];
};
export type NewGlAccounts = typeof glAccounts.$inferInsert;

// ---------------------------------------------------------------------
// Concr19 - Centros de costos
// ---------------------------------------------------------------------
export type CostCenters = typeof costCenters.$inferSelect & {
  accountingDistributionLines?: AccountingDistributionLines[];
  creditsSettings?: CreditsSettings[];
  accountingEntries?: AccountingEntries[];
};
export type NewCostCenters = typeof costCenters.$inferInsert;

// ---------------------------------------------------------------------
// Concr05 - Distribuciones contables (tipos de distribución)
// ---------------------------------------------------------------------
export type AccountingDistributions = typeof accountingDistributions.$inferSelect & {
  accountingDistributionLines?: AccountingDistributionLines[];

  creditProductsAsCapitalDistribution?: CreditProducts[];
  creditProductsAsInterestDistribution?: CreditProducts[];
  creditProductsAsLateInterestDistribution?: CreditProducts[];

  insuranceCompaniesAsDistribution?: InsuranceCompanies[];
};
export type NewAccountingDistributions = typeof accountingDistributions.$inferInsert;

// ---------------------------------------------------------------------
// Concr06 - Auxiliares por distribuciones contables
// ---------------------------------------------------------------------
export type AccountingDistributionLines = typeof accountingDistributionLines.$inferSelect & {
  accountingDistribution?: AccountingDistributions;
  glAccount?: GlAccounts;
  costCenter?: CostCenters;
};
export type NewAccountingDistributionLines = typeof accountingDistributionLines.$inferInsert;

// ---------------------------------------------------------------------
// Concr29 - Tipos de recibos de abonos
// ---------------------------------------------------------------------
export type PaymentReceiptTypes = typeof paymentReceiptTypes.$inferSelect & {
  glAccount?: GlAccounts;
  loanPayments?: LoanPayments[];
  userPaymentReceiptTypes?: UserPaymentReceiptTypes[];
  payrollExcessPayments?: PayrollExcessPayments[];
};
export type NewPaymentReceiptTypes = typeof paymentReceiptTypes.$inferInsert;

// ---------------------------------------------------------------------
// Concr31 - Usuarios para recibos de abonos
// ---------------------------------------------------------------------
export type UserPaymentReceiptTypes = typeof userPaymentReceiptTypes.$inferSelect & {
  paymentReceiptType?: PaymentReceiptTypes;
};
export type NewUserPaymentReceiptTypes = typeof userPaymentReceiptTypes.$inferInsert;

// ---------------------------------------------------------------------
// Concr46 - Oficinas de afiliación
// ---------------------------------------------------------------------
export type AffiliationOffices = typeof affiliationOffices.$inferSelect & {
  costCenter?: CostCenters | null;
  city?: Cities;

  loanApplications?: LoanApplications[];
  loans?: Loans[];
  loanApplicationDocuments?: LoanApplicationDocuments[];
  loanApplicationCoDebtors?: LoanApplicationCoDebtors[];
  loanApplicationActNumbers?: LoanApplicationActNumbers[];
  userAffiliationOffices?: UserAffiliationOffices[];
  portfolioAgingSnapshots?: PortfolioAgingSnapshots[];
};
export type NewAffiliationOffices = typeof affiliationOffices.$inferInsert;

// ---------------------------------------------------------------------
// Concr27 - Periodos contables
// ---------------------------------------------------------------------
export type AccountingPeriods = typeof accountingPeriods.$inferSelect & {
  processRuns?: ProcessRuns[];
  portfolioAgingSnapshots?: PortfolioAgingSnapshots[];
  creditFundBudgets?: CreditFundBudgets[];
};
export type NewAccountingPeriods = typeof accountingPeriods.$inferInsert;

// ---------------------------------------------------------------------
// Concr47 - Fondos de créditos
// ---------------------------------------------------------------------
export type CreditFunds = typeof creditFunds.$inferSelect & {
  creditFundBudgets?: CreditFundBudgets[];
  creditProducts?: CreditProducts[];
  loanApplications?: LoanApplications[];
  loans?: Loans[];
};
export type NewCreditFunds = typeof creditFunds.$inferInsert;

// ---------------------------------------------------------------------
// Concr48 - Presupuestos por fondos de créditos
// ---------------------------------------------------------------------
export type CreditFundBudgets = typeof creditFundBudgets.$inferSelect & {
  creditFund?: CreditFunds;
  accountingPeriod?: AccountingPeriods;
};
export type NewCreditFundBudgets = typeof creditFundBudgets.$inferInsert;

// ---------------------------------------------------------------------
// Concr62 - Usuario ↔ Oficina de afiliación
// ---------------------------------------------------------------------
export type UserAffiliationOffices = typeof userAffiliationOffices.$inferSelect & {
  affiliationOffice?: AffiliationOffices;
};
export type NewUserAffiliationOffices = typeof userAffiliationOffices.$inferInsert;

// ---------------------------------------------------------------------
// Concr21 - Tipos de terceros
// ---------------------------------------------------------------------
export type ThirdPartyTypes = typeof thirdPartyTypes.$inferSelect & {
  thirdParties?: ThirdParties[];
};
export type NewThirdPartyTypes = typeof thirdPartyTypes.$inferInsert;

// ---------------------------------------------------------------------
// Concr20 - Terceros
// ---------------------------------------------------------------------
export type ThirdParties = typeof thirdParties.$inferSelect & {
  thirdPartyType?: ThirdPartyTypes;
  identificationType?: IdentificationTypes;
  homeCity?: Cities | null;
  workCity?: Cities | null;
  loanApplications?: LoanApplications[];
  loanApplicationCoDebtors?: LoanApplicationCoDebtors[];
  loans?: Loans[];
  accountingEntries?: AccountingEntries[];
  loansBorrowed?: Loans[];
  loansDisbursed?: Loans[];
  portfolioEntries?: PortfolioEntries[];
};
export type NewThirdParties = typeof thirdParties.$inferInsert;

// ---------------------------------------------------------------------
// Concr25 - Empresas de seguros
// ---------------------------------------------------------------------
export type InsuranceCompanies = typeof insuranceCompanies.$inferSelect & {
  identificationType?: IdentificationTypes;
  city?: Cities;
  insuranceRateRanges?: InsuranceRateRanges[];
  distribution?: AccountingDistributions;
};
export type NewInsuranceCompanies = typeof insuranceCompanies.$inferInsert;

// ---------------------------------------------------------------------
// Concr34 - Valores de seguros (rangos)
// ---------------------------------------------------------------------
export type InsuranceRateRanges = typeof insuranceRateRanges.$inferSelect & {
  insuranceCompany?: InsuranceCompanies;
};
export type NewInsuranceRateRanges = typeof insuranceRateRanges.$inferInsert;

// ---------------------------------------------------------------------
// Concr07 - Tipos / Líneas de crédito
// ---------------------------------------------------------------------
export type CreditProducts = typeof creditProducts.$inferSelect & {
  creditFund?: CreditFunds | null;
  capitalDistribution?: AccountingDistributions;
  interestDistribution?: AccountingDistributions;
  lateInterestDistribution?: AccountingDistributions;
  creditProductRefinancePolicy?: CreditProductRefinancePolicies | null;
  creditProductChargeOffPolicy?: CreditProductChargeOffPolicies | null;
  creditProductCategories?: CreditProductCategories[];
  creditProductDocuments?: CreditProductDocuments[];
  creditProductAccounts?: CreditProductAccounts[];
  creditProductBillingConcepts?: CreditProductBillingConcepts[];
  paymentAllocationPolicy?: PaymentAllocationPolicies;
  creditProductLateInterestRules?: CreditProductLateInterestRules[];
};
export type NewCreditProducts = typeof creditProducts.$inferInsert;

// ---------------------------------------------------------------------
// Concr30 - Categorías por tipos de crédito (rangos de cuotas + factores)
// ---------------------------------------------------------------------
export type CreditProductCategories = typeof creditProductCategories.$inferSelect & {
  creditProduct?: CreditProducts;
};
export type NewCreditProductCategories = typeof creditProductCategories.$inferInsert;

// ---------------------------------------------------------------------
// Concr44 - Tipos de crédito vs Documentos requeridos (pivot)
// ---------------------------------------------------------------------
export type CreditProductDocuments = typeof creditProductDocuments.$inferSelect & {
  creditProduct?: CreditProducts;
  documentType?: DocumentTypes;
};
export type NewCreditProductDocuments = typeof creditProductDocuments.$inferInsert;

// ---------------------------------------------------------------------
// Concr26 - Auxiliares por tipos de crédito
// ---------------------------------------------------------------------
export type CreditProductAccounts = typeof creditProductAccounts.$inferSelect & {
  creditProduct?: CreditProducts;
  capitalAccount?: GlAccounts;
  interestAccount?: GlAccounts;
  lateInterestAccount?: GlAccounts;
};
export type NewCreditProductAccounts = typeof creditProductAccounts.$inferInsert;

// ---------------------------------------------------------------------
// Concr39 - Solicitudes de créditos
// ---------------------------------------------------------------------
export type LoanApplications = typeof loanApplications.$inferSelect & {
  affiliationOffice?: AffiliationOffices;
  creditFund?: CreditFunds | null;
  thirdParty?: ThirdParties;
  repaymentMethod?: RepaymentMethods;
  bank?: Banks;
  creditProduct?: CreditProducts;
  paymentFrequency?: PaymentFrequencies | null;
  insuranceCompany?: InsuranceCompanies | null;
  rejectionReason?: RejectionReasons | null;
  investmentType?: InvestmentTypes | null;
  channel?: Channels | null;
  paymentGuaranteeType?: PaymentGuaranteeTypes;

  loans?: Loans[];
  loanApplicationCoDebtors?: LoanApplicationCoDebtors[];
  loanApplicationDocuments?: LoanApplicationDocuments[];
  loanApplicationPledges?: LoanApplicationPledges[];
  loanApplicationStatusHistory?: LoanApplicationStatusHistory[];
  loanApplicationEvents?: LoanApplicationEvents[];
  loanApplicationRiskAssessments?: LoanApplicationRiskAssessments[];
};
export type NewLoanApplications = typeof loanApplications.$inferInsert;

// ---------------------------------------------------------------------
// Concr16 - Pignoraciones por núcleo familiar
// ---------------------------------------------------------------------
export type LoanApplicationPledges = typeof loanApplicationPledges.$inferSelect & {
  loanApplication?: LoanApplications;
};
export type NewLoanApplicationPledges = typeof loanApplicationPledges.$inferInsert;

// ---------------------------------------------------------------------
// Concr41 - Relación solicitud - codeudor
// ---------------------------------------------------------------------
export type LoanApplicationCoDebtors = typeof loanApplicationCoDebtors.$inferSelect & {
  loanApplication?: LoanApplications;
  thirdParty?: ThirdParties | null;
};
export type NewLoanApplicationCoDebtors = typeof loanApplicationCoDebtors.$inferInsert;

// ---------------------------------------------------------------------
// Concr45 - Documentos entregados en solicitudes
// ---------------------------------------------------------------------
export type LoanApplicationDocuments = typeof loanApplicationDocuments.$inferSelect & {
  loanApplication?: LoanApplications;
  documentType?: DocumentTypes;
};
export type NewLoanApplicationDocuments = typeof loanApplicationDocuments.$inferInsert;

// ---------------------------------------------------------------------
// Concr08 - Créditos aprobados / liquidados
// ---------------------------------------------------------------------
export type Loans = typeof loans.$inferSelect & {
  loanApplication?: LoanApplications;
  agreement?: Agreements | null;
  bank?: Banks | null;
  creditFund?: CreditFunds | null;
  repaymentMethod?: RepaymentMethods;
  paymentFrequency?: PaymentFrequencies | null;
  paymentGuaranteeType?: PaymentGuaranteeTypes;
  affiliationOffice?: AffiliationOffices;
  insuranceCompany?: InsuranceCompanies | null;
  costCenter?: CostCenters | null;
  borrower?: ThirdParties;
  disbursementParty?: ThirdParties;
  channel?: Channels | null;
  loanProcessStates?: LoanProcessStates;
  loanInstallments?: LoanInstallments[];
  portfolioEntries?: PortfolioEntries[];
  accountingEntries?: AccountingEntries[];
  loanRefinancingLinksRefinanced?: LoanRefinancingLinks[];
  loanRefinancingLinksReference?: LoanRefinancingLinks[];
  portfolioAgingSnapshots?: PortfolioAgingSnapshots[];
  payrollExcessPayments?: PayrollExcessPayments[];
  loanPayments?: LoanPayments[];
  loanAgreementHistory?: LoanAgreementHistory[];
  loanStatusHistory?: LoanStatusHistory[];
  loanBillingConcepts?: LoanBillingConcepts[];
};
export type NewLoans = typeof loans.$inferInsert;

// ---------------------------------------------------------------------
// Historial de convenios por credito
// ---------------------------------------------------------------------
export type LoanAgreementHistory = typeof loanAgreementHistory.$inferSelect & {
  loan?: Loans;
  agreement?: Agreements;
};
export type NewLoanAgreementHistory = typeof loanAgreementHistory.$inferInsert;

// ---------------------------------------------------------------------
// Historial de estados del credito
// ---------------------------------------------------------------------
export type LoanStatusHistory = typeof loanStatusHistory.$inferSelect & {
  loan?: Loans;
};
export type NewLoanStatusHistory = typeof loanStatusHistory.$inferInsert;

// ---------------------------------------------------------------------
// Concr09 - Plan de pagos (cuotas)
// ---------------------------------------------------------------------
export type LoanInstallments = typeof loanInstallments.$inferSelect & {
  loan?: Loans;
};
export type NewLoanInstallments = typeof loanInstallments.$inferInsert;

// ---------------------------------------------------------------------
// Concr52 — Acta diaria por oficina
// ---------------------------------------------------------------------
export type LoanApplicationActNumbers = typeof loanApplicationActNumbers.$inferSelect & {
  affiliationOffice?: AffiliationOffices;
};
export type NewLoanApplicationActNumbers = typeof loanApplicationActNumbers.$inferInsert;

// ---------------------------------------------------------------------
// Concr17 - Cartera por ítem (saldo actual)
// ---------------------------------------------------------------------
export type PortfolioEntries = typeof portfolioEntries.$inferSelect & {
  glAccount?: GlAccounts;
  thirdParty?: ThirdParties;
  loan?: Loans;
};
export type NewPortfolioEntries = typeof portfolioEntries.$inferInsert;

// ---------------------------------------------------------------------
// Concr22 - Movimientos contables
// ---------------------------------------------------------------------
export type AccountingEntries = typeof accountingEntries.$inferSelect & {
  glAccount?: GlAccounts;
  costCenter?: CostCenters;
  thirdParty?: ThirdParties;
  loan?: Loans;
  processRun?: ProcessRuns;
};
export type NewAccountingEntries = typeof accountingEntries.$inferInsert;

// ---------------------------------------------------------------------
// Concr23 - Refinanciaciones / Reestructuraciones (links)
// ---------------------------------------------------------------------
export type LoanRefinancingLinks = typeof loanRefinancingLinks.$inferSelect & {
  refinancedLoan?: Loans;
  referenceLoan?: Loans;
};
export type NewLoanRefinancingLinks = typeof loanRefinancingLinks.$inferInsert;

// ---------------------------------------------------------------------
// Concr33-Concr42 Process Runs
// ---------------------------------------------------------------------
export type ProcessRuns = typeof processRuns.$inferSelect & {
  accountingPeriod?: AccountingPeriods;
  accountingEntries?: AccountingEntries[];
};
export type NewProcessRuns = typeof processRuns.$inferInsert;

// ---------------------------------------------------------------------
// Loan Process State (idempotencia por crédito + tipo)
// ---------------------------------------------------------------------
export type LoanProcessStates = typeof loanProcessStates.$inferSelect & {
  loan?: Loans;
  lastProcessRun?: ProcessRuns;
};
export type NewLoanProcessStates = typeof loanProcessStates.$inferInsert;

// ---------------------------------------------------------------------
// Concr63-Concr28 - Histórico cartera (aging snapshot)
// ---------------------------------------------------------------------
export type PortfolioAgingSnapshots = typeof portfolioAgingSnapshots.$inferSelect & {
  accountingPeriod?: AccountingPeriods;
  affiliationOffice?: AffiliationOffices;
  creditProduct?: CreditProducts;
  glAccount?: GlAccounts;
  loan?: Loans;
  repaymentMethod?: RepaymentMethods;
  thirdParty?: ThirdParties;
};
export type NewPortfolioAgingSnapshots = typeof portfolioAgingSnapshots.$inferInsert;

// ---------------------------------------------------------------------
// Concr64 - Excedentes de nómina/libranza
// ---------------------------------------------------------------------
export type PayrollExcessPayments = typeof payrollExcessPayments.$inferSelect & {
  loan?: Loans;
};
export type NewPayrollExcessPayments = typeof payrollExcessPayments.$inferInsert;

// ---------------------------------------------------------------------
// Concr32 - Abonos
// ---------------------------------------------------------------------
export type LoanPayments = typeof loanPayments.$inferSelect & {
  loan?: Loans;
  paymentReceiptType?: PaymentReceiptTypes;
  glAccount?: GlAccounts;
  loanPaymentMethodAllocations?: LoanPaymentMethodAllocations[];
};
export type NewLoanPayments = typeof loanPayments.$inferInsert;

// ---------------------------------------------------------------------
// Concr35 - Valores por formas de pago en abonos
// ---------------------------------------------------------------------
export type LoanPaymentMethodAllocations = typeof loanPaymentMethodAllocations.$inferSelect & {
  loanPayment?: LoanPayments;
  collectionMethod?: PaymentTenderTypes;
};
export type NewLoanPaymentMethodAllocations = typeof loanPaymentMethodAllocations.$inferInsert;

// ---------------------------------------------------------------------
// Concr01 - Configuración global del módulo de créditos
// ---------------------------------------------------------------------
export type CreditsSettings = typeof creditsSettings.$inferSelect & {
  cashGlAccount?: GlAccounts;
  majorGlAccount?: GlAccounts;
  excessGlAccount?: GlAccounts;
  pledgeSubsidyGlAccount?: GlAccounts;
  writeOffGlAccount?: GlAccounts;
};
export type NewCreditsSettings = typeof creditsSettings.$inferInsert;

// ---------------------------------------------------------------------
// Billing Concepts - Catálogo
// ---------------------------------------------------------------------
export type BillingConcepts = typeof billingConcepts.$inferSelect & {
  billingConceptRules?: BillingConceptRules[];
  creditProductBillingConcepts?: CreditProductBillingConcepts[];
  loanBillingConcepts?: LoanBillingConcepts[];
  defaultGlAccount?: GlAccounts;
};
export type NewBillingConcepts = typeof billingConcepts.$inferInsert;

// ---------------------------------------------------------------------
// Billing Concept Rules - Reglas / Rangos / Vigencias
// ---------------------------------------------------------------------
export type BillingConceptRules = typeof billingConceptRules.$inferSelect & {
  billingConcept?: BillingConcepts;
};
export type NewBillingConceptRules = typeof billingConceptRules.$inferInsert;

// ---------------------------------------------------------------------
// Concr07 (credit_products) -> Conceptos por producto
// ---------------------------------------------------------------------
export type CreditProductBillingConcepts = typeof creditProductBillingConcepts.$inferSelect & {
  creditProduct?: CreditProducts;
  billingConcept?: BillingConcepts;
  overrideBillingConceptRule?: BillingConceptRules;
  overrideGlAccount?: GlAccounts;
};
export type NewCreditProductBillingConcepts = typeof creditProductBillingConcepts.$inferInsert;

// ---------------------------------------------------------------------
// Concr08 (loans) -> Conceptos "congelados" por crédito (snapshot)
// ---------------------------------------------------------------------
export type LoanBillingConcepts = typeof loanBillingConcepts.$inferSelect & {
  loan?: Loans;
  billingConcept?: BillingConcepts;
  sourceBillingConceptRule?: BillingConceptRules;
  glAccount?: GlAccounts;
  sourceCreditProductBillingConcept?: CreditProductBillingConcepts;
};
export type NewLoanBillingConcepts = typeof loanBillingConcepts.$inferInsert;

// ---------------------------------------------------------------------
// Reglas de interés de mora por edad de mora (días)
// ---------------------------------------------------------------------
export type CreditProductLateInterestRules = typeof creditProductLateInterestRules.$inferSelect & {
  creditProduct?: CreditProducts;
};
export type NewCreditProductLateInterestRules = typeof creditProductLateInterestRules.$inferInsert;

// ---------------------------------------------------------------------
// Concr59 - Convenios / Pagadurías
// ---------------------------------------------------------------------
export type Agreements = typeof agreements.$inferSelect & {
  loans?: Loans[];
  loanAgreementHistory?: LoanAgreementHistory[];
  billingCycleProfiles?: BillingCycleProfiles[];
  city?: Cities;
};
export type NewAgreements = typeof agreements.$inferInsert;

// ---------------------------------------------------------------------
// Billing Cycle Profiles
// ---------------------------------------------------------------------
export type BillingCycleProfiles = typeof billingCycleProfiles.$inferSelect & {
  creditProduct?: CreditProducts;
  agreement?: Agreements | null;
  billingCycleProfileCycles?: BillingCycleProfileCycles[];
};
export type NewBillingCycleProfiles = typeof billingCycleProfiles.$inferInsert;

// ---------------------------------------------------------------------
// Billing Cycle Profile Cycles
// ---------------------------------------------------------------------
export type BillingCycleProfileCycles = typeof billingCycleProfileCycles.$inferSelect & {
  billingCycleProfile?: BillingCycleProfiles;
};
export type NewBillingCycleProfileCycles = typeof billingCycleProfileCycles.$inferInsert;

// ---------------------------------------------------------------------
// Historial de evaluaciones de riesgo por solicitud
// ---------------------------------------------------------------------
export type LoanApplicationRiskAssessments = typeof loanApplicationRiskAssessments.$inferSelect & {
  loanApplication?: LoanApplications;
};
export type NewLoanApplicationRiskAssessments = typeof loanApplicationRiskAssessments.$inferInsert;

// ---------------------------------------------------------------------
// Canales de creación de créditos
// ---------------------------------------------------------------------
export type Channels = typeof channels.$inferSelect & {
  loanApplications?: LoanApplications[];
};
export type NewChannels = typeof channels.$inferInsert;

// ---------------------------------------------------------------------
// Historial de estados (trazabilidad del ciclo)
// ---------------------------------------------------------------------
export type LoanApplicationStatusHistory = typeof loanApplicationStatusHistory.$inferSelect & {
  loanApplication?: LoanApplications;
};
export type NewLoanApplicationStatusHistory = typeof loanApplicationStatusHistory.$inferInsert;

// ---------------------------------------------------------------------
// Eventos / Integraciones (trazabilidad técnica + payloads)
// ---------------------------------------------------------------------
export type LoanApplicationEvents = typeof loanApplicationEvents.$inferSelect & {
  loanApplication?: LoanApplications;
};
export type NewLoanApplicationEvents = typeof loanApplicationEvents.$inferInsert;

// ---------------------------------------------------------------------
// Políticas de refinanciación / consolidación por producto
// ---------------------------------------------------------------------
export type CreditProductRefinancePolicies = typeof creditProductRefinancePolicies.$inferSelect & {
  creditProduct?: CreditProducts;
};
export type NewCreditProductRefinancePolicies = typeof creditProductRefinancePolicies.$inferInsert;

// ---------------------------------------------------------------------
// Politicas de castigo de cartera por producto
// ---------------------------------------------------------------------
export type CreditProductChargeOffPolicies = typeof creditProductChargeOffPolicies.$inferSelect & {
  creditProduct?: CreditProducts;
};
export type NewCreditProductChargeOffPolicies = typeof creditProductChargeOffPolicies.$inferInsert;

// ---------------------------------------------------------------------
// Aging Profiles - Perfiles de edades de cartera
// Nota:
// Define una versión/configuración de buckets (rangos de días) para reportes
// de cartera por edades y cálculo de provisiones.
// ---------------------------------------------------------------------
export type AgingProfiles = typeof agingProfiles.$inferSelect & {
  agingBuckets?: AgingBuckets[];
};
export type NewAgingProfiles = typeof agingProfiles.$inferInsert;

// ---------------------------------------------------------------------
// Aging Buckets - Rangos de días para aging
// Nota:
// Define los rangos de días de mora (0, 1-30, 31-60, etc.) y su tasa de
// provisión asociada. Pertenece a un AgingProfile.
// ---------------------------------------------------------------------
export type AgingBuckets = typeof agingBuckets.$inferSelect & {
  agingProfile?: AgingProfiles;
};
export type NewAgingBuckets = typeof agingBuckets.$inferInsert;

// ---------------------------------------------------------------------
// Portfolio Provision Snapshots (cabecera)
// ---------------------------------------------------------------------
export type PortfolioProvisionSnapshots = typeof portfolioProvisionSnapshots.$inferSelect & {
  accountingPeriod?: AccountingPeriods;
  agingProfile?: AgingProfiles;
  portfolioProvisionSnapshotDetails?: PortfolioProvisionSnapshotDetails[];
};
export type NewPortfolioProvisionSnapshots = typeof portfolioProvisionSnapshots.$inferInsert;

// ---------------------------------------------------------------------
// Portfolio Provision Snapshot Details (detalle)
// ---------------------------------------------------------------------
export type PortfolioProvisionSnapshotDetails =
  typeof portfolioProvisionSnapshotDetails.$inferSelect & {
    portfolioProvisionSnapshot?: PortfolioProvisionSnapshots;
    portfolioAgingSnapshot?: PortfolioAgingSnapshots;
    agingBucket?: AgingBuckets;
  };
export type NewPortfolioProvisionSnapshotDetails =
  typeof portfolioProvisionSnapshotDetails.$inferInsert;

// ---------------------------------------------------------------------
// Payment Allocation Policies - Políticas de prelación
// Nota:
// Define una modalidad de imputación de pagos (NORMAL, PAGO_A_CAPITAL, etc.)
// y cómo se maneja el excedente.
// ---------------------------------------------------------------------
export type PaymentAllocationPolicies = typeof paymentAllocationPolicies.$inferSelect & {
  paymentAllocationPolicyRules?: PaymentAllocationPolicyRules[];
};
export type NewPaymentAllocationPolicies = typeof paymentAllocationPolicies.$inferInsert;

// ---------------------------------------------------------------------
// Payment Allocation Policy Rules - Reglas de prelación
// Nota:
// Define el orden (priority) y cómo imputar por concepto dentro de una política.
// ---------------------------------------------------------------------
export type PaymentAllocationPolicyRules = typeof paymentAllocationPolicyRules.$inferSelect & {
  paymentAllocationPolicy?: PaymentAllocationPolicies;
  billingConcept?: BillingConcepts;
};
export type NewPaymentAllocationPolicyRules = typeof paymentAllocationPolicyRules.$inferInsert;
