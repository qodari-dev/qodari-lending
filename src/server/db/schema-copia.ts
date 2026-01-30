import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  decimal,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const processTypeEnum = pgEnum("process_type", [
  "CREDIT",
  "RECEIPT",
  "PLEDGE",
  "PAYROLL",
  "INTEREST",
  "DEPOSIT",
  "OTHER",
  "INSURANCE",
  "LATE_INTEREST",
]);

// ---------------------------------------------------------------------
// Concr43 - Tipos de documentos requeridos en solicitudes
// Nota:
// Catálogo de documentos que pueden exigirse en una solicitud de crédito.
// Campo clave:
// - name: nombre/descripcion del documento.
// ---------------------------------------------------------------------
export const documentTypes = pgTable(
  "document_types",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex("uniq_document_types_name").on(t.name)],
);

export const documentTypesRelations = relations(documentTypes, ({ many }) => ({
  // Concr44: relación tipo crédito - documentos requeridos
  creditProductRequiredDocuments: many(creditProductRequiredDocuments),
  // Concr45: documentos entregados por solicitud
  loanApplicationDocuments: many(loanApplicationDocuments),
}));

export type DocumentTypes = typeof documentTypes.$inferSelect & {
  creditProductRequiredDocuments?: CreditProductRequiredDocuments[];
  loanApplicationDocuments?: LoanApplicationDocuments[];
};

export type NewDocumentTypes = typeof documentTypes.$inferInsert;

// ---------------------------------------------------------------------
// Concr14 - Motivos de rechazo
// Nota:
// Catálogo de motivos por los cuales una solicitud de crédito puede ser rechazada.
// Campo clave:
// - name: descripción del motivo de rechazo.
// ---------------------------------------------------------------------
export const rejectionReasons = pgTable(
  "rejection_reasons",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex("uniq_rejection_reasons_name").on(t.name)],
);

export const rejectionReasonsRelations = relations(
  rejectionReasons,
  ({ many }) => ({
    loanApplications: many(loanApplications),
  }),
);

export type RejectionReasons = typeof rejectionReasons.$inferSelect & {
  loanApplications?: LoanApplications[];
};
export type NewRejectionReasons = typeof rejectionReasons.$inferInsert;

// ---------------------------------------------------------------------
// Concr15 - Formas de pago (del crédito)
// Nota:
// Define el mecanismo por el cual se recauda/paga el crédito (no es el medio del abono T/C/E).
// Ejemplos: LIBRANZA, PIGNORACIÓN DE SUBSIDIO.
// Campo clave:
// - name: nombre del mecanismo de recaudo del crédito.
// ---------------------------------------------------------------------
export const repaymentMethods = pgTable(
  "repayment_methods",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex("uniq_repayment_methods_name").on(t.name)],
);

export const repaymentMethodsRelations = relations(
  repaymentMethods,
  ({ many }) => ({
    // Concr39: solicitudes (forpag)
    loanApplications: many(loanApplications),
    // Concr08: créditos (forpag)
    loans: many(loans),
  }),
);

export type RepaymentMethods = typeof repaymentMethods.$inferSelect & {
  loanApplications?: LoanApplications[];
  loans?: Loans[];
};

export type NewRepaymentMethods = typeof repaymentMethods.$inferInsert;

// ---------------------------------------------------------------------
// Concr11 - Garantías de pago
// Nota:
// Catálogo de garantías/respaldo del crédito (soporte legal o documental).
// Ejemplos: PAGARÉ, AUTORIZACIÓN DE DESCUENTO POR NÓMINA.
// Campo clave:
// - name: nombre de la garantía.
// ---------------------------------------------------------------------
export const paymentGuaranteeTypes = pgTable(
  "payment_guarantee_types",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex("uniq_payment_guarantee_types_name").on(t.name)],
);

export const paymentGuaranteeTypesRelations = relations(
  paymentGuaranteeTypes,
  ({ many }) => ({
    // Concr08: crédito liquidado (codgar)
    loans: many(loans),
  }),
);

export type PaymentGuaranteeTypes =
  typeof paymentGuaranteeTypes.$inferSelect & {
    loans?: Loans[];
  };

export type NewPaymentGuaranteeTypes =
  typeof paymentGuaranteeTypes.$inferInsert;

// ---------------------------------------------------------------------
// Concr13 - Periodicidad de pagos
// Nota:
// Define cada cuánto se paga el crédito (frecuencia de recaudo).
// Campos clave:
// - name: nombre de la periodicidad (Ej: Mensual, Quincenal).
// - dayCount: número de días del periodo (base de cálculo / programación).
// ---------------------------------------------------------------------
export const paymentFrequencies = pgTable(
  "payment_frequencies",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    // numdia
    daysInterval: integer("days_interval").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex("uniq_payment_frequencies_name").on(t.name)],
);

export const paymentFrequenciesRelations = relations(
  paymentFrequencies,
  ({ many }) => ({
    // Concr39: solicitudes (perpag)
    loanApplications: many(loanApplications),
    // Concr08: créditos (perpag)
    loans: many(loans),
  }),
);

export type PaymentFrequencies = typeof paymentFrequencies.$inferSelect & {
  loanApplications?: LoanApplications[];
  loans?: Loans[];
};

export type NewPaymentFrequencies = typeof paymentFrequencies.$inferInsert;

// ---------------------------------------------------------------------
// Concr56 - Tipos de inversión
// Nota:
// Catálogo del destino/tipo de inversión declarado en la solicitud de crédito.
// Campo clave:
// - name: nombre del tipo de inversión (ej: Educación, Vivienda, Libre inversión, etc).
// ---------------------------------------------------------------------
export const investmentTypes = pgTable(
  "investment_types",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex("uniq_investment_types_name").on(t.name)],
);

export const investmentTypesRelations = relations(
  investmentTypes,
  ({ many }) => ({
    loanApplications: many(loanApplications),
  }),
);

export type InvestmentTypes = typeof investmentTypes.$inferSelect & {
  loanApplications?: LoanApplications[];
};

export type NewInvestmentTypes = typeof investmentTypes.$inferInsert;

// Tipo de pago (tesorería) aplicado a abonos: Transferencia / Cheque / Efectivo
export const paymentTenderTypeEnum = pgEnum("payment_tender_type", [
  "TRANSFER",
  "CHECK",
  "CASH",
]);

// ---------------------------------------------------------------------
// Concr53 - Formas de pago tesorería (medios de pago del abono)
// Nota:
// Catálogo de medios de pago utilizados al registrar un abono en tesorería.
// Ejemplos: Transferencia, Cheque, Efectivo.
// Campos clave:
// - type: clasifica el medio (TRANSFER/CHECK/CASH) para reglas y reportes.
// - name: nombre visible en UI.
// ---------------------------------------------------------------------
export const paymentTenderTypes = pgTable(
  "payment_tender_types",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    type: paymentTenderTypeEnum("type").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    // Solo debería existir 1 fila por cada tipo
    uniqueIndex("uniq_payment_tender_types_type").on(t.type),
  ],
);

export const paymentTenderTypesRelations = relations(
  paymentTenderTypes,
  ({ many }) => ({
    // Concr35: valores por forma de pago del abono
    loanPaymentMethodAllocations: many(loanPaymentMethodAllocations),
  }),
);

export type PaymentTenderTypes = typeof paymentTenderTypes.$inferSelect & {
  loanPaymentMethodAllocations?: LoanPaymentMethodAllocations[];
};

export type NewPaymentTenderTypes = typeof paymentTenderTypes.$inferInsert;

// ---------------------------------------------------------------------
// Concr61 - Bancos
// Nota:
// Se usa para registrar el banco de desembolso de una solicitud de crédito (Concr39).
// Campos clave:
// - name: nombre del banco.
// - asobancariaCode: código bancario (Asobancaria) usado para validaciones e integraciones.
// ---------------------------------------------------------------------
export const banks = pgTable(
  "banks",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 80 }).notNull(),
    asobancariaCode: varchar("asobancaria_code", { length: 5 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex("uniq_banks_asobancaria_code").on(t.asobancariaCode)],
);

export const banksRelations = relations(banks, ({ many }) => ({
  loanApplications: many(loanApplications),
}));

export type Banks = typeof banks.$inferSelect & {
  loanApplications?: LoanApplications[];
};
export type NewBanks = typeof banks.$inferInsert;

export const thirdPartySettingEnum = pgEnum("third_party_setting", [
  "YES",
  "NO",
  "WITHHOLDING", // Retención
]);

export const accountDetailTypeEnum = pgEnum("account_detail_type", [
  "RECEIVABLE", // Cobrar
  "PAYABLE", // Pagar
  "NONE", // No aplica
]);

// ---------------------------------------------------------------------
// Concr18 - Plan Único de Cuentas (Auxiliares)
// Nota:
// Catálogo de cuentas/auxiliares contables usados por el módulo (causación, abonos, cierres).
// Campos clave:
// - code: número/código del auxiliar (cuenta contable).
// - thirdPartySetting: si exige/permite tercero o maneja retención.
// - requiresCostCenter: si exige centro de costo.
// - detailType: orientación contable (cobrar/pagar/ninguno).
// - isBank: marca si es una cuenta bancaria.
// ---------------------------------------------------------------------
export const glAccounts = pgTable(
  "gl_accounts",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 13 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    thirdPartySetting: thirdPartySettingEnum("third_party_setting")
      .notNull()
      .default("NO"),
    requiresCostCenter: boolean("requires_cost_center")
      .notNull()
      .default(false),
    detailType: accountDetailTypeEnum("detail_type").notNull().default("NONE"),
    isBank: boolean("is_bank").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("uniq_gl_accounts_code").on(t.code),
    index("idx_gl_accounts_is_bank").on(t.isBank),
    index("idx_gl_accounts_is_active").on(t.isActive),
  ],
);

export const glAccountsRelations = relations(glAccounts, ({ many }) => ({
  // Concr22 - Movimientos contables
  accountingEntries: many(accountingEntries),
  // Concr06 - Auxiliares por distribuciones contables
  accountingDistributionLines: many(accountingDistributionLines),
  // Concr17 - Cartera por auxiliar
  portfolioEntries: many(portfolioEntries),
  // Concr28 - Cierres de periodo (por auxiliar)
  portfolioAgingSnapshots: many(portfolioAgingSnapshots),
  // Concr32 - Abonos (cuando guarda un auxiliar directo)
  loanPayments: many(loanPayments),
  // Concr26 - Mapeo contable por tipo de crédito (3 FKs a gl_accounts)
  creditProductGlAccountsAsCapital: many(creditProductAccounts, {
    relationName: "capitalGlAccount",
  }),
  creditProductGlAccountsAsInterest: many(creditProductAccounts, {
    relationName: "interestGlAccount",
  }),
  creditProductGlAccountsAsLateInterest: many(creditProductAccounts, {
    relationName: "lateInterestGlAccount",
  }),

  // Concr07 - Auxiliar estudio de crédito (auxest)
  creditProductsAsStudyAccount: many(creditProducts, {
    relationName: "studyGlAccount",
  }),

  // Concr01 - Settings (si ya lo tienes así)
  creditsSettingsAsCash: many(creditsSettings, { relationName: "cashAccount" }),
  creditsSettingsAsMajor: many(creditsSettings, {
    relationName: "majorAccount",
  }),
  creditsSettingsAsExcess: many(creditsSettings, {
    relationName: "excessAccount",
  }),
  creditsSettingsAsPledgeSubsidy: many(creditsSettings, {
    relationName: "pledgeSubsidyAccount",
  }),
  creditsSettingsAsWriteOff: many(creditsSettings, {
    relationName: "writeOffAccount",
  }),
  creditsSettingsAsFundRegister: many(creditsSettings, {
    relationName: "fundRegisterAccount",
  }),
}));

export type GlAccounts = typeof glAccounts.$inferSelect & {
  accountingEntries?: AccountingEntries[];
  accountingDistributionLines?: AccountingDistributionLines[];
  portfolioEntries?: PortfolioEntries[];
  portfolioAgingSnapshots?: PortfolioAgingSnapshots[];
  loanPayments?: LoanPayments[];

  creditProductGlAccountsAsCapital?: CreditProductAccounts[];
  creditProductGlAccountsAsInterest?: CreditProductAccounts[];
  creditProductGlAccountsAsLateInterest?: CreditProductAccounts[];

  creditProductsAsStudyAccount?: CreditProducts[];

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
// Nota:
// Catálogo de centros de costo usados en contabilización y distribuciones.
// Campos clave:
// - code: código del centro de costo.
// - name: nombre del centro de costo.
// ---------------------------------------------------------------------
export const costCenters = pgTable(
  "cost_centers",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 20 }).notNull(),
    name: varchar("name", { length: 40 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex("uniq_cost_centers_code").on(t.code)],
);

export const costCentersRelations = relations(costCenters, ({ many }) => ({
  // Concr06 - Auxiliares por distribuciones contables
  accountingDistributionLines: many(accountingDistributionLines),
  // Concr07 - Tipos de crédito (si manejas centro por defecto)
  creditProducts: many(creditProducts),
  // Concr01 - Configuración (si tiene centro por defecto)
  creditsSettings: many(creditsSettings),
  // Concr22 - Movimientos contables (si normalizaste codcen)
  accountingEntries: many(accountingEntries),
}));

export type CostCenters = typeof costCenters.$inferSelect & {
  accountingDistributionLines?: AccountingDistributionLines[];
  creditProducts?: CreditProducts[];
  creditsSettings?: CreditsSettings[];
  accountingEntries?: AccountingEntries[];
};

export type NewCostCenters = typeof costCenters.$inferInsert;

// ---------------------------------------------------------------------
// Concr05 - Distribuciones contables (tipos de distribución)
// Nota (ES):
// Define un "tipo de distribución" contable. Se usa para parametrizar cómo se reparte un valor
// entre auxiliares/centros (ver Concr06) y también como referencia en reglas (crédito/seguros).
// Campo clave:
// - name: nombre de la distribución.
// ---------------------------------------------------------------------
export const accountingDistributions = pgTable(
  "accounting_distributions",
  {
    id: serial("id").primaryKey(),

    name: varchar("name", { length: 40 }).notNull(),

    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex("uniq_accounting_distributions_name").on(t.name)],
);

export const accountingDistributionsRelations = relations(
  accountingDistributions,
  ({ many }) => ({
    // Concr06 (detalle)
    accountingDistributionLines: many(accountingDistributionLines),

    // Concr07 (tipo de crédito) -> 3 referencias
    creditProductsAsCapitalDistribution: many(creditProducts, {
      relationName: "capitalDistribution",
    }),
    creditProductsAsInterestDistribution: many(creditProducts, {
      relationName: "interestDistribution",
    }),
    creditProductsAsLateInterestDistribution: many(creditProducts, {
      relationName: "lateInterestDistribution",
    }),

    // Concr25 (aseguradoras) -> 2 referencias
    insuranceCompaniesAsPaymentDistribution: many(insuranceCompanies, {
      relationName: "paymentDistribution",
    }),
    insuranceCompaniesAsMonthlyDistribution: many(insuranceCompanies, {
      relationName: "monthlyDistribution",
    }),
  }),
);

export type AccountingDistributions =
  typeof accountingDistributions.$inferSelect & {
    accountingDistributionLines?: AccountingDistributionLines[];

    creditProductsAsCapitalDistribution?: CreditProducts[];
    creditProductsAsInterestDistribution?: CreditProducts[];
    creditProductsAsLateInterestDistribution?: CreditProducts[];

    insuranceCompaniesAsPaymentDistribution?: InsuranceCompanies[];
    insuranceCompaniesAsMonthlyDistribution?: InsuranceCompanies[];
  };

export type NewAccountingDistributions =
  typeof accountingDistributions.$inferInsert;

// Naturaleza contable: Débito / Crédito
export const entryNatureEnum = pgEnum("entry_nature", ["DEBIT", "CREDIT"]);

// ---------------------------------------------------------------------
// Concr06 - Auxiliares por distribuciones contables
// Nota:
// Detalle de una distribución contable: define a qué auxiliar (cuenta) y centro de costo se imputa,
// qué porcentaje aplica y con qué naturaleza (débito/crédito).
// Campos clave:
// - accountingDistributionId: distribución a la que pertenece.
// - glAccountId: auxiliar/cuenta contable a afectar.
// - costCenterId: centro de costo de la imputación.
// - percentage: porcentaje de la distribución.
// - nature: naturaleza contable (DEBIT/CREDIT).
// ---------------------------------------------------------------------
export const accountingDistributionLines = pgTable(
  "accounting_distribution_lines",
  {
    id: serial("id").primaryKey(),
    accountingDistributionId: integer("accounting_distribution_id")
      .notNull()
      .references(() => accountingDistributions.id, { onDelete: "cascade" }),
    glAccountId: integer("gl_account_id")
      .notNull()
      .references(() => glAccounts.id, { onDelete: "restrict" }),
    costCenterId: integer("cost_center_id")
      .notNull()
      .references(() => costCenters.id, { onDelete: "restrict" }),
    percentage: decimal("percentage", { precision: 5, scale: 2 }).notNull(),
    nature: entryNatureEnum("nature").notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("uniq_distribution_line").on(
      t.accountingDistributionId,
      t.glAccountId,
      t.costCenterId,
    ),
  ],
);

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
  }),
);

export type AccountingDistributionLines =
  typeof accountingDistributionLines.$inferSelect & {
    accountingDistribution?: AccountingDistributions;
    glAccount?: GlAccounts;
    costCenter?: CostCenters;
  };

export type NewAccountingDistributionLines =
  typeof accountingDistributionLines.$inferInsert;

export const paymentReceiptMovementTypeEnum = pgEnum(
  "payment_receipt_movement_type",
  [
    "RECEIPT", // 2 - RECIBOS
    "PLEDGE", // 3 - PIGNORACION
    "PAYROLL", // 4 - LIBRANZAS
    "DEPOSIT", // 6 - CONSIGNACION
    "OTHER", // 7 - OTROS
  ],
);

// ---------------------------------------------------------------------
// Concr29 - Tipos de recibos de abonos
// Nota:
// Catálogo de tipos de recibo/abono. Define el flujo contable y reglas del registro del pago.
// Campos clave:
// - movementType: clasifica el tipo (recibo, pignoración, libranza, consignación, etc.).
// - name: nombre visible del tipo de recibo.
// ---------------------------------------------------------------------
export const paymentReceiptTypes = pgTable(
  "payment_receipt_types",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    movementType: paymentReceiptMovementTypeEnum("movement_type").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("uniq_payment_receipt_types_name").on(t.name),
    // si prefieres permitir nombres repetidos por tipo:
    // uniqueIndex("uniq_payment_receipt_types_type_name").on(t.movementType, t.name),
  ],
);

export const paymentReceiptTypesRelations = relations(
  paymentReceiptTypes,
  ({ many }) => ({
    // Concr32 - Abonos
    loanPayments: many(loanPayments),

    // Concr31 - usuarios habilitados por tipo de recibo (si la incluyes)
    userPaymentReceiptTypes: many(userPaymentReceiptTypes),

    // Concr64 - excedentes (si lo amarras al tipo de movimiento)
    payrollExcessPayments: many(payrollExcessPayments),
  }),
);

export type PaymentReceiptTypes = typeof paymentReceiptTypes.$inferSelect & {
  loanPayments?: LoanPayments[];
  userReceiptPermissions?: UserPaymentReceiptTypes[];
  payrollExcessPayments?: PayrollExcessPayments[];
};

export type NewPaymentReceiptTypes = typeof paymentReceiptTypes.$inferInsert;

// ---------------------------------------------------------------------
// Concr31 - Usuarios para recibos de abonos
// Nota (ES):
// Controla qué tipos de recibos/abonos puede usar cada usuario (IAM externo).
// Campos clave:
// - userId: id del usuario (proviene de IAM).
// - paymentReceiptTypeId: tipo de recibo permitido.
// - isDefault: marca el tipo por defecto para ese usuario.
// ---------------------------------------------------------------------
export const userPaymentReceiptTypes = pgTable(
  "user_payment_receipt_types",
  {
    id: serial("id").primaryKey(),

    // IAM externo: usa UUID (o cambia a varchar si tu IAM no es uuid)
    userId: uuid("user_id").notNull(),

    paymentReceiptTypeId: integer("payment_receipt_type_id")
      .notNull()
      .references(() => paymentReceiptTypes.id, { onDelete: "cascade" }),

    isDefault: boolean("is_default").notNull().default(false),

    ...timestamps,
  },
  (t) => [
    uniqueIndex("uniq_user_receipt_type").on(t.userId, t.paymentReceiptTypeId),
  ],
);

export const userPaymentReceiptTypesRelations = relations(
  userPaymentReceiptTypes,
  ({ one }) => ({
    paymentReceiptType: one(paymentReceiptTypes, {
      fields: [userPaymentReceiptTypes.paymentReceiptTypeId],
      references: [paymentReceiptTypes.id],
    }),
  }),
);

export type UserPaymentReceiptTypes =
  typeof userPaymentReceiptTypes.$inferSelect & {
    paymentReceiptType?: PaymentReceiptTypes;
  };

export type NewUserPaymentReceiptTypes =
  typeof userPaymentReceiptTypes.$inferInsert;

// ---------------------------------------------------------------------
// Concr46 - Oficinas de afiliación
// Nota (ES):
// Catálogo de oficinas/puntos donde se radican solicitudes y se gestionan créditos.
// Campo clave:
// - name: nombre de la oficina.
// - costCenterId: centro de costo asociado (si aplica).
// ---------------------------------------------------------------------
export const affiliationOffices = pgTable(
  "affiliation_offices",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    address: varchar("address", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 20 }),
    representativeName: varchar("representative_name", {
      length: 40,
    }).notNull(),
    email: varchar("email", { length: 30 }),
    costCenterId: integer("cost_center_id").references(() => costCenters.id, {
      onDelete: "set null",
    }),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex("uniq_affiliation_offices_name").on(t.name)],
);

export const affiliationOfficesRelations = relations(
  affiliationOffices,
  ({ one, many }) => ({
    costCenter: one(costCenters, {
      fields: [affiliationOffices.costCenterId],
      references: [costCenters.id],
    }),
    // Concr39 - Solicitudes
    loanApplications: many(loanApplications),
    // Concr08 - Créditos aprobados/liquidados
    loans: many(loans),
    // Concr45 - Documentos entregados por solicitud
    loanApplicationDocuments: many(loanApplicationDocuments),
    // Concr41 - Relación solicitud - codeudor
    loanApplicationCoDebtors: many(loanApplicationCoDebtors),
    // Concr52 - Números de actas de solicitudes
    loanApplicationMinutes: many(loanApplicationActNumbers),
    // Concr62 - Usuario ↔ oficina
    userOfficeAssignments: many(userAffiliationOffices),
    // Concr63 - Histórico cartera por edades
    portfolioAgingSnapshots: many(portfolioAgingSnapshots),
  }),
);

export type AffiliationOffices = typeof affiliationOffices.$inferSelect & {
  costCenter?: CostCenters | null;

  loanApplications?: LoanApplications[];
  loans?: Loans[];
  loanApplicationDocuments?: LoanApplicationDocuments[];
  loanApplicationCoSigners?: LoanApplicationCoDebtors[];
  loanApplicationMinutes?: LoanApplicationActNumbers[];
  userOfficeAssignments?: UserAffiliationOffices[];
  portfolioAgingSnapshots?: PortfolioAgingSnapshots[];
};

export type NewAffiliationOffices = typeof affiliationOffices.$inferInsert;

// ---------------------------------------------------------------------
// Concr27 - Periodos contables
// Nota:
// Controla el estado del periodo (abierto/cerrado) para permitir o bloquear operaciones del mes.
// Campos clave:
// - year, month: identifican el periodo.
// - isClosed: indica si el periodo está cerrado.
// - closedAt / closedByUserId: auditoría del cierre (IAM externo).
// ---------------------------------------------------------------------
export const accountingPeriods = pgTable(
  "accounting_periods",
  {
    id: serial("id").primaryKey(),
    year: integer("year").notNull(),
    month: integer("month").notNull(), // 1..12
    isClosed: boolean("is_closed").notNull().default(false),
    closedAt: timestamp("closed_at", { withTimezone: false }),
    closedByUserId: uuid("closed_by_user_id"), // IAM externo (o varchar si no es uuid)
    ...timestamps,
  },
  (t) => [uniqueIndex("uniq_accounting_period_year_month").on(t.year, t.month)],
);

export const accountingPeriodsRelations = relations(
  accountingPeriods,
  ({ many }) => ({
    processRuns: many(processRuns), // Concr42
    portfolioAgingSnapshots: many(portfolioAgingSnapshots), // Concr63
  }),
);

export type AccountingPeriods = typeof accountingPeriods.$inferSelect & {
  processRuns?: ProcessRuns[];
  portfolioAgingSnapshots?: PortfolioAgingSnapshots[];
};

export type NewAccountingPeriods = typeof accountingPeriods.$inferInsert;

// ---------------------------------------------------------------------
// Concr47 - Fondos de créditos
// Nota:
// Define los fondos/bolsas de donde se asignan recursos para créditos y su control.
// Campos clave:
// - name: nombre del fondo.
// - isControlled: indica si el fondo controla cupos/presupuesto.
// ---------------------------------------------------------------------
export const creditFunds = pgTable(
  "credit_funds",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 30 }).notNull(),
    // Concr47.control (si controla cupo/presupuesto)
    isControlled: boolean("is_controlled").notNull().default(true),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex("uniq_credit_funds_name").on(t.name)],
);

export const creditFundsRelations = relations(creditFunds, ({ many }) => ({
  budgets: many(creditFundBudgets),
  creditProducts: many(creditProducts),
  loanApplications: many(loanApplications),
  loans: many(loans),
}));

export type CreditFunds = typeof creditFunds.$inferSelect & {
  budgets?: CreditFundBudgets[];
  creditProducts?: CreditProducts[];
  loanApplications?: LoanApplications[];
  loans?: Loans[];
};

export type NewCreditFunds = typeof creditFunds.$inferInsert;

// ---------------------------------------------------------------------
// Concr48 - Presupuestos por fondos de créditos
// Nota:
// Define el presupuesto/cupo asignado a un fondo por periodo contable.
// Campos clave:
// - creditFundId: fondo al que aplica el presupuesto.
// - accountingPeriodId: periodo (año/mes) del presupuesto.
// - fundAmount / reinvestmentAmount / expenseAmount: valores presupuestados.
// ---------------------------------------------------------------------
export const creditFundBudgets = pgTable(
  "credit_fund_budgets",
  {
    id: serial("id").primaryKey(),
    creditFundId: integer("credit_fund_id")
      .notNull()
      .references(() => creditFunds.id, { onDelete: "restrict" }),
    accountingPeriodId: integer("accounting_period_id")
      .notNull()
      .references(() => accountingPeriods.id, { onDelete: "restrict" }),
    fundAmount: decimal("fund_amount", { precision: 20, scale: 2 }).notNull(),
    reinvestmentAmount: decimal("reinvestment_amount", {
      precision: 20,
      scale: 2,
    }).notNull(),
    expenseAmount: decimal("expense_amount", {
      precision: 20,
      scale: 2,
    }).notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("uniq_credit_fund_budget").on(
      t.creditFundId,
      t.accountingPeriodId,
    ),
  ],
);

export const creditFundBudgetsRelations = relations(
  creditFundBudgets,
  ({ one }) => ({
    fund: one(creditFunds, {
      fields: [creditFundBudgets.creditFundId],
      references: [creditFunds.id],
    }),
    accountingPeriod: one(accountingPeriods, {
      fields: [creditFundBudgets.accountingPeriodId],
      references: [accountingPeriods.id],
    }),
  }),
);

export type CreditFundBudgets = typeof creditFundBudgets.$inferSelect & {
  fund?: CreditFunds;
  accountingPeriod?: AccountingPeriods;
};

export type NewCreditFundBudgets = typeof creditFundBudgets.$inferInsert;

// ---------------------------------------------------------------------
// Concr62 - Usuario ↔ Oficina de afiliación
// Nota (ES):
// Asigna a qué oficinas puede pertenecer/operar un usuario.
// Campos clave:
// - userId: id del usuario en IAM.
// - affiliationOfficeId: oficina asignada.
// ---------------------------------------------------------------------
export const userAffiliationOffices = pgTable(
  "user_affiliation_offices",
  {
    id: serial("id").primaryKey(),
    // IAM externo: UUID
    userId: uuid("user_id").notNull(),
    affiliationOfficeId: integer("affiliation_office_id")
      .notNull()
      .references(() => affiliationOffices.id, { onDelete: "restrict" }),
    isPrimary: boolean("is_primary").notNull().default(false),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("uniq_user_affiliation_office").on(
      t.userId,
      t.affiliationOfficeId,
    ),
  ],
);

export const userAffiliationOfficesRelations = relations(
  userAffiliationOffices,
  ({ one }) => ({
    office: one(affiliationOffices, {
      fields: [userAffiliationOffices.affiliationOfficeId],
      references: [affiliationOffices.id],
    }),
  }),
);

export type UserAffiliationOffices =
  typeof userAffiliationOffices.$inferSelect & {
    office?: AffiliationOffices;
  };

export type NewUserAffiliationOffices =
  typeof userAffiliationOffices.$inferInsert;

// ---------------------------------------------------------------------
// Concr21 - Tipos de terceros
// Nota:
// Catálogo para clasificar terceros (personas/empresas) según el tipo definido por el cliente.
// Campo clave:
// - name: nombre del tipo de tercero.
// ---------------------------------------------------------------------
export const thirdPartyTypes = pgTable(
  "third_party_types",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("uniq_third_party_types_name").on(t.name)],
);

export const thirdPartyTypesRelations = relations(
  thirdPartyTypes,
  ({ many }) => ({
    thirdParties: many(thirdParties),
  }),
);

export type ThirdPartyTypes = typeof thirdPartyTypes.$inferSelect & {
  thirdParties?: ThirdParties[];
};

export type NewThirdPartyTypes = typeof thirdPartyTypes.$inferInsert;

export const personTypeEnum = pgEnum("person_type", ["NATURAL", "LEGAL"]);
// Tipcon (tipo contribuyente) según tu select legacy
export const taxpayerTypeEnum = pgEnum("taxpayer_type", [
  "STATE_COMPANY", // 1 EMPRESA DEL ESTADO
  "COMMON_REGIME", // 2 REGIMEN COMUN
  "SIMPLIFIED_REGIME", // 3 REGIMEN SIMPLIFICADO
  "NO_SALES_REGIME", // 4 SIN REGIMEN DE VENTAS
  "LARGE_TAXPAYER", // 5 GRAN CONTRIBUYENTE
  "NATURAL_PERSON", // 6 PERSONA NATURAL
  "OTHER", // 7 OTRO
]);
// Sexo enum
export const sexEnum = pgEnum("sex", ["M", "F"]);

// ---------------------------------------------------------------------
// Concr20 - Terceros
// Nota (ES):
// Maestro de terceros (persona o empresa). Se usa como solicitante del credito
// Campos clave:
// - documentType / documentNumber: identificación del tercero (único).
// - personType: NATURAL o LEGAL.
// - businessName: razón social (requerida para LEGAL).
// - representativeIdNumber: cédula del representante (solo LEGAL).
// - thirdPartyTypeId: clasificación del tercero (Concr21).
// - taxpayerType / hasRut: datos tributarios.
// ---------------------------------------------------------------------
export const thirdParties = pgTable(
  "third_parties",
  {
    id: serial("id").primaryKey(),
    // Identificación
    documentType: varchar("document_type", { length: 10 }).notNull(), // ej: CC, NIT, CE...
    documentNumber: varchar("document_number", { length: 17 }).notNull(),
    verificationDigit: varchar("verification_digit", { length: 1 }), // útil para NIT

    personType: personTypeEnum("person_type").notNull(),

    // Empresa: representante legal (solo LEGAL)
    representativeIdNumber: varchar("representative_id_number", { length: 15 }),

    // Persona natural (solo NATURAL)
    firstLastName: varchar("first_last_name", { length: 20 }),
    secondLastName: varchar("second_last_name", { length: 15 }),
    firstName: varchar("first_name", { length: 20 }),
    secondName: varchar("second_name", { length: 15 }),

    // Empresa (solo LEGAL)
    businessName: varchar("business_name", { length: 60 }),

    // Datos generales
    sex: sexEnum("sex"),
    categoryCode: varchar("category_code", { length: 1 }), // A,B,C,D
    address: varchar("address", { length: 80 }),

    phone: varchar("phone", { length: 20 }).notNull(),
    mobilePhone: varchar("mobile_phone", { length: 20 }),
    email: varchar("email", { length: 60 }),

    thirdPartyTypeId: integer("third_party_type_id")
      .notNull()
      .references(() => thirdPartyTypes.id, { onDelete: "restrict" }),

    // Tributario
    taxpayerType: taxpayerTypeEnum("taxpayer_type").notNull(),
    hasRut: boolean("has_rut").notNull().default(false),

    // Empleador (si aplica). Puedes luego normalizar esto a employerThirdPartyId.
    employerDocumentNumber: varchar("employer_document_number", { length: 17 }),
    employerBusinessName: varchar("employer_business_name", { length: 200 }),

    note: varchar("note", { length: 220 }),

    ...timestamps,
  },
  (t) => [
    uniqueIndex("uniq_third_party_identity").on(
      t.documentType,
      t.documentNumber,
    ),

    index("idx_third_party_employer_doc").on(t.employerDocumentNumber),
    index("idx_third_party_type").on(t.thirdPartyTypeId),

    check(
      "chk_third_party_names_by_type",
      sql`
      (
        ${t.personType} = 'NATURAL'
        AND ${t.firstName} IS NOT NULL
        AND ${t.firstLastName} IS NOT NULL
      )
      OR
      (
        ${t.personType} = 'LEGAL'
        AND ${t.businessName} IS NOT NULL
      )
    `,
    ),
    check(
      "chk_third_party_rep_for_legal",
      sql`
      (
        ${t.personType} = 'NATURAL'
      )
      OR
      (
        ${t.personType} = 'LEGAL'
        AND ${t.representativeIdNumber} IS NOT NULL
      )
    `,
    ),
  ],
);

export const thirdPartiesRelations = relations(
  thirdParties,
  ({ one, many }) => ({
    thirdPartyType: one(thirdPartyTypes, {
      fields: [thirdParties.thirdPartyTypeId],
      references: [thirdPartyTypes.id],
    }),
    loanApplications: many(loanApplications), // Concr39.numdoc
    loans: many(loans), // Concr08.numdoc
    glMovements: many(accountingEntries), // Concr22.numdoc
  }),
);

export type ThirdParties = typeof thirdParties.$inferSelect & {
  thirdPartyType?: ThirdPartyTypes;
  loanApplications?: LoanApplications[];
  loans?: Loans[];
  accountingEntries?: AccountingEntries[];
};

export type NewThirdParties = typeof thirdParties.$inferInsert;

// ---------------------------------------------------------------------
// Concr25 - Empresas de seguros
// Nota:
// Catálogo de aseguradoras y su parametrización contable para el cobro del seguro.
// Campos clave:
// - taxId: NIT de la aseguradora (único) + verificationDigit.
// - factor / minimumValue: parámetros de cálculo del seguro.
// - paymentDistributionId / monthDistributionId: distribuciones contables asociadas (Concr05).
// ---------------------------------------------------------------------
export const insuranceCompanies = pgTable(
  "insurance_companies",
  {
    id: serial("id").primaryKey(),

    taxId: varchar("tax_id", { length: 17 }).notNull(),
    verificationDigit: varchar("verification_digit", { length: 1 }),

    businessName: varchar("business_name", { length: 255 }).notNull(),
    address: varchar("address", { length: 255 }).notNull(),

    phone: varchar("phone", { length: 20 }),
    mobileNumber: varchar("mobile_number", { length: 20 }),
    email: varchar("email", { length: 60 }),

    factor: decimal("factor", { precision: 12, scale: 4 }).notNull(),
    minimumValue: decimal("minimum_value", { precision: 12, scale: 2 }),

    totalChargeDistributionId: integer(
      "total_charge_distribution_id",
    ).references(() => accountingDistributions.id, { onDelete: "restrict" }),

    monthlyDistributionId: integer("monthly_distribution_id")
      .notNull()
      .references(() => accountingDistributions.id, { onDelete: "restrict" }),

    note: varchar("note", { length: 70 }),

    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex("uniq_insurance_companies_tax_id").on(t.taxId)],
);

export const insuranceCompaniesRelations = relations(
  insuranceCompanies,
  ({ many, one }) => ({
    // Concr34
    rateRanges: many(insuranceRateRanges),

    // Concr05 - dos FKs => relationName para evitar ambigüedad
    totalChargeDistribution: one(accountingDistributions, {
      relationName: "insuranceTotalChargeDistribution",
      fields: [insuranceCompanies.totalChargeDistributionId],
      references: [accountingDistributions.id],
    }),

    monthlyDistribution: one(accountingDistributions, {
      relationName: "insuranceMonthlyDistribution",
      fields: [insuranceCompanies.monthlyDistributionId],
      references: [accountingDistributions.id],
    }),
  }),
);

export type InsuranceCompanies = typeof insuranceCompanies.$inferSelect & {
  rateRanges?: InsuranceRateRanges[];
  totalChargeDistribution?: AccountingDistributions;
  monthlyDistribution?: AccountingDistributions;
};

export type NewInsuranceCompanies = typeof insuranceCompanies.$inferInsert;

// ---------------------------------------------------------------------
// Concr34 - Valores de seguros (rangos)
// Nota (ES):
// Define rangos de valor (monto) para calcular el seguro de una aseguradora.
// Campos clave:
// - valueFrom/valueTo: rango de monto al que aplica.
// - rateValue: valor/tasa configurada para el cálculo del seguro.
// ---------------------------------------------------------------------
export const insuranceRateRanges = pgTable(
  "insurance_rate_ranges",
  {
    id: serial("id").primaryKey(),
    insuranceCompanyId: integer("insurance_company_id")
      .notNull()
      .references(() => insuranceCompanies.id, { onDelete: "cascade" }),
    valueFrom: integer("value_from").notNull(),
    valueTo: integer("value_to").notNull(),
    rateValue: decimal("rate_value", { precision: 12, scale: 5 }).notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("uniq_insurance_rate_range").on(
      t.insuranceCompanyId,
      t.valueFrom,
      t.valueTo,
    ),
    check(
      "chk_insurance_rate_range_order",
      sql`${t.valueFrom} <= ${t.valueTo}`,
    ),
  ],
);

export const insuranceRateRangesRelations = relations(
  insuranceRateRanges,
  ({ one }) => ({
    insuranceCompany: one(insuranceCompanies, {
      fields: [insuranceRateRanges.insuranceCompanyId],
      references: [insuranceCompanies.id],
    }),
  }),
);

export type InsuranceRateRanges = typeof insuranceRateRanges.$inferSelect & {
  insuranceCompany?: InsuranceCompanies;
};
export type NewInsuranceRateRanges = typeof insuranceRateRanges.$inferInsert;

export const financingTypeEnum = pgEnum("financing_type", [
  "FIXED_AMOUNT", // Valor Fijo
  "ON_BALANCE", // Valor Sobre Saldo
]);
// Modo configurado por producto (concr07 / creditProducts)
export const riskEvaluationModeEnum = pgEnum("risk_evaluation_mode", [
  "NONE", // no integra / no valida
  "VALIDATE_ONLY", // consulta riesgo pero no bloquea aprobación
  "REQUIRED", // consulta riesgo y es obligatorio pasar
]);
// ---------------------------------------------------------------------
// Concr07 - Tipos / Líneas de crédito
// Nota:
// Parametrización del producto de crédito: reglas financieras, distribuciones contables,
// máximos (cuotas), seguro, reporte a centrales y costos (estudio).
// Campos clave:
// - financingType: define si el interés/cuota se calcula fijo o sobre saldo.
// - paysInsurance: si aplica cobro de seguro.
// - *DistributionId: define la distribución contable para capital/interés/mora.
// - maxInstallments: número máximo de cuotas permitidas.
// - studyFeeAmount + studyGlAccountId: costo y auxiliar del estudio.
// - costCenterId: centro de costo asociado al producto (si aplica).
// ---------------------------------------------------------------------
export const creditProducts = pgTable(
  "credit_products",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    // Concr07.codcre -> fondo por defecto
    creditFundId: integer("credit_fund_id")
      .references(() => creditFunds.id, {
        onDelete: "restrict",
      })
      .notNull(),
    paymentAllocationPolicyId: integer("payment_allocation_policy_id")
      .notNull()
      .references(() => paymentAllocationPolicies.id, { onDelete: "cascade" }),
    xmlModelId: integer("xml_model_id"),
    // Concr07.tipfin
    financingType: financingTypeEnum("financing_type").notNull(),
    // Concr07.pagseg (S/N)
    paysInsurance: boolean("pays_insurance").notNull().default(false),
    // Concr07.codcap/codint/codmor -> Concr05 (distribuciones)
    capitalDistributionId: integer("capital_distribution_id")
      .notNull()
      .references(() => accountingDistributions.id, { onDelete: "restrict" }),
    interestDistributionId: integer("interest_distribution_id")
      .notNull()
      .references(() => accountingDistributions.id, { onDelete: "restrict" }),
    lateInterestDistributionId: integer("late_interest_distribution_id")
      .notNull()
      .references(() => accountingDistributions.id, { onDelete: "restrict" }),
    // Concr07.repdcr (S/N)
    reportsToCreditBureau: boolean("reports_to_credit_bureau")
      .notNull()
      .default(false),
    // Concr07.numcuo (max cuotas)
    maxInstallments: integer("max_installments"),
    // Concr07.estcre (valor estudio)
    studyFeeAmount: decimal("study_fee_amount", { precision: 14, scale: 2 }),
    // Concr07.auxest -> Concr18 (gl_accounts)
    studyGlAccountId: integer("study_gl_account_id").references(
      () => glAccounts.id,
      {
        onDelete: "restrict",
      },
    ),
    // Concr07.codcen -> centro de costo
    costCenterId: integer("cost_center_id").references(() => costCenters.id, {
      onDelete: "set null",
    }),
    riskEvaluationMode: riskEvaluationModeEnum("risk_evaluation_mode")
      .notNull()
      .default("NONE"),

    riskMinScore: decimal("risk_min_score", {
      precision: 12,
      scale: 5,
    }),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    index("idx_credit_products_fund").on(t.creditFundId),
    index("idx_credit_products_cost_center").on(t.costCenterId),
  ],
);

export const creditProductsRelations = relations(
  creditProducts,
  ({ one, many }) => ({
    paymentAllocationPolicy: one(paymentAllocationPolicies, {
      fields: [creditProducts.paymentAllocationPolicyId],
      references: [paymentAllocationPolicies.id],
    }),
    fund: one(creditFunds, {
      fields: [creditProducts.creditFundId],
      references: [creditFunds.id],
    }),
    // 3 FKs -> relationName para evitar ambigüedad
    capitalDistribution: one(accountingDistributions, {
      relationName: "capitalDistribution",
      fields: [creditProducts.capitalDistributionId],
      references: [accountingDistributions.id],
    }),
    interestDistribution: one(accountingDistributions, {
      relationName: "interestDistribution",
      fields: [creditProducts.interestDistributionId],
      references: [accountingDistributions.id],
    }),
    lateInterestDistribution: one(accountingDistributions, {
      relationName: "lateInterestDistribution",
      fields: [creditProducts.lateInterestDistributionId],
      references: [accountingDistributions.id],
    }),
    studyGlAccount: one(glAccounts, {
      relationName: "studyGlAccount",
      fields: [creditProducts.studyGlAccountId],
      references: [glAccounts.id],
    }),
    costCenter: one(costCenters, {
      fields: [creditProducts.costCenterId],
      references: [costCenters.id],
    }),
    categories: many(creditProductCategories),
    requiredDocuments: many(creditProductRequiredDocuments),
    accounts: many(creditProductAccounts),
  }),
);

export type CreditProducts = typeof creditProducts.$inferSelect & {
  fund?: CreditFunds | null;
  capitalDistribution?: AccountingDistributions;
  interestDistribution?: AccountingDistributions;
  lateInterestDistribution?: AccountingDistributions;
  studyGlAccount?: GlAccounts | null;
  costCenter?: CostCenters | null;
  categories?: CreditProductCategories[];
  requiredDocuments?: CreditProductRequiredDocuments[];
  accounts?: CreditProductAccounts[];
  paymentAllocationPolicy?: PaymentAllocationPolicies;
};

export type NewCreditProducts = typeof creditProducts.$inferInsert;

// =====================================================================
// Concr30 - Categorías por tipos de crédito (rangos de cuotas + factores)
// Nota:
// Parametriza factores del crédito por categoría y por rango de cuotas.
// Campos clave:
// - categoryCode: categoría del afiliado/cliente (según reglas del cliente).
// - installmentsFrom/To: rango de cuotas al que aplica.
// - financingFactor: factor para cálculo financiero.
// - lateFactor: factor para mora.
// - pledgeFactor: factor para pignoración (si aplica).
// =====================================================================
export const creditProductCategories = pgTable(
  "credit_product_categories",
  {
    id: serial("id").primaryKey(),
    creditProductId: integer("credit_product_id")
      .notNull()
      .references(() => creditProducts.id, { onDelete: "cascade" }),
    categoryCode: varchar("category_code", { length: 1 }).notNull(),
    installmentsFrom: integer("installments_from").notNull(),
    installmentsTo: integer("installments_to").notNull(),
    financingFactor: decimal("financing_factor", {
      precision: 12,
      scale: 9,
    }).notNull(),
    lateFactor: decimal("late_factor", { precision: 12, scale: 9 }).notNull(),
    pledgeFactor: decimal("pledge_factor", { precision: 12, scale: 9 }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("uniq_credit_product_category_range").on(
      t.creditProductId,
      t.categoryCode,
      t.installmentsFrom,
      t.installmentsTo,
    ),

    check(
      "chk_credit_product_category_installments_min",
      sql`${t.installmentsFrom} >= 1`,
    ),
    check(
      "chk_credit_product_category_installments_order",
      sql`${t.installmentsFrom} <= ${t.installmentsTo}`,
    ),
  ],
);

export const creditProductCategoriesRelations = relations(
  creditProductCategories,
  ({ one, many }) => ({
    creditProduct: one(creditProducts, {
      fields: [creditProductCategories.creditProductId],
      references: [creditProducts.id],
    }),

    lateInterestRules: many(creditProductLateInterestRules),
  }),
);

export type CreditProductCategories =
  typeof creditProductCategories.$inferSelect & {
    creditProduct?: CreditProducts;
    lateInterestRules?: CreditProductLateInterestRules[];
  };

export type NewCreditProductCategories =
  typeof creditProductCategories.$inferInsert;

// =====================================================================
// Concr44 - Tipos de crédito vs Documentos requeridos (pivot)
// Nota:
// Define qué documentos se solicitan para cada producto de crédito.
// Campos clave:
// - creditProductId: producto de crédito.
// - requiredDocumentTypeId: tipo de documento.
// - isRequired: si es obligatorio o solo informativo.
// =====================================================================
export const creditProductRequiredDocuments = pgTable(
  "credit_product_required_documents",
  {
    id: serial("id").primaryKey(),
    creditProductId: integer("credit_product_id")
      .notNull()
      .references(() => creditProducts.id, { onDelete: "cascade" }),
    requiredDocumentTypeId: integer("required_document_type_id")
      .notNull()
      .references(() => documentTypes.id, { onDelete: "restrict" }),
    isRequired: boolean("is_required").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("uniq_credit_product_required_document").on(
      t.creditProductId,
      t.requiredDocumentTypeId,
    ),
  ],
);

export const creditProductRequiredDocumentsRelations = relations(
  creditProductRequiredDocuments,
  ({ one }) => ({
    creditProduct: one(creditProducts, {
      fields: [creditProductRequiredDocuments.creditProductId],
      references: [creditProducts.id],
    }),
    requiredDocumentType: one(documentTypes, {
      fields: [creditProductRequiredDocuments.requiredDocumentTypeId],
      references: [documentTypes.id],
    }),
  }),
);

export type CreditProductRequiredDocuments =
  typeof creditProductRequiredDocuments.$inferSelect & {
    creditProduct?: CreditProducts;
    requiredDocumentType?: DocumentTypes;
  };

export type NewCreditProductRequiredDocuments =
  typeof creditProductRequiredDocuments.$inferInsert;

// =====================================================================
// Concr26 - Auxiliares por tipos de crédito
// Nota:
// Mapea el producto de crédito a los auxiliares contables (cuentas) para registrar:
// - capital
// - interés corriente
// - interés de mora
// Campos clave:
// - creditProductId (1 a 1)
// - *GlAccountId: cuentas contables asociadas.
// =====================================================================
export const creditProductAccounts = pgTable(
  "credit_product_accounts",
  {
    id: serial("id").primaryKey(),
    creditProductId: integer("credit_product_id")
      .notNull()
      .references(() => creditProducts.id, { onDelete: "cascade" }),
    capitalGlAccountId: integer("capital_gl_account_id")
      .notNull()
      .references(() => glAccounts.id, { onDelete: "restrict" }),
    interestGlAccountId: integer("interest_gl_account_id")
      .notNull()
      .references(() => glAccounts.id, { onDelete: "restrict" }),
    lateInterestGlAccountId: integer("late_interest_gl_account_id")
      .notNull()
      .references(() => glAccounts.id, { onDelete: "restrict" }),
    ...timestamps,
  },
  (t) => [
    // 1 a 1 con creditProducts
    uniqueIndex("uniq_credit_product_accounts_credit_product").on(
      t.creditProductId,
    ),
  ],
);

export const creditProductAccountsRelations = relations(
  creditProductAccounts,
  ({ one }) => ({
    creditProduct: one(creditProducts, {
      fields: [creditProductAccounts.creditProductId],
      references: [creditProducts.id],
    }),
    // 3 FKs a gl_accounts => relationName
    capitalAccount: one(glAccounts, {
      relationName: "capitalGlAccount",
      fields: [creditProductAccounts.capitalGlAccountId],
      references: [glAccounts.id],
    }),
    interestAccount: one(glAccounts, {
      relationName: "interestGlAccount",
      fields: [creditProductAccounts.interestGlAccountId],
      references: [glAccounts.id],
    }),
    lateInterestAccount: one(glAccounts, {
      relationName: "lateInterestGlAccount",
      fields: [creditProductAccounts.lateInterestGlAccountId],
      references: [glAccounts.id],
    }),
  }),
);

export type CreditProductAccounts =
  typeof creditProductAccounts.$inferSelect & {
    creditProduct?: CreditProducts;
    capitalAccount?: GlAccounts;
    interestAccount?: GlAccounts;
    lateInterestAccount?: GlAccounts;
  };

export type NewCreditProductAccounts =
  typeof creditProductAccounts.$inferInsert;

export const bankAccountTypeEnum = pgEnum("bank_account_type", [
  "SAVINGS", // A
  "CHECKING", // C
]);

export const loanApplicationStatusEnum = pgEnum("loan_application_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELED",
]);

export const loanApprovalTypeEnum = pgEnum("loan_approval_type", [
  "IMMEDIATE",
  "NON_IMMEDIATE",
]);

export const riskStatusEnum = pgEnum("risk_status", [
  "NOT_REQUIRED",
  "PENDING",
  "PASSED",
  "FAILED",
  "MANUAL_REVIEW",
  "ERROR",
]);

// ------------------------------------------------------------
// Concr39 - Solicitudes de créditos
// Nota:
// Registro principal de la solicitud de crédito. Conecta: oficina, solicitante (tercero),
// producto, método de recaudo (libranza/pignoración/etc), datos financieros, desembolso,
// seguro, estado y motivo de rechazo.
// Campos clave:
// - thirdPartyId: solicitante.
// - creditProductId: producto solicitado.
// - affiliationOfficeId: oficina donde se radica.
// - status: estado (pendiente/aprobado/rechazado).
// - requestedAmount / installments / financingFactor: parámetros de la solicitud.
// ------------------------------------------------------------
export const loanApplications = pgTable(
  "loan_applications",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 20 }).notNull().unique(),
    // Fondo asignado
    creditFundId: integer("credit_fund_id")
      .references(() => creditFunds.id, {
        onDelete: "restrict",
      })
      .notNull(),
    applicationDate: date("application_date").notNull(),
    affiliationOfficeId: integer("affiliation_office_id")
      .notNull()
      .references(() => affiliationOffices.id, { onDelete: "restrict" }),
    // IAM externo
    createdByUserId: uuid("created_by_user_id").notNull(),
    // Solicitante (tercero)
    thirdPartyId: integer("third_party_id")
      .notNull()
      .references(() => thirdParties.id, { onDelete: "restrict" }),

    // mancat S/N -> boolean
    isCategoryManual: boolean("is_category_manual").notNull().default(false),
    // codcat
    categoryCode: varchar("category_code", { length: 1 }).notNull(),

    // forpag -> tu tabla “repayment_methods” (libranza/pignoración/etc)
    repaymentMethodId: integer("repayment_method_id")
      .notNull()
      .references(() => repaymentMethods.id, { onDelete: "restrict" }),

    // pigsub S/N -> boolean
    pledgesSubsidy: boolean("pledges_subsidy").notNull().default(false),

    salary: decimal("salary", { precision: 14, scale: 2 }).notNull(),
    otherIncome: decimal("other_income", { precision: 14, scale: 2 }).notNull(),
    otherCredits: decimal("other_credits", {
      precision: 14,
      scale: 2,
    }).notNull(),
    paymentCapacity: decimal("payment_capacity", {
      precision: 14,
      scale: 2,
    }).notNull(),

    // Desembolso
    bankAccountNumber: varchar("bank_account_number", { length: 25 }).notNull(),
    bankAccountType: bankAccountTypeEnum("bank_account_type").notNull(),
    bankId: integer("bank_id")
      .notNull()
      .references(() => banks.id, { onDelete: "restrict" }),

    creditProductId: integer("credit_product_id")
      .notNull()
      .references(() => creditProducts.id, { onDelete: "restrict" }),

    paymentFrequencyId: integer("payment_frequency_id").references(
      () => paymentFrequencies.id,
      { onDelete: "restrict" },
    ),

    financingFactor: decimal("financing_factor", {
      precision: 12,
      scale: 9,
    }).notNull(),
    installments: integer("installments").notNull(),

    // Seguro (opcional)
    insuranceCompanyId: integer("insurance_company_id").references(
      () => insuranceCompanies.id,
      { onDelete: "restrict" },
    ),
    // facseg (%). Si no hay seguro, lo dejamos 0.
    insuranceFactor: decimal("insurance_factor", { precision: 12, scale: 5 })
      .notNull()
      .default("0"),

    requestedAmount: decimal("requested_amount", {
      precision: 14,
      scale: 2,
    }).notNull(),
    approvedAmount: decimal("approved_amount", { precision: 14, scale: 2 }),
    approvalType: loanApprovalTypeEnum("approval_type"),

    investmentTypeId: integer("investment_type_id").references(
      () => investmentTypes.id,
      { onDelete: "restrict" },
    ),

    status: loanApplicationStatusEnum("status").notNull().default("PENDING"),

    receivedDate: date("received_date").notNull(),

    // IAM externo
    statusChangedByUserId: uuid("status_changed_by_user_id"),
    statusDate: date("status_date"),
    actNumber: varchar("act_number", { length: 20 }),
    rejectionReasonId: integer("rejection_reason_id").references(
      () => rejectionReasons.id,
      { onDelete: "restrict" },
    ),

    note: varchar("note", { length: 255 }),
    // aprseg enum('N','S') -> boolean
    isInsuranceApproved: boolean("is_insurance_approved")
      .notNull()
      .default(false),

    // estcre int -> mejor decimal (dinero)
    creditStudyFee: decimal("credit_study_fee", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    ...timestamps,
    riskStatus: riskStatusEnum("risk_status").notNull().default("NOT_REQUIRED"),
    riskScore: decimal("risk_score", { precision: 12, scale: 5 }),
    riskCheckedAt: timestamp("risk_checked_at", { withTimezone: true }),
    riskNote: varchar("risk_note", { length: 255 }),
    channelId: integer("channel_id").references(() => channels.id, {
      onDelete: "set null",
    }),
  },
  (t) => [
    index("idx_loan_applications_date_office").on(
      t.applicationDate,
      t.affiliationOfficeId,
    ),
    index("idx_loan_applications_office").on(t.affiliationOfficeId),
    index("idx_loan_applications_status").on(t.status),
    index("idx_loan_applications_third_party").on(t.thirdPartyId),
    index("idx_loan_applications_product").on(t.creditProductId),
  ],
);

export const loanApplicationsRelations = relations(
  loanApplications,
  ({ one, many }) => ({
    office: one(affiliationOffices, {
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

    coSigners: many(loanApplicationCoDebtors), // Concr41
    documents: many(loanApplicationDocuments), // Concr45
  }),
);

export type LoanApplications = typeof loanApplications.$inferSelect & {
  office?: AffiliationOffices;
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

  coSigners?: LoanApplicationCoDebtors[];
  documents?: LoanApplicationDocuments[];
};

export type NewLoanApplications = typeof loanApplications.$inferInsert;

// ---------------------------------------------------------------------
// Concr16 - Pignoraciones por núcleo familiar
// Nota:
// Registra la(s) pignoración(es) de subsidio familiar asociadas a una solicitud.
// Una solicitud puede tener varias pignoraciones (cónyuge/beneficiarios).
// Campos clave:
// - loanApplicationId: solicitud asociada.
// - agreementCode: convenio/contrato (integración externa).
// - beneficiaryCode: beneficiario al que se le descuenta.
// - pledgedAmount: valor a descontar/pignorar.
// ---------------------------------------------------------------------
export const loanApplicationPledges = pgTable(
  "loan_application_pledges",
  {
    id: serial("id").primaryKey(),
    loanApplicationId: integer("loan_application_id")
      .notNull()
      .references(() => loanApplications.id, { onDelete: "cascade" }),
    agreementCode: varchar("agreement_code", { length: 20 }).notNull(),
    spouseDocumentNumber: varchar("spouse_document_number", { length: 20 }),
    beneficiaryCode: integer("beneficiary_code").notNull(),
    pledgedAmount: decimal("pledged_amount", {
      precision: 14,
      scale: 2,
    }).notNull(),
    effectiveDate: date("effective_date").notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("uniq_pledge_application_beneficiary").on(
      t.loanApplicationId,
      t.agreementCode,
      t.beneficiaryCode,
    ),
    index("idx_pledges_application").on(t.loanApplicationId),
    index("idx_pledges_agreement").on(t.agreementCode),
  ],
);

export const loanApplicationPledgesRelations = relations(
  loanApplicationPledges,
  ({ one }) => ({
    application: one(loanApplications, {
      fields: [loanApplicationPledges.loanApplicationId],
      references: [loanApplications.id],
    }),
  }),
);

export type LoanApplicationPledges =
  typeof loanApplicationPledges.$inferSelect & {
    application?: LoanApplications;
  };

export type NewLoanApplicationPledges =
  typeof loanApplicationPledges.$inferInsert;

// ---------------------------------------------------------------------
// Concr40 - Codeudores
// Nota:
// Maestro de codeudores (datos de contacto y laborales). Se maneja separado de terceros
// para mantener compatibilidad con el modelo del crédito.
// Campos clave:
// - documentNumber: identificación del codeudor.
// - home*/work*: datos de residencia y laborales.
// ---------------------------------------------------------------------
export const coDebtors = pgTable(
  "co_debtors",
  {
    id: serial("id").primaryKey(),

    documentType: varchar("document_type", { length: 10 }).notNull(), // ej: CC, NIT, CE...
    // Concr40.numdoc
    documentNumber: varchar("document_number", { length: 20 }).notNull(),

    homeAddress: varchar("home_address", { length: 80 }).notNull(),
    homeCityCode: varchar("home_city_code", { length: 20 }).notNull(),
    homePhone: varchar("home_phone", { length: 20 }).notNull(),

    companyName: varchar("company_name", { length: 80 }).notNull(),
    workAddress: varchar("work_address", { length: 80 }).notNull(),
    workCityCode: varchar("work_city_code", { length: 20 }).notNull(),
    workPhone: varchar("work_phone", { length: 20 }).notNull(),

    ...timestamps,
  },
  (t) => [
    uniqueIndex("uniq_co_debtors_document_number").on(
      t.documentType,
      t.documentNumber,
    ),
  ],
);

export const coDebtorsRelations = relations(coDebtors, ({ many }) => ({
  applications: many(loanApplicationCoDebtors), // Concr41
}));

export type CoDebtors = typeof coDebtors.$inferSelect & {
  applications?: LoanApplicationCoDebtors[];
};

export type NewCoDebtors = typeof coDebtors.$inferInsert;

// ---------------------------------------------------------------------
// Concr41 - Relación solicitud - codeudor
// Nota:
// Asocia uno o varios codeudores a una solicitud de crédito.
// ---------------------------------------------------------------------
export const loanApplicationCoDebtors = pgTable(
  "loan_application_co_debtors",
  {
    id: serial("id").primaryKey(),
    loanApplicationId: integer("loan_application_id")
      .notNull()
      .references(() => loanApplications.id, { onDelete: "cascade" }),
    coDebtorId: integer("co_debtor_id")
      .notNull()
      .references(() => coDebtors.id, { onDelete: "restrict" }),

    ...timestamps,
  },
  (t) => [
    uniqueIndex("uniq_application_codebtor").on(
      t.loanApplicationId,
      t.coDebtorId,
    ),
    index("idx_application_codebtor_app").on(t.loanApplicationId),
    index("idx_application_codebtor_codebtor").on(t.coDebtorId),
  ],
);

export const loanApplicationCoDebtorsRelations = relations(
  loanApplicationCoDebtors,
  ({ one }) => ({
    application: one(loanApplications, {
      fields: [loanApplicationCoDebtors.loanApplicationId],
      references: [loanApplications.id],
    }),
    coDebtor: one(coDebtors, {
      fields: [loanApplicationCoDebtors.coDebtorId],
      references: [coDebtors.id],
    }),
  }),
);

export type LoanApplicationCoDebtors =
  typeof loanApplicationCoDebtors.$inferSelect & {
    application?: LoanApplications;
    coDebtor?: CoDebtors;
  };

export type NewLoanApplicationCoDebtors =
  typeof loanApplicationCoDebtors.$inferInsert;

// ---------------------------------------------------------------------
// Concr45 - Documentos entregados en solicitudes
// Nota:
// Evidencia de documentos por solicitud. Permite marcar entrega y adjuntar archivo.
// Campos clave:
// - loanApplicationId + requiredDocumentTypeId: identifica el documento requerido.
// - isDelivered: indica si fue entregado.
// - fileKey: referencia al archivo en el storage (S3/R2/GCS/etc).
// ---------------------------------------------------------------------
export const loanApplicationDocuments = pgTable(
  "loan_application_documents",
  {
    id: serial("id").primaryKey(),
    loanApplicationId: integer("loan_application_id")
      .notNull()
      .references(() => loanApplications.id, { onDelete: "cascade" }),
    requiredDocumentTypeId: integer("required_document_type_id")
      .notNull()
      .references(() => documentTypes.id, { onDelete: "restrict" }),
    isDelivered: boolean("is_delivered").notNull().default(false),
    // Storage reference (lo mínimo para poder descargar/ver el archivo)
    fileKey: varchar("file_key", { length: 512 }),
    uploadedByUserId: uuid("uploaded_by_user_id"),

    ...timestamps,
  },
  (t) => [
    uniqueIndex("uniq_application_document_type").on(
      t.loanApplicationId,
      t.requiredDocumentTypeId,
    ),
  ],
);

export const loanApplicationDocumentsRelations = relations(
  loanApplicationDocuments,
  ({ one }) => ({
    application: one(loanApplications, {
      fields: [loanApplicationDocuments.loanApplicationId],
      references: [loanApplications.id],
    }),
    documentType: one(documentTypes, {
      fields: [loanApplicationDocuments.requiredDocumentTypeId],
      references: [documentTypes.id],
    }),
  }),
);

export type LoanApplicationDocuments =
  typeof loanApplicationDocuments.$inferSelect & {
    application?: LoanApplications;
    documentType?: DocumentTypes;
  };

export type NewLoanApplicationDocuments =
  typeof loanApplicationDocuments.$inferInsert;

// ------------------------------------------------------------
// Enums Concr08
// ------------------------------------------------------------
export const loanStatusEnum = pgEnum("loan_status", [
  "ACTIVE", // A
  "GENERATED", // G
  "INACTIVE", // I
  "ACCOUNTED", // C (contabilizado)
  "VOID", // X (anulado)
  "RELIQUIDATED", // R
  "FINISHED", // T (terminado)
  "PAID", // P
]);

export const loanDisbursementStatusEnum = pgEnum("loan_disbursement_status", [
  "LIQUIDATED", // L
  "SENT_TO_ACCOUNTING", // C
  "SENT_TO_BANK", // B
  "DISBURSED", // D
]);

// ---------------------------------------------------------------------
// Concr08 - Créditos aprobados / liquidados
// Nota:
// Representa el crédito ya aprobado (la obligación). Aquí se guardan valores finales,
// fechas clave, estado del crédito y estado del proceso de desembolso.
// Campos clave:
// - loanApplicationId: solicitud origen.
// - thirdPartyId: deudor del crédito.
// - payeeThirdPartyId: a quién se desembolsa (deudor o proveedor).
// - principalAmount: capital aprobado.
// - totalAmount: total inicial del plan (capital + intereses + costos), si aplica.
// - status: estado general del crédito.
// - disbursementStatus: estado del flujo de desembolso.
// ---------------------------------------------------------------------
export const loans = pgTable(
  "loans",
  {
    id: serial("id").primaryKey(),
    // código del crédito.
    code: varchar("code", { length: 20 }).notNull().unique(),
    creditFundId: integer("credit_fund_id").references(() => creditFunds.id, {
      onDelete: "restrict",
    }),

    // IAM externo (sin FK)
    createdByUserId: uuid("created_by_user_id").notNull(),

    // fecha de registro/aprobación en el sistema
    recordDate: date("record_date").notNull(),

    loanApplicationId: integer("loan_application_id")
      .notNull()
      .references(() => loanApplications.id, { onDelete: "restrict" }),

    // Deudor (solicitante)
    thirdPartyId: integer("third_party_id")
      .notNull()
      .references(() => thirdParties.id, { onDelete: "restrict" }),

    // A quién se desembolsa (puede ser el mismo tercero o un proveedor)
    payeeThirdPartyId: integer("payee_third_party_id")
      .notNull()
      .references(() => thirdParties.id, { onDelete: "restrict" }),

    installments: integer("installments").notNull(),

    // Fechas (en legacy feccre/fecven/fecpag)
    creditStartDate: date("credit_start_date").notNull(), // feccre: inicio/creación del crédito
    maturityDate: date("maturity_date").notNull(), // fecven: vencimiento final
    firstCollectionDate: date("first_collection_date"), // fecpag: cuándo empieza a cobrarse

    // Montos
    principalAmount: decimal("principal_amount", {
      precision: 14,
      scale: 2,
    }).notNull(),
    initialTotalAmount: decimal("initial_total_amount", {
      precision: 14,
      scale: 2,
    }).notNull(),

    // Seguro
    insuranceCompanyId: integer("insurance_company_id").references(
      () => insuranceCompanies.id,
      { onDelete: "restrict" },
    ),
    insuranceValue: decimal("insurance_value", { precision: 14, scale: 2 }),

    // Fondo/registro ??????? // otro seguro al credito
    fundRegisterTaxId: varchar("fund_register_tax_id", { length: 20 }),
    fundRegisterValue: decimal("fund_register_value", {
      precision: 14,
      scale: 2,
    }),

    // Flag legacy: desestcre
    discountStudyCredit: boolean("discount_study_credit")
      .notNull()
      .default(false),

    costCenterId: integer("cost_center_id").references(() => costCenters.id, {
      onDelete: "set null",
    }),

    repaymentMethodId: integer("repayment_method_id")
      .notNull()
      .references(() => repaymentMethods.id, { onDelete: "restrict" }),

    paymentGuaranteeTypeId: integer("payment_guarantee_type_id")
      .notNull()
      .references(() => paymentGuaranteeTypes.id, { onDelete: "restrict" }),

    guaranteeDocument: varchar("guarantee_document", { length: 50 }),

    // estado (A/G/I/C/X/R/T/P)
    status: loanStatusEnum("status").notNull().default("ACTIVE"),
    statusDate: date("status_date").notNull(),

    affiliationOfficeId: integer("affiliation_office_id")
      .notNull()
      .references(() => affiliationOffices.id, { onDelete: "restrict" }),

    // IAM externo (quien cambió el estado)
    statusChangedByUserId: uuid("status_changed_by_user_id"),

    note: varchar("note", { length: 255 }),

    // numcom: comprobante/numero contable (si aplica)
    voucherNumber: varchar("voucher_number", { length: 30 }),

    paymentFrequencyId: integer("payment_frequency_id").references(
      () => paymentFrequencies.id,
      { onDelete: "restrict" },
    ),

    // CIFIN / centrales (mejor default false)
    isReportedToCifin: boolean("is_reported_to_cifin").notNull().default(false),
    cifinReportDate: date("cifin_report_date"),

    // Jurídico
    hasLegalProcess: boolean("has_legal_process").notNull().default(false),
    legalProcessDate: date("legal_process_date"),

    // Acuerdo de pago
    hasPaymentAgreement: boolean("has_payment_agreement")
      .notNull()
      .default(false),
    paymentAgreementDate: date("payment_agreement_date"),

    // estpag (L/C/B/D) => estado del desembolso ???????
    disbursementStatus: loanDisbursementStatusEnum("disbursement_status")
      .notNull()
      .default("LIQUIDATED"),

    lastPaymentDate: date("last_payment_date"),

    // Castigo
    isWrittenOff: boolean("is_written_off").notNull().default(false),
    writtenOffDate: date("written_off_date"),

    isInterestWrittenOff: boolean("is_interest_written_off")
      .notNull()
      .default(false),
    interestWriteOffDocument: varchar("interest_write_off_document", {
      length: 30,
    }),

    withheldBalanceValue: integer("withheld_balance_value")
      .notNull()
      .default(0),

    ...timestamps,
  },
  (t) => [
    uniqueIndex("uniq_loans_code").on(t.code),

    index("idx_loans_application").on(t.loanApplicationId),
    index("idx_loans_status").on(t.status),
    index("idx_loans_start_status").on(t.creditStartDate, t.status),
    index("idx_loans_office").on(t.affiliationOfficeId),
    index("idx_loans_third_party").on(t.thirdPartyId),
    index("idx_loans_payee").on(t.payeeThirdPartyId),
    index("idx_loans_disbursement_status").on(t.disbursementStatus),
  ],
);

export const loansRelations = relations(loans, ({ one }) => ({
  borrower: one(thirdParties, {
    fields: [loans.thirdPartyId],
    references: [thirdParties.id],
    relationName: "loanBorrower",
  }),
  disbursementParty: one(thirdParties, {
    fields: [loans.payeeThirdPartyId],
    references: [thirdParties.id],
    relationName: "loanDisbursementParty",
  }),
  application: one(loanApplications, {
    fields: [loans.loanApplicationId],
    references: [loanApplications.id],
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
  guaranteeType: one(paymentGuaranteeTypes, {
    fields: [loans.paymentGuaranteeTypeId],
    references: [paymentGuaranteeTypes.id],
  }),
  office: one(affiliationOffices, {
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
}));

export type Loans = typeof loans.$inferSelect & {
  application?: LoanApplications;
  creditFund?: CreditFunds | null;
  repaymentMethod?: RepaymentMethods;
  paymentFrequency?: PaymentFrequencies | null;
  guaranteeType?: PaymentGuaranteeTypes;
  office?: AffiliationOffices;
  insuranceCompany?: InsuranceCompanies | null;
  costCenter?: CostCenters | null;
};

export type NewLoans = typeof loans.$inferInsert;

export const installmentRecordStatusEnum = pgEnum("installment_record_status", [
  "GENERATED", // G
  "ACCOUNTED", // C
  "VOID", // X
  "RELIQUIDATED", // R
  "INACTIVE", // I
]);

// ---------------------------------------------------------------------
// Concr09 - Plan de pagos (cuotas)
// Nota (ES):
// Cuotas programadas del crédito (plan de pagos). Se usa para proyección, vencimientos,
// cartera y para soportar reliquidaciones/versiones del plan.
// Campos clave:
// - loanId + scheduleVersion + installmentNumber: identifica la cuota en un plan.
// - dueDate: fecha de vencimiento.
// - principalAmount/interestAmount/insuranceAmount: valores programados.
// - remainingPrincipal: saldo capital proyectado después de aplicar la cuota.
// ---------------------------------------------------------------------
export const loanInstallments = pgTable(
  "loan_installments",
  {
    id: serial("id").primaryKey(),

    loanId: integer("loan_id")
      .notNull()
      .references(() => loans.id, { onDelete: "cascade" }),

    // Para soportar cambios del plan (abonos extra, refinanciaciones, etc.)
    scheduleVersion: integer("schedule_version").notNull().default(1),

    installmentNumber: integer("installment_number").notNull(),

    dueDate: date("due_date").notNull(),

    principalAmount: decimal("principal_amount", {
      precision: 14,
      scale: 2,
    }).notNull(),
    interestAmount: decimal("interest_amount", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    insuranceAmount: decimal("insurance_amount", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),

    // Estado del registro del plan (no confundir con “pagada/vencida”)
    status: installmentRecordStatusEnum("status")
      .notNull()
      .default("GENERATED"),

    remainingPrincipal: decimal("remaining_principal", {
      precision: 14,
      scale: 2,
    }).notNull(),

    ...timestamps,
  },
  (t) => [
    uniqueIndex("uniq_loan_installment_version_number").on(
      t.loanId,
      t.scheduleVersion,
      t.installmentNumber,
    ),

    index("idx_installments_loan_version_due").on(
      t.loanId,
      t.scheduleVersion,
      t.dueDate,
    ),
    index("idx_installments_loan_status_due").on(t.loanId, t.status, t.dueDate),

    check(
      "chk_installment_amounts_non_negative",
      sql`
      ${t.principalAmount} >= 0 AND
      ${t.interestAmount} >= 0 AND
      ${t.insuranceAmount} >= 0 AND
      ${t.remainingPrincipal} >= 0
    `,
    ),
  ],
);

export const loanInstallmentsRelations = relations(
  loanInstallments,
  ({ one }) => ({
    loan: one(loans, {
      fields: [loanInstallments.loanId],
      references: [loans.id],
    }),
  }),
);

export type LoanInstallments = typeof loanInstallments.$inferSelect & {
  loan?: Loans;
};

export type NewLoanInstallments = typeof loanInstallments.$inferInsert;

// ---------------------------------------------------------------------
// Concr52 — Acta diaria por oficina
// Nota (ES):
// Guarda el número de acta asignado a una oficina en una fecha.
// Regla: una oficina usa la misma acta durante todo el día.
// Se usa para consultar/crear el consecutivo del día.
// Campos clave:
// - affiliationOfficeId + actDate: llave funcional (1 acta por día por oficina).
// - actNumber: número de acta usado en las solicitudes del día.
// ---------------------------------------------------------------------
export const loanApplicationActNumbers = pgTable(
  "loan_application_act_numbers",
  {
    id: serial("id").primaryKey(),

    affiliationOfficeId: integer("affiliation_office_id")
      .notNull()
      .references(() => affiliationOffices.id, { onDelete: "restrict" }),

    actDate: date("act_date").notNull(),

    actNumber: varchar("act_number", { length: 20 }).notNull(),

    // IAM externo (opcional): quién generó/registró el acta
    generatedByUserId: uuid("generated_by_user_id"),

    ...timestamps,
  },
  (t) => [
    uniqueIndex("uniq_act_office_date").on(t.affiliationOfficeId, t.actDate),
    index("idx_act_date").on(t.actDate),
    index("idx_act_office").on(t.affiliationOfficeId),
  ],
);

export const loanApplicationActNumbersRelations = relations(
  loanApplicationActNumbers,
  ({ one }) => ({
    office: one(affiliationOffices, {
      fields: [loanApplicationActNumbers.affiliationOfficeId],
      references: [affiliationOffices.id],
    }),
  }),
);

export type LoanApplicationActNumbers =
  typeof loanApplicationActNumbers.$inferSelect & {
    office?: AffiliationOffices;
  };

export type NewLoanApplicationActNumbers =
  typeof loanApplicationActNumbers.$inferInsert;

export const portfolioEntryStatusEnum = pgEnum("portfolio_entry_status", [
  "OPEN",
  "CLOSED",
  "VOID",
]);

// ---------------------------------------------------------------------
// Concr17 (legacy) + tconcr17 (legacy) - Cartera por ítem (saldo actual)
// Nota (ES):
// Saldo actual por auxiliar + tercero + crédito + cuota.
// Se actualiza con movimientos contabilizados (Concr22).
// Regla: balance = chargeAmount - paymentAmount.
// ---------------------------------------------------------------------
export const portfolioEntries = pgTable(
  "portfolio_entries",
  {
    id: serial("id").primaryKey(),

    glAccountId: integer("gl_account_id")
      .notNull()
      .references(() => glAccounts.id, { onDelete: "restrict" }),

    thirdPartyId: integer("third_party_id")
      .notNull()
      .references(() => thirdParties.id, { onDelete: "restrict" }),

    loanId: integer("loan_id")
      .notNull()
      .references(() => loans.id, { onDelete: "cascade" }),

    installmentNumber: integer("installment_number").notNull().default(0),

    // equivalente a concr22.fecven / tconcr17.fecven
    dueDate: date("due_date").notNull(),

    // equivalente a tconcr17.valor / abonos / saldo
    chargeAmount: decimal("charge_amount", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    paymentAmount: decimal("payment_amount", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    balance: decimal("balance", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),

    // equivalente a tconcr17.fecha (último movimiento aplicado)
    lastMovementDate: date("last_movement_date"),

    status: portfolioEntryStatusEnum("status").notNull().default("OPEN"),

    // estado legacy (si lo quieres guardar tal cual)
    legacyStatusCode: varchar("legacy_status_code", { length: 1 }),

    ...timestamps,
  },
  (t) => [
    // equivalente a PK legacy (auxiliar,numdoc,doccru,nocts)
    uniqueIndex("uniq_portfolio_entry").on(
      t.glAccountId,
      t.thirdPartyId,
      t.loanId,
      t.installmentNumber,
    ),

    index("idx_portfolio_loan").on(t.loanId),
    index("idx_portfolio_due_status").on(t.dueDate, t.status),
    index("idx_portfolio_third_party").on(t.thirdPartyId),
    index("idx_portfolio_gl_account").on(t.glAccountId),
  ],
);

export const portfolioEntriesRelations = relations(
  portfolioEntries,
  ({ one }) => ({
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
  }),
);

export type PortfolioEntries = typeof portfolioEntries.$inferSelect & {
  glAccount?: GlAccounts;
  thirdParty?: ThirdParties;
  loan?: Loans;
};
export type NewPortfolioEntries = typeof portfolioEntries.$inferInsert;

// ---------------------------------------------------------------------
// Concr22 - Movimientos contables
// Nota (ES):
// Detalle contable (débito/crédito). Cuando estado='C' (contabilizado),
// alimenta/actualiza cartera (portfolio_entries) si la cuenta lo requiere (Concr18.detalla != 'N').
// Campos clave:
// - glAccountId + loanId + installmentNumber: para cartera.
// - voucherNumber (numcom): comprobante.
// - processType + documentCode + sequence: llave funcional legacy.
// ---------------------------------------------------------------------
export const accountingEntries = pgTable(
  "accounting_entries",
  {
    id: serial("id").primaryKey(),

    // concr22.tipo / documento / sec (llave legacy)
    processType: processTypeEnum("process_type").notNull(),
    documentCode: varchar("document_code", { length: 7 }).notNull(),
    sequence: integer("sequence").notNull(),

    voucherNumber: varchar("voucher_number", { length: 13 }).notNull(),
    entryDate: date("entry_date").notNull(),

    glAccountId: integer("gl_account_id")
      .notNull()
      .references(() => glAccounts.id, { onDelete: "restrict" }),

    costCenterId: integer("cost_center_id").references(() => costCenters.id, {
      onDelete: "restrict",
    }),

    thirdPartyId: integer("third_party_id").references(() => thirdParties.id, {
      onDelete: "restrict",
    }),

    description: varchar("description", { length: 255 }).notNull(),

    // nat: en legacy parece 'D'/'C'
    nature: entryNatureEnum("nature").notNull(),

    amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),

    // doccru/nocts/fecven -> para amarrar a crédito/cuota
    loanId: integer("loan_id").references(() => loans.id, {
      onDelete: "restrict",
    }),
    installmentNumber: integer("installment_number"),
    dueDate: date("due_date"),

    checkNumber: varchar("check_number", { length: 7 }),

    // estado: al menos 'C' es contabilizado
    statusCode: varchar("status_code", { length: 1 }).notNull(),

    transactionTypeCode: varchar("transaction_type_code", { length: 1 }),
    transactionDocument: varchar("transaction_document", {
      length: 7,
    }).notNull(),
    processRunId: integer("process_run_id").references(() => processRuns.id, {
      onDelete: "restrict",
    }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("uniq_accounting_entry_legacy_key").on(
      t.processType,
      t.documentCode,
      t.sequence,
    ),

    index("idx_entries_process_run").on(t.processRunId),

    // índices para cartera / consultas típicas
    index("idx_entries_loan_installment_due_status").on(
      t.loanId,
      t.installmentNumber,
      t.dueDate,
      t.statusCode,
    ),
    index("idx_entries_gl_third_party_status").on(
      t.glAccountId,
      t.thirdPartyId,
      t.statusCode,
    ),
    index("idx_entries_voucher").on(t.voucherNumber, t.entryDate),
  ],
);

export const accountingEntriesRelations = relations(
  accountingEntries,
  ({ one }) => ({
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
  }),
);

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
// Nota (ES):
// Relaciona un crédito nuevo (refinanciado) con uno o varios créditos origen (referencia).
// Útil para trazabilidad: “este préstamo nace de refinanciar aquel”.
// Campos clave:
// - loanId: crédito resultante (nuevo).
// - referenceLoanId: crédito origen (anterior).
// ---------------------------------------------------------------------
export const loanRefinancingLinks = pgTable(
  "loan_refinancing_links",
  {
    id: serial("id").primaryKey(),

    // doccre -> crédito resultante (nuevo)
    loanId: integer("loan_id")
      .notNull()
      .references(() => loans.id, { onDelete: "cascade" }),

    // docref -> crédito origen (anterior)
    referenceLoanId: integer("reference_loan_id")
      .notNull()
      .references(() => loans.id, { onDelete: "restrict" }),

    payoffAmount: decimal("payoff_amount", { precision: 14, scale: 2 }),
    createdByUserId: uuid("created_by_user_id"),

    ...timestamps,
  },
  (t) => [
    uniqueIndex("uniq_loan_ref_link").on(t.loanId, t.referenceLoanId),
    index("idx_ref_link_reference_loan").on(t.referenceLoanId),
  ],
);

export const loanRefinancingLinksRelations = relations(
  loanRefinancingLinks,
  ({ one }) => ({
    refinancedLoan: one(loans, {
      fields: [loanRefinancingLinks.loanId],
      references: [loans.id],
      relationName: "refinancedLoan",
    }),
    referenceLoan: one(loans, {
      fields: [loanRefinancingLinks.referenceLoanId],
      references: [loans.id],
      relationName: "referenceLoan",
    }),
  }),
);

export type LoanRefinancingLinks = typeof loanRefinancingLinks.$inferSelect & {
  refinancedLoan?: Loans;
  referenceLoan?: Loans;
};

export type NewLoanRefinancingLinks = typeof loanRefinancingLinks.$inferInsert;

export const processRunStatusEnum = pgEnum("process_status", [
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "CANCELED",
]);

// ---------------------------------------------------------------------
// Concr33-Concr42 Process Runs
// Nota:
// Registro de ejecuciones batch (quién/cuándo/estado). Sirve para auditoría y
// para saber si “hoy ya se corrió” a nivel global. No guarda detalle por crédito.
// ---------------------------------------------------------------------
export const processRuns = pgTable(
  "process_runs",
  {
    id: serial("id").primaryKey(),
    processType: processTypeEnum("process_type").notNull(),
    accountingPeriodId: integer("accounting_period_id")
      .references(() => accountingPeriods.id, { onDelete: "restrict" })
      .notNull(),
    processDate: date("process_date").notNull(),
    executedByUserId: integer("executed_by_user_id").notNull(),
    executedAt: timestamp("executed_at", { withTimezone: false }).notNull(),
    status: processRunStatusEnum("status").notNull().default("COMPLETED"),
    note: text("note"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("uniq_process_run").on(t.processType, t.processDate),
    index("idx_process_run_type_date").on(t.processType, t.processDate),
    index("idx_process_run_period").on(t.accountingPeriodId),
  ],
);

export const processRunsRelations = relations(processRuns, ({ one, many }) => ({
  period: one(accountingPeriods, {
    fields: [processRuns.accountingPeriodId],
    references: [accountingPeriods.id],
  }),
  loanStates: many(loanProcessStates),
  entries: many(accountingEntries),
}));

export type ProcessRuns = typeof processRuns.$inferSelect & {
  period?: AccountingPeriods;
  entries?: AccountingEntries[];
};
export type NewProcessRuns = typeof processRuns.$inferInsert;

// ---------------------------------------------------------------------
// Loan Process State (idempotencia por crédito + tipo)
// Nota:
// 1 fila por (crédito, tipo de proceso). Guarda la última fecha procesada para
// evitar reprocesar el mismo crédito el mismo día. Esto reemplaza la necesidad
// de guardar "concr42" registro por registro diario.
// Campos clave: loanId, processType, lastProcessedDate.
// ---------------------------------------------------------------------
export const loanProcessStates = pgTable(
  "loan_process_states",
  {
    loanId: integer("loan_id")
      .notNull()
      .references(() => loans.id, { onDelete: "cascade" }),
    processType: processTypeEnum("process_type").notNull(),
    // La fecha “lógica” del último proceso aplicado a este crédito para ese tipo
    lastProcessedDate: date("last_processed_date").notNull(),
    // Trazabilidad
    lastProcessRunId: integer("last_process_run_id")
      .references(() => processRuns.id, { onDelete: "set null" })
      .notNull(),
    //control de fallos
    lastError: text("last_error"),
    ...timestamps,
  },
  (t) => [
    primaryKey({ columns: [t.loanId, t.processType] }),
    index("idx_loan_process_state_last_date").on(
      t.processType,
      t.lastProcessedDate,
    ),
  ],
);

export const loanProcessStatesRelations = relations(
  loanProcessStates,
  ({ one }) => ({
    loan: one(loans, {
      fields: [loanProcessStates.loanId],
      references: [loans.id],
    }),
    lastRun: one(processRuns, {
      fields: [loanProcessStates.lastProcessRunId],
      references: [processRuns.id],
    }),
  }),
);

export type LoanProcessStates = typeof loanProcessStates.$inferSelect & {
  loan?: Loans;
  lastRun?: ProcessRuns;
};
export type NewLoanProcessStates = typeof loanProcessStates.$inferInsert;

// ---------------------------------------------------------------------
// Concr63-Concr28 - Histórico cartera (aging snapshot)
// Nota (ES):
// Foto mensual de cartera por crédito y auxiliar (cuenta contable).
// Se usa para reportes históricos “as-of” (aging: corriente, 30, 60, ...).
// Clave: accountingPeriodId + loanId + glAccountId.
// ---------------------------------------------------------------------
export const portfolioAgingSnapshots = pgTable(
  "portfolio_aging_snapshots",
  {
    id: serial("id").primaryKey(),

    accountingPeriodId: integer("accounting_period_id")
      .notNull()
      .references(() => accountingPeriods.id, { onDelete: "restrict" }),
    agingProfileId: integer("aging_profile_id").references(
      () => agingProfiles.id,
      { onDelete: "restrict" },
    ),

    // fecgen / horgen / usugen (legacy)
    generatedAt: timestamp("generated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    generatedByUserId: uuid("generated_by_user_id").notNull(),

    affiliationOfficeId: integer("affiliation_office_id")
      .notNull()
      .references(() => affiliationOffices.id, { onDelete: "restrict" }),

    creditProductId: integer("credit_product_id")
      .notNull()
      .references(() => creditProducts.id, { onDelete: "restrict" }),

    glAccountId: integer("gl_account_id")
      .notNull()
      .references(() => glAccounts.id, { onDelete: "restrict" }),

    loanId: integer("loan_id")
      .notNull()
      .references(() => loans.id, { onDelete: "cascade" }),

    thirdPartyId: integer("third_party_id")
      .notNull()
      .references(() => thirdParties.id, { onDelete: "restrict" }),

    categoryCode: varchar("category_code", { length: 1 }),

    principalAmount: decimal("principal_amount", {
      precision: 14,
      scale: 2,
    }).notNull(),

    installmentValue: decimal("installment_value", {
      precision: 14,
      scale: 2,
    }).notNull(),

    repaymentMethodId: integer("repayment_method_id")
      .notNull()
      .references(() => repaymentMethods.id, { onDelete: "restrict" }),

    // edad (opcional pero útil)
    daysPastDue: integer("days_past_due").notNull().default(0),

    // buckets
    currentAmount: decimal("current_amount", {
      precision: 14,
      scale: 2,
    }).notNull(),

    totalPastDue: decimal("total_past_due", {
      precision: 14,
      scale: 2,
    }).notNull(),
    totalPortfolio: decimal("total_portfolio", {
      precision: 14,
      scale: 2,
    }).notNull(),

    ...timestamps,
  },
  (t) => [
    uniqueIndex("uniq_portfolio_aging_snapshot").on(
      t.accountingPeriodId,
      t.loanId,
      t.glAccountId,
    ),

    index("idx_portfolio_aging_period").on(t.accountingPeriodId),
    index("idx_portfolio_aging_office_period").on(
      t.affiliationOfficeId,
      t.accountingPeriodId,
    ),
    index("idx_portfolio_aging_credit_product_period").on(
      t.creditProductId,
      t.accountingPeriodId,
    ),

    // super útil para reportes por persona
    index("idx_portfolio_aging_third_period").on(
      t.thirdPartyId,
      t.accountingPeriodId,
    ),
    index("idx_portfolio_aging_loan_period").on(t.loanId, t.accountingPeriodId),
  ],
);

export const portfolioAgingSnapshotsRelations = relations(
  portfolioAgingSnapshots,
  ({ one }) => ({
    period: one(accountingPeriods, {
      fields: [portfolioAgingSnapshots.accountingPeriodId],
      references: [accountingPeriods.id],
    }),
    office: one(affiliationOffices, {
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
  }),
);

export type PortfolioAgingSnapshots =
  typeof portfolioAgingSnapshots.$inferSelect & {
    period?: AccountingPeriods;
    office?: AffiliationOffices;
    creditProduct?: CreditProducts;
    glAccount?: GlAccounts;
    loan?: Loans;
    repaymentMethod?: RepaymentMethods;
    thirdParty?: ThirdParties;
  };

export type NewPortfolioAgingSnapshots =
  typeof portfolioAgingSnapshots.$inferInsert;

export const payrollExcessStatusEnum = pgEnum("payroll_excess_status", [
  "PENDING", // P
  "APPLIED", // A
  "CANCELED", // X
]);

export const payrollExcessPayments = pgTable(
  "payroll_excess_payments",
  {
    id: serial("id").primaryKey(),

    // Concr64.tipmov -> tipos de movimiento (según tu enum global)
    processType: processTypeEnum("process_type").notNull(),

    // Concr64.numlib -> aquí lo están usando como referencia al crédito (concr08)
    loanId: integer("loan_id")
      .notNull()
      .references(() => loans.id, { onDelete: "restrict" }),

    // Concr64.nitlib (empresa/entidad pagadora). NO FK a thirdParties.
    payerTaxId: varchar("payer_tax_id", { length: 15 }),

    // Concr64.fecha
    date: date("date").notNull(),

    // Concr64.descripcion (legacy char(150))
    description: varchar("description", { length: 150 }).notNull(),

    // Concr64.valexc
    excessAmount: decimal("excess_amount", {
      precision: 14,
      scale: 2,
    }).notNull(),

    // Concr64.estado (legacy char(1))
    status: payrollExcessStatusEnum("status").notNull().default("PENDING"),

    // Concr64.usuario (viene de IAM/otro DB)
    createdByUserId: uuid("created_by_user_id").notNull(),

    ...timestamps,
  },
  (t) => [
    index("idx_payroll_excess_loan").on(t.loanId),
    index("idx_payroll_excess_date").on(t.date),
    index("idx_payroll_excess_status").on(t.status),
    index("idx_payroll_excess_payer").on(t.payerTaxId),
    index("idx_payroll_excess_type").on(t.processType),
  ],
);

export const payrollExcessPaymentsRelations = relations(
  payrollExcessPayments,
  ({ one }) => ({
    loan: one(loans, {
      fields: [payrollExcessPayments.loanId],
      references: [loans.id],
    }),
  }),
);

export type PayrollExcessPayments =
  typeof payrollExcessPayments.$inferSelect & {
    loan?: Loans;
  };

export type NewPayrollExcessPayments =
  typeof payrollExcessPayments.$inferInsert;

export const loanPaymentStatusEnum = pgEnum("loan_payment_status", [
  "PAID", // P
  "VOID", // A (anulado)
]);

// ---------------------------------------------------------------------
// Concr32 - Abonos
// Nota (ES):
// Recibos de abono aplicados a un crédito. Puede generar comprobante contable.
// Estado: PAID (P) o VOID (A).
// receiptTypeId define el tipo de recibo; de ahí se puede derivar el movementType.
// Campos clave: loanId, receiptTypeId+code, amount, status.
// ---------------------------------------------------------------------
export const loanPayments = pgTable(
  "loan_payments",
  {
    id: serial("id").primaryKey(),

    // marca char(2) -> Concr29
    receiptTypeId: integer("receipt_type_id")
      .notNull()
      .references(() => paymentReceiptTypes.id, { onDelete: "restrict" }),

    // documento char(7) (número recibo)
    code: varchar("code", { length: 7 }).notNull(),

    // tipmov char(1) (REDUNDANTE: se deriva de receiptType.movementType)
    // Si quieres auditar “como llegó” en legacy, déjalo opcional:
    movementTypeSnapshot: paymentReceiptMovementTypeEnum(
      "movement_type_snapshot",
    ),

    // fecha
    paymentDate: date("payment_date").notNull(),

    // fecela (fecha elaboración/creación del recibo)
    issuedDate: date("issued_date"),

    // numcre -> loans
    loanId: integer("loan_id")
      .notNull()
      .references(() => loans.id, { onDelete: "restrict" }),

    description: varchar("description", { length: 150 }).notNull(),

    // valor total del abono
    amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),

    // estado: P/A
    status: loanPaymentStatusEnum("status").notNull().default("PAID"),

    statusDate: date("status_date"),

    // codcop/doccon: comprobante contable generado por el abono
    accountingVoucherTypeCode: varchar("accounting_voucher_type_code", {
      length: 4,
    }),
    accountingDocumentCode: varchar("accounting_document_code", { length: 7 }),

    // libranza / nómina
    payrollReferenceNumber: varchar("payroll_reference_number", { length: 7 }),
    payrollPayerTaxId: varchar("payroll_payer_tax_id", { length: 15 }),

    // usuario (IAM externo)
    createdByUserId: uuid("created_by_user_id").notNull(),

    // desglose legacy
    cashAmount: decimal("cash_amount", { precision: 14, scale: 2 }),
    checkAmount: decimal("check_amount", { precision: 14, scale: 2 }),
    creditAmount: decimal("credit_amount", { precision: 14, scale: 2 }),
    returnedAmount: decimal("returned_amount", { precision: 14, scale: 2 }),

    note: varchar("note", { length: 255 }),

    // valmay int (lo dejo legacy hasta entenderlo 100%)
    legacyValmay: integer("legacy_valmay"),

    // auxiliar (cuando aplica por auxiliar)
    glAccountId: integer("gl_account_id").references(() => glAccounts.id, {
      onDelete: "restrict",
    }),

    // interfaz enum('N','S')
    isInterfaced: boolean("is_interfaced").notNull().default(false),

    legacySub43Mark: varchar("legacy_sub43_mark", { length: 2 }),
    legacySub43Document: varchar("legacy_sub43_document", { length: 8 }),

    ...timestamps,
  },
  (t) => [
    uniqueIndex("uniq_loan_payment_receipt").on(t.receiptTypeId, t.code),
    index("idx_loan_payment_loan_date").on(t.loanId, t.paymentDate),
    index("idx_loan_payment_status").on(t.status),
  ],
);

export const loanPaymentsRelations = relations(
  loanPayments,
  ({ one, many }) => ({
    loan: one(loans, {
      fields: [loanPayments.loanId],
      references: [loans.id],
    }),
    receiptType: one(paymentReceiptTypes, {
      fields: [loanPayments.receiptTypeId],
      references: [paymentReceiptTypes.id],
    }),
    glAccount: one(glAccounts, {
      fields: [loanPayments.glAccountId],
      references: [glAccounts.id],
    }),
    methodAllocations: many(loanPaymentMethodAllocations),
  }),
);

export type LoanPayments = typeof loanPayments.$inferSelect & {};
export type NewLoanPayments = typeof loanPayments.$inferInsert;

// ---------------------------------------------------------------------
// Concr35 - Valores por formas de pago en abonos
// Nota (ES):
// Distribuye el valor total de un abono (loan_payments.amount) en una o
// varias formas de pago (payment_tender_types). Equivalente a Concr35.
// Campos clave: loanPaymentId + collectionMethodId + lineNumber.
// ---------------------------------------------------------------------
export const loanPaymentMethodAllocations = pgTable(
  "loan_payment_method_allocations",
  {
    id: serial("id").primaryKey(),

    loanPaymentId: integer("loan_payment_id")
      .notNull()
      .references(() => loanPayments.id, { onDelete: "cascade" }),

    // Concr35.forma (FK a Concr53)
    collectionMethodId: integer("collection_method_id")
      .notNull()
      .references(() => paymentTenderTypes.id, { onDelete: "restrict" }),

    // Concr35.numero
    lineNumber: integer("line_number").notNull(),

    // Concr35.mnum (referencia: transferencia, voucher, autorización, etc.)
    tenderReference: varchar("tender_reference", { length: 50 }),

    amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),

    ...timestamps,
  },
  (t) => [
    uniqueIndex("uniq_payment_method_allocation").on(
      t.loanPaymentId,
      t.collectionMethodId,
      t.lineNumber,
    ),
    index("idx_payment_method_allocation_payment").on(t.loanPaymentId),
    index("idx_payment_method_allocation_method").on(t.collectionMethodId),
  ],
);

export const loanPaymentMethodAllocationsRelations = relations(
  loanPaymentMethodAllocations,
  ({ one }) => ({
    payment: one(loanPayments, {
      fields: [loanPaymentMethodAllocations.loanPaymentId],
      references: [loanPayments.id],
    }),
    method: one(paymentTenderTypes, {
      fields: [loanPaymentMethodAllocations.collectionMethodId],
      references: [paymentTenderTypes.id],
    }),
  }),
);

export type LoanPaymentMethodAllocations =
  typeof loanPaymentMethodAllocations.$inferSelect & {
    payment?: LoanPayments;
    method?: PaymentTenderTypes;
  };

export type NewLoanPaymentMethodAllocations =
  typeof loanPaymentMethodAllocations.$inferInsert;

// ---------------------------------------------------------------------
// Concr01 - Configuración global del módulo de créditos
// Nota:
// Parámetros generales del módulo: banderas de operación, auxiliares contables
// por defecto, firmas para documentos, topes (monto/cuotas), consecutivos y
// configuración contable (comprobante / fondo registro / cuenta bancaria).
// Campos clave: defaultCollectionMethodId, defaultRepaymentMethodId,
// defaultGuaranteeTypeId, cashGlAccountId/majorGlAccountId/excessGlAccountId,
// writeOffGlAccountId, fundRegisterGlAccountId.
// ---------------------------------------------------------------------
export const creditsSettings = pgTable("credits_settings", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 2 }).notNull().unique(),
  // Flags (antes char(1))
  controlEnabled: boolean("control_enabled").notNull().default(true),
  auditTransactionsEnabled: boolean("audit_transactions_enabled")
    .notNull()
    .default(false),
  // cnt: código/ambiente de contabilidad (si aplica como string)
  accountingSystemCode: varchar("accounting_system_code", {
    length: 2,
  }).notNull(),
  // online: contabiliza “en línea” vs proceso posterior
  postAccountingOnline: boolean("post_accounting_online")
    .notNull()
    .default(true),

  // subsi: si el módulo usa subsidio/pignoración
  subsidyEnabled: boolean("subsidy_enabled").notNull().default(false),

  // conta: si integra contabilidad
  accountingEnabled: boolean("accounting_enabled").notNull().default(true),

  // Auxiliares (glAccounts)
  cashGlAccountId: integer("cash_gl_account_id").references(
    () => glAccounts.id,
    {
      onDelete: "restrict",
    },
  ),
  majorGlAccountId: integer("major_gl_account_id").references(
    () => glAccounts.id,
    {
      onDelete: "restrict",
    },
  ),
  excessGlAccountId: integer("excess_gl_account_id").references(
    () => glAccounts.id,
    {
      onDelete: "restrict",
    },
  ),
  pledgeSubsidyGlAccountId: integer("pledge_subsidy_gl_account_id").references(
    () => glAccounts.id,
    { onDelete: "restrict" },
  ),
  writeOffGlAccountId: integer("write_off_gl_account_id").references(
    () => glAccounts.id,
    { onDelete: "restrict" },
  ),

  // Comprobante / forma de recaudo por defecto (Concr53)
  defaultCollectionMethodId: integer("default_collection_method_id")
    .notNull()
    .references(() => paymentTenderTypes.id, { onDelete: "restrict" }),

  // Centro de costo por defecto (Concr19)
  defaultCostCenterId: integer("default_cost_center_id").references(
    () => costCenters.id,
    { onDelete: "restrict" },
  ),

  // Documento tesorería (si todavía lo usan)
  treasuryDocumentNumber: varchar("treasury_document_number", { length: 13 }),

  // Firmas/cargos
  creditManagerName: varchar("credit_manager_name", { length: 50 }),
  creditManagerTitle: varchar("credit_manager_title", { length: 80 }),
  adminManagerName: varchar("admin_manager_name", { length: 50 }),
  adminManagerTitle: varchar("admin_manager_title", { length: 80 }),
  legalAdvisorName: varchar("legal_advisor_name", { length: 50 }),
  legalAdvisorTitle: varchar("legal_advisor_title", { length: 80 }),
  adminDirectorName: varchar("admin_director_name", { length: 50 }),
  adminDirectorTitle: varchar("admin_director_title", { length: 80 }),
  financeManagerName: varchar("finance_manager_name", { length: 50 }),
  financeManagerTitle: varchar("finance_manager_title", { length: 80 }),

  // Defaults del negocio
  defaultRepaymentMethodId: integer("default_repayment_method_id").references(
    () => repaymentMethods.id,
    { onDelete: "restrict" },
  ),
  defaultGuaranteeTypeId: integer("default_guarantee_type_id").references(
    () => paymentGuaranteeTypes.id,
    { onDelete: "restrict" },
  ),

  // Subsidio default (legacy)
  legacyDefaultSubsidyMark: varchar("legacy_default_subsidy_mark", {
    length: 2,
  }),

  // Licencia / topes / consecutivo
  softwareLicenseNumber: varchar("software_license_number", { length: 20 }),
  maxAmount: integer("max_amount"),
  maxInstallments: integer("max_installments"),
  defaultInsuranceValue: integer("default_insurance_value"),
  nextConsecutive: integer("next_consecutive"),

  // Fondo registro
  fundRegisterTaxId: varchar("fund_register_tax_id", { length: 17 }),
  fundRegisterFactor: decimal("fund_register_factor", {
    precision: 5,
    scale: 2,
  }),
  fundRegisterGlAccountId: integer("fund_register_gl_account_id").references(
    () => glAccounts.id,
    { onDelete: "restrict" },
  ),

  // Cuenta bancaria (cueban)
  bankAccountNumber: varchar("bank_account_number", { length: 25 }),

  ...timestamps,
});

export const creditsSettingsRelations = relations(
  creditsSettings,
  ({ one }) => ({
    cashAccount: one(glAccounts, {
      fields: [creditsSettings.cashGlAccountId],
      references: [glAccounts.id],
      relationName: "creditsSettings_cash",
    }),
    majorAccount: one(glAccounts, {
      fields: [creditsSettings.majorGlAccountId],
      references: [glAccounts.id],
      relationName: "creditsSettings_major",
    }),
    excessAccount: one(glAccounts, {
      fields: [creditsSettings.excessGlAccountId],
      references: [glAccounts.id],
      relationName: "creditsSettings_excess",
    }),
    pledgeSubsidyAccount: one(glAccounts, {
      fields: [creditsSettings.pledgeSubsidyGlAccountId],
      references: [glAccounts.id],
      relationName: "creditsSettings_pledgeSubsidy",
    }),
    writeOffAccount: one(glAccounts, {
      fields: [creditsSettings.writeOffGlAccountId],
      references: [glAccounts.id],
      relationName: "creditsSettings_writeOff",
    }),
    fundRegisterAccount: one(glAccounts, {
      fields: [creditsSettings.fundRegisterGlAccountId],
      references: [glAccounts.id],
      relationName: "creditsSettings_fundRegister",
    }),

    defaultCollectionMethod: one(paymentTenderTypes, {
      fields: [creditsSettings.defaultCollectionMethodId],
      references: [paymentTenderTypes.id],
    }),
    defaultRepaymentMethod: one(repaymentMethods, {
      fields: [creditsSettings.defaultRepaymentMethodId],
      references: [repaymentMethods.id],
    }),
    defaultGuaranteeType: one(paymentGuaranteeTypes, {
      fields: [creditsSettings.defaultGuaranteeTypeId],
      references: [paymentGuaranteeTypes.id],
    }),
    defaultCostCenter: one(costCenters, {
      fields: [creditsSettings.defaultCostCenterId],
      references: [costCenters.id],
    }),
  }),
);

export type CreditsSettings = typeof creditsSettings.$inferSelect & {
  cashAccount?: GlAccounts;
  majorAccount?: GlAccounts;
  excessAccount?: GlAccounts;
  pledgeSubsidyAccount?: GlAccounts;
  writeOffAccount?: GlAccounts;
  fundRegisterAccount?: GlAccounts;
  defaultCollectionMethod?: PaymentTenderTypes;
  defaultRepaymentMethod?: RepaymentMethods;
  defaultGuaranteeType?: PaymentGuaranteeTypes;
  defaultCostCenter?: CostCenters;
};
export type NewCreditsSettings = typeof creditsSettings.$inferInsert;

//======= NUEVO REQUERIMIENTOS =======

// ------------------------------------------------------------
// Parametrización de conceptos de facturación (FGA, cuota manejo, etc.)
// ------------------------------------------------------------
export const billingConceptTypeEnum = pgEnum("billing_concept_type", [
  "PRINCIPAL",
  "INTEREST",
  "LATE_INTEREST",

  "FEE", // cuota de manejo, estudio, etc.
  "INSURANCE", // seguro
  "GUARANTEE", // FGA u otras garantías
  "OTHER",
]);

export const billingConceptFrequencyEnum = pgEnum("billing_concept_frequency", [
  "ONE_TIME", // único (p.ej. estudio)
  "MONTHLY", // mensual
  "PER_INSTALLMENT", // por cuota
  "PER_EVENT", // por evento (p.ej. cobranza, mora, etc.)
]);

export const billingConceptFinancingModeEnum = pgEnum(
  "billing_concept_financing_mode",
  [
    "DISCOUNT_FROM_DISBURSEMENT", // se descuenta del desembolso
    "FINANCED_IN_LOAN", // se suma/financia dentro del crédito
    "BILLED_SEPARATELY", // se cobra por fuera
  ],
);

export const billingConceptCalcMethodEnum = pgEnum(
  "billing_concept_calc_method",
  [
    "FIXED_AMOUNT", // valor fijo
    "PERCENTAGE", // porcentaje sobre una base
    "TIERED", // por rangos (como seguro por rangos)
  ],
);

export const billingConceptBaseAmountEnum = pgEnum(
  "billing_concept_base_amount",
  [
    "DISBURSED_AMOUNT", // monto desembolsado
    "PRINCIPAL", // capital
    "OUTSTANDING_BALANCE", // saldo
    "INSTALLMENT_AMOUNT", // valor cuota
  ],
);

export const billingConceptRoundingModeEnum = pgEnum(
  "billing_concept_rounding_mode",
  ["NEAREST", "UP", "DOWN"],
);

// ---------------------------------------------------------------------
// Billing Concepts - Catálogo
// ---------------------------------------------------------------------
export const billingConcepts = pgTable(
  "billing_concepts",
  {
    id: serial("id").primaryKey(),

    // Ej: "FGA", "CUOTA_MANEJO", "ESTUDIO_CREDITO", "SEGURO"
    code: varchar("code", { length: 50 }).notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    isSystem: boolean("is_system").notNull().default(false),

    conceptType: billingConceptTypeEnum("concept_type").notNull(),

    // defaults (se pueden sobre-escribir en producto o en crédito)
    defaultFrequency:
      billingConceptFrequencyEnum("default_frequency").notNull(),
    defaultFinancingMode: billingConceptFinancingModeEnum(
      "default_financing_mode",
    ).notNull(),

    // auxiliar / cuenta contable por defecto
    defaultGlAccountId: integer("default_gl_account_id").references(
      () => glAccounts.id,
      { onDelete: "restrict" },
    ),

    isActive: boolean("is_active").notNull().default(true),
    description: text("description"),

    ...timestamps,
  },
  (t) => [uniqueIndex("uniq_billing_concepts_code").on(t.code)],
);

export const billingConceptsRelations = relations(
  billingConcepts,
  ({ many, one }) => ({
    rules: many(billingConceptRules),
    creditProductLinks: many(creditProductBillingConcepts),
    loanLinks: many(loanBillingConcepts),
    defaultGlAccount: one(glAccounts, {
      fields: [billingConcepts.defaultGlAccountId],
      references: [glAccounts.id],
    }),
  }),
);

export type BillingConcepts = typeof billingConcepts.$inferSelect;
export type NewBillingConcepts = typeof billingConcepts.$inferInsert;

export const billingConceptRangeMetricEnum = pgEnum(
  "billing_concept_range_metric",
  [
    "INSTALLMENT_COUNT", // # de cuotas (1-10, 11-20, etc.)
    "DISBURSED_AMOUNT", // monto desembolsado
    "PRINCIPAL", // capital
    "OUTSTANDING_BALANCE", // saldo
    "INSTALLMENT_AMOUNT", // valor de la cuota
  ],
);

// ---------------------------------------------------------------------
// Billing Concept Rules - Reglas / Rangos / Vigencias
// (con esto puedes modelar: fijo, porcentaje, o rangos tipo seguro)
// ---------------------------------------------------------------------
export const billingConceptRules = pgTable(
  "billing_concept_rules",
  {
    id: serial("id").primaryKey(),

    billingConceptId: integer("billing_concept_id")
      .notNull()
      .references(() => billingConcepts.id, { onDelete: "cascade" }),

    calcMethod: billingConceptCalcMethodEnum("calc_method").notNull(),

    // base y rate aplican para PERCENTAGE / TIERED
    baseAmount: billingConceptBaseAmountEnum("base_amount"),
    rate: decimal("rate", { precision: 12, scale: 6 }),

    // amount aplica para FIXED_AMOUNT / TIERED
    amount: decimal("amount", { precision: 14, scale: 2 }),

    rangeMetric: billingConceptRangeMetricEnum("range_metric"),

    // rangos (para TIERED)
    valueFrom: decimal("value_from", { precision: 14, scale: 2 }),
    valueTo: decimal("value_to", { precision: 14, scale: 2 }),

    // topes opcionales
    minAmount: decimal("min_amount", { precision: 14, scale: 2 }),
    maxAmount: decimal("max_amount", { precision: 14, scale: 2 }),

    roundingMode: billingConceptRoundingModeEnum("rounding_mode")
      .notNull()
      .default("NEAREST"),
    roundingDecimals: integer("rounding_decimals").notNull().default(2),

    // vigencia
    effectiveFrom: date("effective_from"),
    effectiveTo: date("effective_to"),

    // si hay varias reglas activas que podrían aplicar, gana la mayor prioridad
    priority: integer("priority").notNull().default(0),

    isActive: boolean("is_active").notNull().default(true),

    ...timestamps,
  },
  (t) => [
    index("idx_billing_concept_rules_concept").on(t.billingConceptId),
    index("idx_billing_concept_rules_active").on(
      t.billingConceptId,
      t.isActive,
    ),
    check(
      "chk_billing_concept_rules_tier_requires_metric",
      sql`${t.calcMethod} <> 'TIERED' OR ${t.rangeMetric} IS NOT NULL`,
    ),
    check(
      "chk_billing_concept_rules_range_order",
      sql`${t.valueFrom} IS NULL OR ${t.valueTo} IS NULL OR ${t.valueFrom} <= ${t.valueTo}`,
    ),
  ],
);

export const billingConceptRulesRelations = relations(
  billingConceptRules,
  ({ one }) => ({
    concept: one(billingConcepts, {
      fields: [billingConceptRules.billingConceptId],
      references: [billingConcepts.id],
    }),
  }),
);

export type BillingConceptRules = typeof billingConceptRules.$inferSelect;
export type NewBillingConceptRules = typeof billingConceptRules.$inferInsert;

// ---------------------------------------------------------------------
// Concr07 (credit_products) -> Conceptos por producto (línea de crédito)
// ---------------------------------------------------------------------
export const creditProductBillingConcepts = pgTable(
  "credit_product_billing_concepts",
  {
    id: serial("id").primaryKey(),

    creditProductId: integer("credit_product_id")
      .notNull()
      .references(() => creditProducts.id, { onDelete: "cascade" }),

    billingConceptId: integer("billing_concept_id")
      .notNull()
      .references(() => billingConcepts.id, { onDelete: "restrict" }),

    isEnabled: boolean("is_enabled").notNull().default(true),
    isMandatory: boolean("is_mandatory").notNull().default(true),

    // override por producto (si necesitas)
    overrideFrequency: billingConceptFrequencyEnum("override_frequency"),
    overrideFinancingMode: billingConceptFinancingModeEnum(
      "override_financing_mode",
    ),
    overrideGlAccountId: integer("override_gl_account_id").references(
      () => glAccounts.id,
      { onDelete: "restrict" },
    ),

    // puedes forzar una regla específica o dejar que se elija la regla activa por vigencia/rango
    overrideRuleId: integer("override_rule_id").references(
      () => billingConceptRules.id,
      { onDelete: "set null" },
    ),

    // orden sugerido (también te sirve luego para prioridad de aplicación de pagos)
    chargeOrder: integer("charge_order").notNull().default(0),

    ...timestamps,
  },
  (t) => [
    uniqueIndex("uniq_credit_product_billing_concepts").on(
      t.creditProductId,
      t.billingConceptId,
    ),
    index("idx_credit_product_billing_concepts_product").on(t.creditProductId),
  ],
);

export const creditProductBillingConceptsRelations = relations(
  creditProductBillingConcepts,
  ({ one }) => ({
    creditProduct: one(creditProducts, {
      fields: [creditProductBillingConcepts.creditProductId],
      references: [creditProducts.id],
    }),
    concept: one(billingConcepts, {
      fields: [creditProductBillingConcepts.billingConceptId],
      references: [billingConcepts.id],
    }),
    overrideRule: one(billingConceptRules, {
      fields: [creditProductBillingConcepts.overrideRuleId],
      references: [billingConceptRules.id],
    }),
    overrideGlAccount: one(glAccounts, {
      fields: [creditProductBillingConcepts.overrideGlAccountId],
      references: [glAccounts.id],
    }),
  }),
);

export type CreditProductBillingConcepts =
  typeof creditProductBillingConcepts.$inferSelect;
export type NewCreditProductBillingConcepts =
  typeof creditProductBillingConcepts.$inferInsert;

// ---------------------------------------------------------------------
// Concr08 (loans) -> Conceptos “congelados” por crédito (snapshot)
// Esto es lo que te garantiza que si cambias reglas a futuro,
// el crédito ya creado conserva su configuración/valores.
// ---------------------------------------------------------------------
export const loanBillingConcepts = pgTable(
  "loan_billing_concepts",
  {
    id: serial("id").primaryKey(),

    loanId: integer("loan_id")
      .notNull()
      .references(() => loans.id, { onDelete: "cascade" }),

    billingConceptId: integer("billing_concept_id")
      .notNull()
      .references(() => billingConcepts.id, { onDelete: "restrict" }),

    // referencia de dónde salió (opcional pero muy útil)
    sourceCreditProductConceptId: integer(
      "source_credit_product_concept_id",
    ).references(() => creditProductBillingConcepts.id, {
      onDelete: "set null",
    }),
    sourceRuleId: integer("source_rule_id").references(
      () => billingConceptRules.id,
      { onDelete: "set null" },
    ),

    // SNAPSHOT: se copian aquí los parámetros que aplicaron al momento de crear el crédito
    frequency: billingConceptFrequencyEnum("frequency").notNull(),
    financingMode: billingConceptFinancingModeEnum("financing_mode").notNull(),
    glAccountId: integer("gl_account_id").references(() => glAccounts.id, {
      onDelete: "restrict",
    }),

    calcMethod: billingConceptCalcMethodEnum("calc_method").notNull(),
    baseAmount: billingConceptBaseAmountEnum("base_amount"),
    rate: decimal("rate", { precision: 12, scale: 6 }),
    amount: decimal("amount", { precision: 14, scale: 2 }),
    valueFrom: decimal("value_from", { precision: 14, scale: 2 }),
    valueTo: decimal("value_to", { precision: 14, scale: 2 }),
    minAmount: decimal("min_amount", { precision: 14, scale: 2 }),
    maxAmount: decimal("max_amount", { precision: 14, scale: 2 }),
    roundingMode: billingConceptRoundingModeEnum("rounding_mode")
      .notNull()
      .default("NEAREST"),
    roundingDecimals: integer("rounding_decimals").notNull().default(2),

    // vigencia dentro del crédito (ej: seguro solo durante el plazo)
    startDate: date("start_date"),
    endDate: date("end_date"),

    isActive: boolean("is_active").notNull().default(true),

    ...timestamps,
  },
  (t) => [
    uniqueIndex("uniq_loan_billing_concepts").on(t.loanId, t.billingConceptId),
    index("idx_loan_billing_concepts_loan").on(t.loanId),
  ],
);

export const loanBillingConceptsRelations = relations(
  loanBillingConcepts,
  ({ one }) => ({
    loan: one(loans, {
      fields: [loanBillingConcepts.loanId],
      references: [loans.id],
    }),
    concept: one(billingConcepts, {
      fields: [loanBillingConcepts.billingConceptId],
      references: [billingConcepts.id],
    }),
    sourceRule: one(billingConceptRules, {
      fields: [loanBillingConcepts.sourceRuleId],
      references: [billingConceptRules.id],
    }),
    glAccount: one(glAccounts, {
      fields: [loanBillingConcepts.glAccountId],
      references: [glAccounts.id],
    }),
    sourceCreditProductConcept: one(creditProductBillingConcepts, {
      fields: [loanBillingConcepts.sourceCreditProductConceptId],
      references: [creditProductBillingConcepts.id],
    }),
  }),
);

export type LoanBillingConcepts = typeof loanBillingConcepts.$inferSelect;
export type NewLoanBillingConcepts = typeof loanBillingConcepts.$inferInsert;

export const lateInterestAgeBasisEnum = pgEnum("late_interest_age_basis", [
  "OLDEST_OVERDUE_INSTALLMENT", // la cuota vencida más antigua
  "EACH_INSTALLMENT", // calcula por cada cuota vencida
]);
// =====================================================================
// Reglas de interés de mora por edad de mora (días)
// Nota:
// - Permite “edad de mora mínima” (gracia) => primera regla empieza en daysFrom > 0
// - Permite escalonamiento por rangos de días (1-10, 11-30, etc.)
// - Ligado a Concr30 (credit_product_categories) para respetar categoría y rango de cuotas
// =====================================================================
export const creditProductLateInterestRules = pgTable(
  "credit_product_late_interest_rules",
  {
    id: serial("id").primaryKey(),

    creditProductCategoryId: integer("credit_product_category_id")
      .notNull()
      .references(() => creditProductCategories.id, { onDelete: "cascade" }),

    // opcional: cómo medir “edad de mora”
    ageBasis: lateInterestAgeBasisEnum("age_basis")
      .notNull()
      .default("OLDEST_OVERDUE_INSTALLMENT"),

    // rango de días de mora al que aplica la regla
    daysFrom: integer("days_from").notNull(), // ej: 1, 5, 11, 31...
    daysTo: integer("days_to"), // null = sin tope (ej: 31+)

    // tasa/factor de mora (mismo “tipo” de dato que lateFactor)
    lateFactor: decimal("late_factor", { precision: 12, scale: 9 }).notNull(),

    // vigencia (por si cambian políticas en el tiempo)
    effectiveFrom: date("effective_from"),
    effectiveTo: date("effective_to"),

    // si hay choque de reglas, gana la mayor prioridad
    priority: integer("priority").notNull().default(0),

    isActive: boolean("is_active").notNull().default(true),

    ...timestamps,
  },
  (t) => [
    index("idx_late_rules_category").on(t.creditProductCategoryId),
    index("idx_late_rules_active").on(t.creditProductCategoryId, t.isActive),

    check("chk_late_rules_days_from_min", sql`${t.daysFrom} >= 0`),
    check(
      "chk_late_rules_days_order",
      sql`${t.daysTo} IS NULL OR ${t.daysFrom} <= ${t.daysTo}`,
    ),
  ],
);

export const creditProductLateInterestRulesRelations = relations(
  creditProductLateInterestRules,
  ({ one }) => ({
    creditProductCategory: one(creditProductCategories, {
      fields: [creditProductLateInterestRules.creditProductCategoryId],
      references: [creditProductCategories.id],
    }),
  }),
);

export type CreditProductLateInterestRules =
  typeof creditProductLateInterestRules.$inferSelect & {
    creditProductCategories?: CreditProductCategories;
  };

export type NewCreditProductLateInterestRules =
  typeof creditProductLateInterestRules.$inferInsert;

// ---------------------------------------------------------------------
// Concr59 - Convenios / Pagadurías (Empresa que descuenta la libranza)
// Nota:
// Representa la entidad (empresa/pagaduría) con la que existe un convenio para
// descuento por nómina. Se usa para parametrizar ciclos de facturación por convenio.
// Campos clave:
// - legacyIdecon: PK legacy (idecon char(7)).
// - agreementCode: código del convenio (concr59.convenio).
// - startDate/endDate + statusCode/isActive: vigencia/estado del convenio.
// ---------------------------------------------------------------------
export const agreements = pgTable(
  "agreements",
  {
    id: serial("id").primaryKey(),

    // concr59.idecon (PK legacy)
    legacyIdecon: varchar("legacy_idecon", { length: 7 }).notNull(),

    // concr59.tipo
    typeCode: varchar("type_code", { length: 1 }).notNull(),

    // concr59.convenio
    agreementCode: varchar("agreement_code", { length: 20 }).notNull(),

    // concr59.nit
    nit: varchar("nit", { length: 17 }).notNull(),

    // concr59.razsoc
    businessName: varchar("business_name", { length: 80 }).notNull(),

    // concr59.direccion / telefono / codzon / repleg
    address: varchar("address", { length: 120 }),
    phone: varchar("phone", { length: 20 }),
    zoneCode: varchar("zone_code", { length: 5 }),
    legalRepresentative: varchar("legal_representative", { length: 80 }),

    // concr59.fecini / fecfin
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),

    // concr59.nota
    note: varchar("note", { length: 255 }),

    // concr59.estado / fecest
    statusCode: varchar("status_code", { length: 1 }).notNull(),
    statusDate: date("status_date"),

    // bandera operativa (además del status legacy)
    isActive: boolean("is_active").notNull().default(true),

    ...timestamps,
  },
  (t) => [
    uniqueIndex("uniq_agreements_legacy_idecon").on(t.legacyIdecon),
    uniqueIndex("uniq_agreements_agreement_code").on(t.agreementCode),
    index("idx_agreements_nit").on(t.nit),
    index("idx_agreements_status").on(t.statusCode),
    index("idx_agreements_is_active").on(t.isActive),

    check(
      "chk_agreements_dates_order",
      sql`${t.endDate} IS NULL OR ${t.startDate} <= ${t.endDate}`,
    ),
  ],
);

export const agreementsRelations = relations(agreements, ({ many }) => ({
  billingCycleProfiles: many(billingCycleProfiles),
}));

export type Agreements = typeof agreements.$inferSelect & {
  billingCycleProfiles?: BillingCycleProfiles[];
};
export type NewAgreements = typeof agreements.$inferInsert;

// =====================================================================
// Ciclos de facturación parametrizables por producto y por convenio
// =====================================================================

export const weekendPolicyEnum = pgEnum("weekend_policy", [
  "KEEP", // no mover (si cae fin de semana, se mantiene)
  "PREVIOUS_BUSINESS_DAY",
  "NEXT_BUSINESS_DAY",
]);

// ---------------------------------------------------------------------
// Billing Cycle Profiles
// Nota:
// Un perfil representa "la regla" de facturación para un producto y opcionalmente
// para un convenio (pagaduría). Si agreementId es null => default del producto.
// Ejemplo:
// - Libranza (producto) + null => 1 ciclo mensual (default)
// - Libranza + Empresa ABC => 2 ciclos (quincenal) (override)
// ---------------------------------------------------------------------
export const billingCycleProfiles = pgTable(
  "billing_cycle_profiles",
  {
    id: serial("id").primaryKey(),

    name: varchar("name", { length: 150 }).notNull(),

    creditProductId: integer("credit_product_id")
      .notNull()
      .references(() => creditProducts.id, { onDelete: "cascade" }),

    // Convenio/pagaduría. null => default del producto
    agreementId: integer("agreement_id").references(() => agreements.id, {
      onDelete: "set null",
    }),

    // # de ciclos dentro del mes (1,2,3...)
    cyclesPerMonth: integer("cycles_per_month").notNull().default(1),

    weekendPolicy: weekendPolicyEnum("weekend_policy")
      .notNull()
      .default("NEXT_BUSINESS_DAY"),

    // vigencia opcional del perfil (por cambios de política)
    effectiveFrom: date("effective_from"),
    effectiveTo: date("effective_to"),

    isActive: boolean("is_active").notNull().default(true),

    ...timestamps,
  },
  (t) => [
    index("idx_billing_cycle_profiles_product").on(t.creditProductId),
    index("idx_billing_cycle_profiles_agreement").on(t.agreementId),
    index("idx_billing_cycle_profiles_active").on(t.isActive),

    check(
      "chk_billing_cycle_profiles_cycles_per_month_min",
      sql`${t.cyclesPerMonth} >= 1`,
    ),
    check(
      "chk_billing_cycle_profiles_effective_order",
      sql`${t.effectiveTo} IS NULL OR ${t.effectiveFrom} IS NULL OR ${t.effectiveFrom} <= ${t.effectiveTo}`,
    ),
  ],
);

export const billingCycleProfilesRelations = relations(
  billingCycleProfiles,
  ({ one, many }) => ({
    creditProduct: one(creditProducts, {
      fields: [billingCycleProfiles.creditProductId],
      references: [creditProducts.id],
    }),
    agreement: one(agreements, {
      fields: [billingCycleProfiles.agreementId],
      references: [agreements.id],
    }),
    cycles: many(billingCycleProfileCycles),
  }),
);

export type BillingCycleProfiles = typeof billingCycleProfiles.$inferSelect & {
  creditProduct?: CreditProducts;
  agreement?: Agreements | null;
  cycles?: BillingCycleProfileCycles[];
};
export type NewBillingCycleProfiles = typeof billingCycleProfiles.$inferInsert;

// ---------------------------------------------------------------------
// Billing Cycle Profile Cycles
// Nota:
// Define los ciclos dentro del mes para un perfil.
// cutoffDay/runDay/expectedPayDay son días del mes (1..31).
// Ejemplo (2 ciclos):
// - ciclo 1: cutoff 8, run 9, expectedPay 15
// - ciclo 2: cutoff 23, run 24, expectedPay 30
// ---------------------------------------------------------------------
export const billingCycleProfileCycles = pgTable(
  "billing_cycle_profile_cycles",
  {
    id: serial("id").primaryKey(),

    billingCycleProfileId: integer("billing_cycle_profile_id")
      .notNull()
      .references(() => billingCycleProfiles.id, { onDelete: "cascade" }),

    // 1..N dentro del mes
    cycleInMonth: integer("cycle_in_month").notNull(),

    cutoffDay: integer("cutoff_day").notNull(), // día del mes (corte)
    runDay: integer("run_day").notNull(), // día del mes (generación)
    expectedPayDay: integer("expected_pay_day"), // opcional (día del mes esperado de pago)

    isActive: boolean("is_active").notNull().default(true),

    ...timestamps,
  },
  (t) => [
    uniqueIndex("uniq_billing_cycle_profile_cycle").on(
      t.billingCycleProfileId,
      t.cycleInMonth,
    ),
    index("idx_billing_cycle_profile_cycles_profile").on(
      t.billingCycleProfileId,
    ),

    check(
      "chk_billing_cycle_profile_cycles_cycle_in_month_min",
      sql`${t.cycleInMonth} >= 1`,
    ),

    // Validación de días (1..31)
    check(
      "chk_billing_cycle_profile_cycles_cutoff_day",
      sql`${t.cutoffDay} BETWEEN 1 AND 31`,
    ),
    check(
      "chk_billing_cycle_profile_cycles_run_day",
      sql`${t.runDay} BETWEEN 1 AND 31`,
    ),
    check(
      "chk_billing_cycle_profile_cycles_expected_pay_day",
      sql`${t.expectedPayDay} IS NULL OR ${t.expectedPayDay} BETWEEN 1 AND 31`,
    ),
  ],
);

export const billingCycleProfileCyclesRelations = relations(
  billingCycleProfileCycles,
  ({ one }) => ({
    profile: one(billingCycleProfiles, {
      fields: [billingCycleProfileCycles.billingCycleProfileId],
      references: [billingCycleProfiles.id],
    }),
  }),
);

export type BillingCycleProfileCycles =
  typeof billingCycleProfileCycles.$inferSelect & {
    profile?: BillingCycleProfiles;
  };
export type NewBillingCycleProfileCycles =
  typeof billingCycleProfileCycles.$inferInsert;

export const riskDecisionEnum = pgEnum("risk_decision", ["PASS", "FAIL"]);
// ---------------------------------------------------------------------
// Historial de evaluaciones de riesgo por solicitud
// Guarda request/response completo (jsonb) y deja trazabilidad.
// ---------------------------------------------------------------------
export const loanApplicationRiskAssessments = pgTable(
  "loan_application_risk_assessments",
  {
    id: serial("id").primaryKey(),

    loanApplicationId: integer("loan_application_id")
      .notNull()
      .references(() => loanApplications.id, { onDelete: "cascade" }),

    // trazabilidad
    executedByUserId: integer("executed_by_user_id").notNull(),
    executedAt: timestamp("executed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    // resultado normalizado
    decision: riskDecisionEnum("decision"),
    score: decimal("score", { precision: 12, scale: 5 }),

    // evidencia completa
    requestPayload: jsonb("request_payload"),
    responsePayload: jsonb("response_payload"),

    // error si falló integración
    errorMessage: varchar("error_message", { length: 255 }),

    // nota manual (ej: "se aprobó por excepción")
    note: varchar("note", { length: 255 }),

    ...timestamps,
  },
  (t) => [
    index("idx_risk_assessments_application").on(t.loanApplicationId),
    index("idx_risk_assessments_executed_at").on(t.executedAt),
  ],
);

export const loanApplicationRiskAssessmentsRelations = relations(
  loanApplicationRiskAssessments,
  ({ one }) => ({
    application: one(loanApplications, {
      fields: [loanApplicationRiskAssessments.loanApplicationId],
      references: [loanApplications.id],
    }),
  }),
);

export type LoanApplicationRiskAssessments =
  typeof loanApplicationRiskAssessments.$inferSelect & {
    loanApplications?: LoanApplications;
  };

export type NewLoanApplicationRiskAssessments =
  typeof loanApplicationRiskAssessments.$inferInsert;

// ---------------------------------------------------------------------
// Caneles de creacion de creditos
// ---------------------------------------------------------------------
export const channels = pgTable(
  "channels",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 30 }).notNull(), // WEB, MOBILE, API, BACKOFFICE, BATCH...
    name: varchar("name", { length: 100 }).notNull(),
    description: varchar("description", { length: 255 }),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("uniq_channels_code").on(t.code),
    index("idx_channels_active").on(t.isActive),
  ],
);

export const channelsRelations = relations(channels, ({ many }) => ({
  applications: many(loanApplications),
}));

export type Channels = typeof channels.$inferSelect & {
  loanApplications?: LoanApplications[];
};
export type NewChannels = typeof channels.$inferInsert;

// ---------------------------------------------------------------------
// Historial de estados (trazabilidad del ciclo)
// ---------------------------------------------------------------------
export const loanApplicationStatusHistory = pgTable(
  "loan_application_status_history",
  {
    id: serial("id").primaryKey(),

    loanApplicationId: integer("loan_application_id")
      .notNull()
      .references(() => loanApplications.id, { onDelete: "cascade" }),

    fromStatus: loanApplicationStatusEnum("from_status"),
    toStatus: loanApplicationStatusEnum("to_status").notNull(),

    changedAt: timestamp("changed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    // quién cambió el estado (nullable si fue job/automatización)
    changedByUserId: uuid("changed_by_user_id").notNull(),

    note: varchar("note", { length: 255 }),

    metadata: jsonb("metadata"),

    ...timestamps,
  },
  (t) => [
    index("idx_loan_app_status_hist_app").on(t.loanApplicationId),
    index("idx_loan_app_status_hist_changed_at").on(t.changedAt),
  ],
);

export const loanApplicationStatusHistoryRelations = relations(
  loanApplicationStatusHistory,
  ({ one }) => ({
    application: one(loanApplications, {
      fields: [loanApplicationStatusHistory.loanApplicationId],
      references: [loanApplications.id],
    }),
  }),
);

export type LoanApplicationStatusHistory =
  typeof loanApplicationStatusHistory.$inferSelect & {
    loanApplications?: LoanApplications;
  };
export type NewLoanApplicationStatusHistory =
  typeof loanApplicationStatusHistory.$inferInsert;

// ---------------------------------------------------------------------
// Eventos / Integraciones (trazabilidad técnica + payloads)
// ---------------------------------------------------------------------
export const loanApplicationEvents = pgTable(
  "loan_application_events",
  {
    id: serial("id").primaryKey(),

    loanApplicationId: integer("loan_application_id")
      .notNull()
      .references(() => loanApplications.id, { onDelete: "cascade" }),

    eventKey: varchar("event_key", { length: 60 }).notNull(), // ej: RISK_CHECK, DATA_CREDITO, SAP_POSTING

    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    actorUserId: uuid("actor_user_id"),

    correlationId: varchar("correlation_id", { length: 100 }),

    // ✅ evidencia HTTP (opcional)
    httpMethod: varchar("http_method", { length: 10 }), // GET/POST/PUT...
    endpoint: varchar("endpoint", { length: 200 }), // guarda ruta "plantilla": /risk/check, no /risk/check/123
    httpStatus: integer("http_status"),
    durationMs: integer("duration_ms"),

    // payloads
    requestPayload: jsonb("request_payload"),
    responsePayload: jsonb("response_payload"),
    metadata: jsonb("metadata"),

    eventStatus: varchar("event_status", { length: 15 })
      .notNull()
      .default("OK"), // OK/ERROR/PENDING
    message: varchar("message", { length: 255 }),

    ...timestamps,
  },
  (t) => [
    index("idx_loan_app_events_app").on(t.loanApplicationId),
    index("idx_loan_app_events_occurred_at").on(t.occurredAt),
    index("idx_loan_app_events_key").on(t.eventKey),
    index("idx_loan_app_events_status").on(t.eventStatus),
  ],
);

export const loanApplicationEventsRelations = relations(
  loanApplicationEvents,
  ({ one }) => ({
    application: one(loanApplications, {
      fields: [loanApplicationEvents.loanApplicationId],
      references: [loanApplications.id],
    }),
  }),
);

export type LoanApplicationEvents =
  typeof loanApplicationEvents.$inferSelect & {
    loanApplications?: LoanApplications;
  };
export type NewLoanApplicationEvents =
  typeof loanApplicationEvents.$inferInsert;

// ---------------------------------------------------------------------
// Políticas de refinanciación / consolidación por producto (concr07)
// Nota (ES):
// Permite parametrizar reglas: si se permite, límites, elegibilidad, etc.
// ---------------------------------------------------------------------
export const creditProductRefinancePolicies = pgTable(
  "credit_product_refinance_policies",
  {
    id: serial("id").primaryKey(),

    creditProductId: integer("credit_product_id")
      .notNull()
      .references(() => creditProducts.id, { onDelete: "cascade" }),

    allowRefinance: boolean("allow_refinance").notNull().default(false),
    allowConsolidation: boolean("allow_consolidation").notNull().default(false),

    // límites / elegibilidad
    maxLoansToConsolidate: integer("max_loans_to_consolidate")
      .notNull()
      .default(1),
    minLoanAgeDays: integer("min_loan_age_days").notNull().default(0),
    maxDaysPastDue: integer("max_days_past_due").notNull().default(99999),
    minPaidInstallments: integer("min_paid_installments").notNull().default(0),
    maxRefinanceCount: integer("max_refinance_count").notNull().default(99),

    // tratamiento (si quieres dejarlo preparado)
    capitalizeArrears: boolean("capitalize_arrears").notNull().default(false),

    // control
    requireApproval: boolean("require_approval").notNull().default(false),
    allowOverride: boolean("allow_override").notNull().default(true),

    isActive: boolean("is_active").notNull().default(true),

    ...timestamps,
  },
  (t) => [
    uniqueIndex("uniq_refi_policy_product").on(t.creditProductId),
    index("idx_refi_policy_active").on(t.isActive),

    check(
      "chk_refi_policy_max_loans_min",
      sql`${t.maxLoansToConsolidate} >= 1`,
    ),
    check("chk_refi_policy_min_age_min", sql`${t.minLoanAgeDays} >= 0`),
    check("chk_refi_policy_max_dpd_min", sql`${t.maxDaysPastDue} >= 0`),
    check("chk_refi_policy_min_paid_min", sql`${t.minPaidInstallments} >= 0`),
    check("chk_refi_policy_max_refi_min", sql`${t.maxRefinanceCount} >= 0`),
  ],
);

export const creditProductRefinancePoliciesRelations = relations(
  creditProductRefinancePolicies,
  ({ one }) => ({
    creditProduct: one(creditProducts, {
      fields: [creditProductRefinancePolicies.creditProductId],
      references: [creditProducts.id],
    }),
  }),
);

export type CreditProductRefinancePolicies =
  typeof creditProductRefinancePolicies.$inferSelect;

export type NewCreditProductRefinancePolicies =
  typeof creditProductRefinancePolicies.$inferInsert;

export const agingProfiles = pgTable(
  "aging_profiles",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 150 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    effectiveFrom: date("effective_from"),
    effectiveTo: date("effective_to"),
    note: varchar("note", { length: 255 }),
    ...timestamps,
  },
  (t) => [
    index("idx_aging_profiles_active").on(t.isActive),
    check(
      "chk_aging_profiles_effective_order",
      sql`${t.effectiveTo} IS NULL OR ${t.effectiveFrom} IS NULL OR ${t.effectiveFrom} <= ${t.effectiveTo}`,
    ),
  ],
);

export type AgingProfiles = typeof agingProfiles.$inferSelect;
export type NewAgingProfiles = typeof agingProfiles.$inferInsert;

export const agingBuckets = pgTable(
  "aging_buckets",
  {
    id: serial("id").primaryKey(),

    agingProfileId: integer("aging_profile_id")
      .notNull()
      .references(() => agingProfiles.id, { onDelete: "cascade" }),

    // orden en reportes
    sortOrder: integer("sort_order").notNull().default(0),

    name: varchar("name", { length: 60 }).notNull(), // ej: "Corriente", "1-30", "31-60"
    daysFrom: integer("days_from").notNull().default(0),
    daysTo: integer("days_to"), // null = abierto (ej: 360+)

    // % provisión para ese bucket
    provisionRate: decimal("provision_rate", { precision: 12, scale: 6 }),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("uniq_aging_bucket_profile_order").on(
      t.agingProfileId,
      t.sortOrder,
    ),
    index("idx_aging_buckets_profile").on(t.agingProfileId),
    check("chk_aging_bucket_days_from_min", sql`${t.daysFrom} >= 0`),
    check(
      "chk_aging_bucket_days_order",
      sql`${t.daysTo} IS NULL OR ${t.daysFrom} <= ${t.daysTo}`,
    ),
  ],
);

export type AgingBuckets = typeof agingBuckets.$inferSelect;
export type NewAgingBuckets = typeof agingBuckets.$inferInsert;

// ---------------------------------------------------------------------
// portfolio_provision_snapshots (cabecera)
// portfolio_provision_snapshots: cabecera del cálculo mensual de provisiones
//  para un periodo contable y un agingProfile (versión de edades/buckets).
//   Guarda totales y el DELTA contable (lo que se debe contabilizar ese mes).
// ---------------------------------------------------------------------
export const portfolioProvisionSnapshots = pgTable(
  "portfolio_provision_snapshots",
  {
    id: serial("id").primaryKey(),

    accountingPeriodId: integer("accounting_period_id")
      .notNull()
      .references(() => accountingPeriods.id, { onDelete: "restrict" }),

    // ✅ versión de buckets usada en el cálculo
    agingProfileId: integer("aging_profile_id")
      .notNull()
      .references(() => agingProfiles.id, { onDelete: "restrict" }),

    generatedAt: timestamp("generated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    generatedByUserId: uuid("generated_by_user_id").notNull(),

    // Totales del cálculo del mes (as-of cierre)
    totalBaseAmount: decimal("total_base_amount", {
      precision: 14,
      scale: 2,
    }).notNull(),
    totalRequiredProvision: decimal("total_required_provision", {
      precision: 14,
      scale: 2,
    }).notNull(),

    previousProvisionBalance: decimal("previous_provision_balance", {
      precision: 14,
      scale: 2,
    })
      .notNull()
      .default("0"),

    deltaToPost: decimal("delta_to_post", {
      precision: 14,
      scale: 2,
    }).notNull(),

    note: varchar("note", { length: 255 }),
    metadata: jsonb("metadata"),

    ...timestamps,
  },
  (t) => [
    // 1 snapshot por periodo + profile (si quieres permitir varios, quita este unique)
    uniqueIndex("uniq_provision_snapshot_period_profile").on(
      t.accountingPeriodId,
      t.agingProfileId,
    ),

    index("idx_provision_snapshot_period").on(t.accountingPeriodId),
    index("idx_provision_snapshot_profile").on(t.agingProfileId),
  ],
);

export const portfolioProvisionSnapshotsRelations = relations(
  portfolioProvisionSnapshots,
  ({ one, many }) => ({
    period: one(accountingPeriods, {
      fields: [portfolioProvisionSnapshots.accountingPeriodId],
      references: [accountingPeriods.id],
    }),
    agingProfile: one(agingProfiles, {
      fields: [portfolioProvisionSnapshots.agingProfileId],
      references: [agingProfiles.id],
    }),
    details: many(portfolioProvisionSnapshotDetails),
  }),
);

export type PortfolioProvisionSnapshots =
  typeof portfolioProvisionSnapshots.$inferSelect & {
    period?: AccountingPeriods;
    agingProfile?: AgingProfiles;
    details?: PortfolioProvisionSnapshotDetails[];
  };

export type NewPortfolioProvisionSnapshots =
  typeof portfolioProvisionSnapshots.$inferInsert;

// ---------------------------------------------------------------------
// portfolio_provision_snapshot_details (detalle)
//detalle por línea de cartera (aging snapshot)
//   y por bucket. NO duplica dimensiones (producto/auxiliar/tercero/loan/etc) porque
//   esas ya están en portfolio_aging_snapshots. El detalle referencia agingSnapshotId.
// ---------------------------------------------------------------------
export const portfolioProvisionSnapshotDetails = pgTable(
  "portfolio_provision_snapshot_details",
  {
    id: serial("id").primaryKey(),

    provisionSnapshotId: integer("provision_snapshot_id")
      .notNull()
      .references(() => portfolioProvisionSnapshots.id, {
        onDelete: "cascade",
      }),

    // ✅ referencia a la fila del cierre de cartera (ya contiene producto/auxiliar/loan/tercero/etc)
    agingSnapshotId: integer("aging_snapshot_id")
      .notNull()
      .references(() => portfolioAgingSnapshots.id, { onDelete: "cascade" }),

    // ✅ bucket (edad) usado en esa línea
    agingBucketId: integer("aging_bucket_id")
      .notNull()
      .references(() => agingBuckets.id, { onDelete: "restrict" }),

    // base para esa línea y bucket (monto de cartera que cae en ese bucket)
    baseAmount: decimal("base_amount", { precision: 14, scale: 2 }).notNull(),

    // snapshot del % aplicado (copiado al cierre para auditoría, no depende del bucket actual)
    provisionRate: decimal("provision_rate", { precision: 12, scale: 6 }),

    // provisión calculada para esa línea y bucket
    provisionAmount: decimal("provision_amount", {
      precision: 14,
      scale: 2,
    }).notNull(),

    ...timestamps,
  },
  (t) => [
    uniqueIndex("uniq_provision_detail_line_bucket").on(
      t.provisionSnapshotId,
      t.agingSnapshotId,
      t.agingBucketId,
    ),
    index("idx_provision_detail_snapshot").on(t.provisionSnapshotId),
    index("idx_provision_detail_aging_snapshot").on(t.agingSnapshotId),
    index("idx_provision_detail_bucket").on(t.agingBucketId),

    check("chk_provision_detail_base_nonneg", sql`${t.baseAmount} >= 0`),
    check("chk_provision_detail_amount_nonneg", sql`${t.provisionAmount} >= 0`),
  ],
);

export const portfolioProvisionSnapshotDetailsRelations = relations(
  portfolioProvisionSnapshotDetails,
  ({ one }) => ({
    snapshot: one(portfolioProvisionSnapshots, {
      fields: [portfolioProvisionSnapshotDetails.provisionSnapshotId],
      references: [portfolioProvisionSnapshots.id],
    }),
    agingSnapshot: one(portfolioAgingSnapshots, {
      fields: [portfolioProvisionSnapshotDetails.agingSnapshotId],
      references: [portfolioAgingSnapshots.id],
    }),
    bucket: one(agingBuckets, {
      fields: [portfolioProvisionSnapshotDetails.agingBucketId],
      references: [agingBuckets.id],
    }),
  }),
);

export type PortfolioProvisionSnapshotDetails =
  typeof portfolioProvisionSnapshotDetails.$inferSelect & {
    snapshot?: PortfolioProvisionSnapshots;
    agingSnapshot?: PortfolioAgingSnapshots;
    bucket?: AgingBuckets;
  };

export type NewPortfolioProvisionSnapshotDetails =
  typeof portfolioProvisionSnapshotDetails.$inferInsert;

/**
 * ---------------------------------------------------------------------
 * PAYMENT ALLOCATION (Prelación / orden de imputación)
 * ---------------------------------------------------------------------
 * NOTA (ES):
 * - payment_allocation_policies: define una modalidad (NORMAL, PAGO_A_CAPITAL, etc.)
 * - payment_allocation_policy_rules: define el orden (priority) y cómo imputar por concepto.
 *   Cada regla apunta a billingConceptId (incluye SYSTEM y CUSTOM).
 * ---------------------------------------------------------------------
 */

export const overpaymentHandlingEnum = pgEnum("overpayment_handling", [
  "EXCESS_BALANCE", // saldo a favor / excedente
  "APPLY_TO_PRINCIPAL",
  "APPLY_TO_FUTURE_INSTALLMENTS",
]);

export const allocationScopeEnum = pgEnum("allocation_scope", [
  "ONLY_PAST_DUE", // solo vencido
  "PAST_DUE_FIRST", // vencido primero, luego vigente si sobra
  "CURRENT_ALLOWED", // permite vigente (prepago) directamente
]);

export const orderWithinEnum = pgEnum("allocation_order_within", [
  "DUE_DATE_ASC", // más antiguo primero
  "INSTALLMENT_ASC", // cuota # menor primero
]);

export const paymentAllocationPolicies = pgTable(
  "payment_allocation_policies",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 40 }).notNull(), // ej: NORMAL, CAPITAL_ONLY
    name: varchar("name", { length: 120 }).notNull(),

    overpaymentHandling: overpaymentHandlingEnum("overpayment_handling")
      .notNull()
      .default("EXCESS_BALANCE"),

    isActive: boolean("is_active").notNull().default(true),
    note: varchar("note", { length: 255 }),

    ...timestamps,
  },
  (t) => [
    uniqueIndex("uniq_payment_allocation_policies_code").on(t.code),
    index("idx_payment_allocation_policies_active").on(t.isActive),
  ],
);

export const paymentAllocationPoliciesRelations = relations(
  paymentAllocationPolicies,
  ({ many }) => ({
    rules: many(paymentAllocationPolicyRules),
  }),
);

export type PaymentAllocationPolicies =
  typeof paymentAllocationPolicies.$inferSelect & {
    rules?: PaymentAllocationPolicyRules[];
  };

export type NewPaymentAllocationPolicies =
  typeof paymentAllocationPolicies.$inferInsert;

export const paymentAllocationPolicyRules = pgTable(
  "payment_allocation_policy_rules",
  {
    id: serial("id").primaryKey(),

    policyId: integer("policy_id")
      .notNull()
      .references(() => paymentAllocationPolicies.id, { onDelete: "cascade" }),

    // prelación
    priority: integer("priority").notNull(),

    // destino de imputación (SYSTEM o CUSTOM)
    billingConceptId: integer("billing_concept_id")
      .notNull()
      .references(() => billingConcepts.id, { onDelete: "restrict" }),

    scope: allocationScopeEnum("scope").notNull().default("PAST_DUE_FIRST"),
    orderWithin: orderWithinEnum("order_within")
      .notNull()
      .default("DUE_DATE_ASC"),

    isActive: boolean("is_active").notNull().default(true),
    note: varchar("note", { length: 255 }),

    ...timestamps,
  },
  (t) => [
    uniqueIndex("uniq_payment_alloc_rule_order").on(t.policyId, t.priority),
    index("idx_payment_alloc_rules_policy").on(t.policyId),
    index("idx_payment_alloc_rules_concept").on(t.billingConceptId),

    check("chk_payment_alloc_rule_priority_min", sql`${t.priority} >= 1`),
  ],
);

export const paymentAllocationPolicyRulesRelations = relations(
  paymentAllocationPolicyRules,
  ({ one }) => ({
    policy: one(paymentAllocationPolicies, {
      fields: [paymentAllocationPolicyRules.policyId],
      references: [paymentAllocationPolicies.id],
    }),
    concept: one(billingConcepts, {
      fields: [paymentAllocationPolicyRules.billingConceptId],
      references: [billingConcepts.id],
    }),
  }),
);

export type PaymentAllocationPolicyRules =
  typeof paymentAllocationPolicyRules.$inferSelect & {
    policy?: PaymentAllocationPolicies;
    concept?: BillingConcepts;
  };

export type NewPaymentAllocationPolicyRules =
  typeof paymentAllocationPolicyRules.$inferInsert;
