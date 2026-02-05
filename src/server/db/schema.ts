// ---------------------------------------------------------------------
// schema.ts - Definiciones de tablas y enums de Drizzle ORM
// ---------------------------------------------------------------------
// Este archivo contiene solo las definiciones de tablas (pgTable) y enums (pgEnum).
// Las relaciones están en relations.ts y los tipos en types.ts.
// ---------------------------------------------------------------------

import { sql } from 'drizzle-orm';
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
} from 'drizzle-orm/pg-core';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const processTypeEnum = pgEnum('process_type', [
  'CREDIT',
  'RECEIPT',
  'PLEDGE',
  'PAYROLL',
  'INTEREST',
  'DEPOSIT',
  'OTHER',
  'INSURANCE',
  'LATE_INTEREST',
]);

// ---------------------------------------------------------------------
// Ciudades
// Nota:
// Catálogo de ciudades
// Campo clave:
// - code: codigo de la ciudad.
// - name: nombre/descripcion de la ciudad.
// ---------------------------------------------------------------------
export const cities = pgTable(
  'cities',
  {
    id: serial('id').primaryKey(),
    code: varchar('code', { length: 5 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex('uniq_cities_code').on(t.code)]
);

// ---------------------------------------------------------------------
// Tipos de identificacion
// Nota:
// Catálogo de tipos de identificacion.
// Campo clave:
// - code: codigo del documento.
// - name: nombre/descripcion del documento.
// ---------------------------------------------------------------------
export const identificationTypes = pgTable(
  'identification_types',
  {
    id: serial('id').primaryKey(),
    code: varchar('code', { length: 5 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex('uniq_identification_types_name').on(t.name)]
);

// ---------------------------------------------------------------------
// Concr43 - Tipos de documentos requeridos en solicitudes
// Nota:
// Catálogo de documentos que pueden exigirse en una solicitud de crédito.
// Campo clave:
// - name: nombre/descripcion del documento.
// ---------------------------------------------------------------------
export const documentTypes = pgTable(
  'document_types',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex('uniq_document_types_name').on(t.name)]
);

// ---------------------------------------------------------------------
// Concr14 - Motivos de rechazo
// Nota:
// Catálogo de motivos por los cuales una solicitud de crédito puede ser rechazada.
// Campo clave:
// - name: descripción del motivo de rechazo.
// ---------------------------------------------------------------------
export const rejectionReasons = pgTable(
  'rejection_reasons',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex('uniq_rejection_reasons_name').on(t.name)]
);

// ---------------------------------------------------------------------
// Concr15 - Formas de pago (del crédito)
// Nota:
// Define el mecanismo por el cual se recauda/paga el crédito (no es el medio del abono T/C/E).
// Ejemplos: LIBRANZA, PIGNORACIÓN DE SUBSIDIO.
// Campo clave:
// - name: nombre del mecanismo de recaudo del crédito.
// ---------------------------------------------------------------------
export const repaymentMethods = pgTable(
  'repayment_methods',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex('uniq_repayment_methods_name').on(t.name)]
);

// ---------------------------------------------------------------------
// Concr11 - Garantías de pago
// Nota:
// Catálogo de garantías/respaldo del crédito (soporte legal o documental).
// Ejemplos: PAGARÉ, AUTORIZACIÓN DE DESCUENTO POR NÓMINA.
// Campo clave:
// - name: nombre de la garantía.
// ---------------------------------------------------------------------
export const paymentGuaranteeTypes = pgTable(
  'payment_guarantee_types',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex('uniq_payment_guarantee_types_name').on(t.name)]
);

// ---------------------------------------------------------------------
// Concr13 - Periodicidad de pagos
// Nota:
// Define cada cuánto se paga el crédito (frecuencia de recaudo).
// Campos clave:
// - name: nombre de la periodicidad (Ej: Mensual, Quincenal).
// - dayCount: número de días del periodo (base de cálculo / programación).
// ---------------------------------------------------------------------
export const paymentFrequencies = pgTable(
  'payment_frequencies',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    // numdia
    daysInterval: integer('days_interval').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex('uniq_payment_frequencies_name').on(t.name)]
);

// ---------------------------------------------------------------------
// Concr56 - Tipos de inversión
// Nota:
// Catálogo del destino/tipo de inversión declarado en la solicitud de crédito.
// Campo clave:
// - name: nombre del tipo de inversión (ej: Educación, Vivienda, Libre inversión, etc).
// ---------------------------------------------------------------------
export const investmentTypes = pgTable(
  'investment_types',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex('uniq_investment_types_name').on(t.name)]
);

// Tipo de pago (tesorería) aplicado a abonos: Transferencia / Cheque / Efectivo
export const paymentTenderTypeEnum = pgEnum('payment_tender_type', ['TRANSFER', 'CHECK', 'CASH']);

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
  'payment_tender_types',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    type: paymentTenderTypeEnum('type').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [
    // Solo debería existir 1 fila por cada tipo
    uniqueIndex('uniq_payment_tender_types_type').on(t.type),
  ]
);

// ---------------------------------------------------------------------
// Concr61 - Bancos
// Nota:
// Se usa para registrar el banco de desembolso de una solicitud de crédito (Concr39).
// Campos clave:
// - name: nombre del banco.
// - asobancariaCode: código bancario (Asobancaria) usado para validaciones e integraciones.
// ---------------------------------------------------------------------
export const banks = pgTable(
  'banks',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 80 }).notNull(),
    asobancariaCode: varchar('asobancaria_code', { length: 5 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex('uniq_banks_asobancaria_code').on(t.asobancariaCode)]
);

export const thirdPartySettingEnum = pgEnum('third_party_setting', [
  'YES',
  'NO',
  'WITHHOLDING', // Retención
]);

export const accountDetailTypeEnum = pgEnum('account_detail_type', [
  'RECEIVABLE', // Cobrar
  'PAYABLE', // Pagar
  'NONE', // No aplica
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
  'gl_accounts',
  {
    id: serial('id').primaryKey(),
    code: varchar('code', { length: 13 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    thirdPartySetting: thirdPartySettingEnum('third_party_setting').notNull().default('NO'),
    requiresCostCenter: boolean('requires_cost_center').notNull().default(false),
    detailType: accountDetailTypeEnum('detail_type').notNull().default('NONE'),
    isBank: boolean('is_bank').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('uniq_gl_accounts_code').on(t.code),
    index('idx_gl_accounts_is_bank').on(t.isBank),
    index('idx_gl_accounts_is_active').on(t.isActive),
  ]
);

// ---------------------------------------------------------------------
// Concr19 - Centros de costos
// Nota:
// Catálogo de centros de costo usados en contabilización y distribuciones.
// Campos clave:
// - code: código del centro de costo.
// - name: nombre del centro de costo.
// ---------------------------------------------------------------------
export const costCenters = pgTable(
  'cost_centers',
  {
    id: serial('id').primaryKey(),
    code: varchar('code', { length: 20 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex('uniq_cost_centers_code').on(t.code)]
);

// ---------------------------------------------------------------------
// Concr05 - Distribuciones contables (tipos de distribución)
// Nota (ES):
// Define un "tipo de distribución" contable. Se usa para parametrizar cómo se reparte un valor
// entre auxiliares/centros (ver Concr06) y también como referencia en reglas (crédito/seguros).
// Campo clave:
// - name: nombre de la distribución.
// ---------------------------------------------------------------------
export const accountingDistributions = pgTable(
  'accounting_distributions',
  {
    id: serial('id').primaryKey(),

    name: varchar('name', { length: 40 }).notNull(),

    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex('uniq_accounting_distributions_name').on(t.name)]
);

// Naturaleza contable: Débito / Crédito
export const entryNatureEnum = pgEnum('entry_nature', ['DEBIT', 'CREDIT']);

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
  'accounting_distribution_lines',
  {
    id: serial('id').primaryKey(),
    accountingDistributionId: integer('accounting_distribution_id')
      .notNull()
      .references(() => accountingDistributions.id, { onDelete: 'cascade' }),
    glAccountId: integer('gl_account_id')
      .notNull()
      .references(() => glAccounts.id, { onDelete: 'restrict' }),
    costCenterId: integer('cost_center_id')
      .notNull()
      .references(() => costCenters.id, { onDelete: 'restrict' }),
    percentage: decimal('percentage', { precision: 5, scale: 2 }).notNull(),
    nature: entryNatureEnum('nature').notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('uniq_distribution_line').on(
      t.accountingDistributionId,
      t.glAccountId,
      t.costCenterId
    ),
  ]
);

export const paymentReceiptMovementTypeEnum = pgEnum('payment_receipt_movement_type', [
  'RECEIPT', // 2 - RECIBOS
  'PLEDGE', // 3 - PIGNORACION
  'PAYROLL', // 4 - LIBRANZAS
  'DEPOSIT', // 6 - CONSIGNACION
  'OTHER', // 7 - OTROS
]);

// ---------------------------------------------------------------------
// Concr29 - Tipos de recibos de abonos
// Nota:
// Catálogo de tipos de recibo/abono. Define el flujo contable y reglas del registro del pago.
// Campos clave:
// - movementType: clasifica el tipo (recibo, pignoración, libranza, consignación, etc.).
// - name: nombre visible del tipo de recibo.
// ---------------------------------------------------------------------
export const paymentReceiptTypes = pgTable(
  'payment_receipt_types',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    movementType: paymentReceiptMovementTypeEnum('movement_type').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('uniq_payment_receipt_types_name').on(t.name),
    // si prefieres permitir nombres repetidos por tipo:
    // uniqueIndex("uniq_payment_receipt_types_type_name").on(t.movementType, t.name),
  ]
);

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
  'user_payment_receipt_types',
  {
    id: serial('id').primaryKey(),

    // IAM externo: usa UUID (o cambia a varchar si tu IAM no es uuid)
    userId: uuid('user_id').notNull(),

    paymentReceiptTypeId: integer('payment_receipt_type_id')
      .notNull()
      .references(() => paymentReceiptTypes.id, { onDelete: 'cascade' }),

    isDefault: boolean('is_default').notNull().default(false),

    ...timestamps,
  },
  (t) => [uniqueIndex('uniq_user_receipt_type').on(t.userId, t.paymentReceiptTypeId)]
);

// ---------------------------------------------------------------------
// Concr46 - Oficinas de afiliación
// Nota (ES):
// Catálogo de oficinas/puntos donde se radican solicitudes y se gestionan créditos.
// Campo clave:
// - name: nombre de la oficina.
// - costCenterId: centro de costo asociado (si aplica).
// ---------------------------------------------------------------------
export const affiliationOffices = pgTable(
  'affiliation_offices',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    address: varchar('address', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 20 }),
    representativeName: varchar('representative_name', {
      length: 40,
    }).notNull(),
    email: varchar('email', { length: 30 }),
    costCenterId: integer('cost_center_id').references(() => costCenters.id, {
      onDelete: 'set null',
    }),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex('uniq_affiliation_offices_name').on(t.name)]
);

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
  'accounting_periods',
  {
    id: serial('id').primaryKey(),
    year: integer('year').notNull(),
    month: integer('month').notNull(), // 1..12
    isClosed: boolean('is_closed').notNull().default(false),
    closedAt: timestamp('closed_at', { withTimezone: false }),
    closedByUserId: uuid('closed_by_user_id'), // IAM externo (o varchar si no es uuid)
    ...timestamps,
  },
  (t) => [uniqueIndex('uniq_accounting_period_year_month').on(t.year, t.month)]
);

// ---------------------------------------------------------------------
// Concr47 - Fondos de créditos
// Nota:
// Define los fondos/bolsas de donde se asignan recursos para créditos y su control.
// Campos clave:
// - name: nombre del fondo.
// - isControlled: indica si el fondo controla cupos/presupuesto.
// ---------------------------------------------------------------------
export const creditFunds = pgTable(
  'credit_funds',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 30 }).notNull(),
    // Concr47.control (si controla cupo/presupuesto)
    isControlled: boolean('is_controlled').notNull().default(true),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex('uniq_credit_funds_name').on(t.name)]
);

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
  'credit_fund_budgets',
  {
    id: serial('id').primaryKey(),
    creditFundId: integer('credit_fund_id')
      .notNull()
      .references(() => creditFunds.id, { onDelete: 'restrict' }),
    accountingPeriodId: integer('accounting_period_id')
      .notNull()
      .references(() => accountingPeriods.id, { onDelete: 'restrict' }),
    fundAmount: decimal('fund_amount', { precision: 20, scale: 2 }).notNull(),
    reinvestmentAmount: decimal('reinvestment_amount', {
      precision: 20,
      scale: 2,
    }).notNull(),
    expenseAmount: decimal('expense_amount', {
      precision: 20,
      scale: 2,
    }).notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex('uniq_credit_fund_budget').on(t.creditFundId, t.accountingPeriodId)]
);

// ---------------------------------------------------------------------
// Concr62 - Usuario ↔ Oficina de afiliación
// Nota (ES):
// Asigna a qué oficinas puede pertenecer/operar un usuario.
// Campos clave:
// - userId: id del usuario en IAM.
// - affiliationOfficeId: oficina asignada.
// ---------------------------------------------------------------------
export const userAffiliationOffices = pgTable(
  'user_affiliation_offices',
  {
    id: serial('id').primaryKey(),
    // IAM externo: UUID
    userId: uuid('user_id').notNull(),
    affiliationOfficeId: integer('affiliation_office_id')
      .notNull()
      .references(() => affiliationOffices.id, { onDelete: 'restrict' }),
    isPrimary: boolean('is_primary').notNull().default(false),
    ...timestamps,
  },
  (t) => [uniqueIndex('uniq_user_affiliation_office').on(t.userId, t.affiliationOfficeId)]
);

// ---------------------------------------------------------------------
// Concr21 - Tipos de terceros
// Nota:
// Catálogo para clasificar terceros (personas/empresas) según el tipo definido por el cliente.
// Campo clave:
// - name: nombre del tipo de tercero.
// ---------------------------------------------------------------------
export const thirdPartyTypes = pgTable(
  'third_party_types',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex('uniq_third_party_types_name').on(t.name)]
);

export const personTypeEnum = pgEnum('person_type', ['NATURAL', 'LEGAL']);
// Tipcon (tipo contribuyente) según tu select legacy
export const taxpayerTypeEnum = pgEnum('taxpayer_type', [
  'STATE_COMPANY', // 1 EMPRESA DEL ESTADO
  'COMMON_REGIME', // 2 REGIMEN COMUN
  'SIMPLIFIED_REGIME', // 3 REGIMEN SIMPLIFICADO
  'NO_SALES_REGIME', // 4 SIN REGIMEN DE VENTAS
  'LARGE_TAXPAYER', // 5 GRAN CONTRIBUYENTE
  'NATURAL_PERSON', // 6 PERSONA NATURAL
  'OTHER', // 7 OTRO
]);
// Sexo enum
export const sexEnum = pgEnum('sex', ['M', 'F']);

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
  'third_parties',
  {
    id: serial('id').primaryKey(),
    identificationTypeId: integer('identification_type_id')
      .notNull()
      .references(() => identificationTypes.id, { onDelete: 'restrict' }),
    documentNumber: varchar('document_number', { length: 17 }).notNull(),
    verificationDigit: varchar('verification_digit', { length: 1 }), // útil para NIT

    personType: personTypeEnum('person_type').notNull(),

    // Empresa: representante legal (solo LEGAL)
    representativeIdNumber: varchar('representative_id_number', { length: 15 }),

    // Persona natural (solo NATURAL)
    firstLastName: varchar('first_last_name', { length: 20 }),
    secondLastName: varchar('second_last_name', { length: 15 }),
    firstName: varchar('first_name', { length: 20 }),
    secondName: varchar('second_name', { length: 15 }),

    // Empresa (solo LEGAL)
    businessName: varchar('business_name', { length: 60 }),

    // Datos generales
    sex: sexEnum('sex'),
    categoryCode: varchar('category_code', { length: 1 }), // A,B,C,D
    address: varchar('address', { length: 80 }),
    cityId: integer('city_id')
      .notNull()
      .references(() => cities.id, { onDelete: 'restrict' }),

    phone: varchar('phone', { length: 20 }).notNull(),
    mobilePhone: varchar('mobile_phone', { length: 20 }),
    email: varchar('email', { length: 60 }),

    thirdPartyTypeId: integer('third_party_type_id')
      .notNull()
      .references(() => thirdPartyTypes.id, { onDelete: 'restrict' }),

    // Tributario
    taxpayerType: taxpayerTypeEnum('taxpayer_type').notNull(),
    hasRut: boolean('has_rut').notNull().default(false),

    employerDocumentNumber: varchar('employer_document_number', { length: 17 }),
    employerBusinessName: varchar('employer_business_name', { length: 200 }),

    note: varchar('note', { length: 220 }),

    ...timestamps,
  },
  (t) => [
    uniqueIndex('uniq_third_party_identity').on(t.identificationTypeId, t.documentNumber),

    index('idx_third_party_employer_doc').on(t.employerDocumentNumber),
    index('idx_third_party_type').on(t.thirdPartyTypeId),

    check(
      'chk_third_party_names_by_type',
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
    `
    ),
    check(
      'chk_third_party_rep_for_legal',
      sql`
      (
        ${t.personType} = 'NATURAL'
      )
      OR
      (
        ${t.personType} = 'LEGAL'
        AND ${t.representativeIdNumber} IS NOT NULL
      )
    `
    ),
  ]
);

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
  'insurance_companies',
  {
    id: serial('id').primaryKey(),

    identificationTypeId: integer('identification_type_id')
      .notNull()
      .references(() => identificationTypes.id, { onDelete: 'restrict' }),
    documentNumber: varchar('document_number', { length: 20 }).notNull(),
    verificationDigit: varchar('verification_digit', { length: 1 }),

    businessName: varchar('business_name', { length: 255 }).notNull(),
    cityId: integer('city_id')
      .notNull()
      .references(() => cities.id, { onDelete: 'restrict' }),
    address: varchar('address', { length: 255 }).notNull(),

    phone: varchar('phone', { length: 20 }),
    mobileNumber: varchar('mobile_number', { length: 20 }),
    email: varchar('email', { length: 60 }),

    factor: decimal('factor', { precision: 12, scale: 4 }).notNull(),
    minimumValue: decimal('minimum_value', { precision: 12, scale: 2 }),

    totalChargeDistributionId: integer('total_charge_distribution_id').references(
      () => accountingDistributions.id,
      { onDelete: 'restrict' }
    ),

    monthlyDistributionId: integer('monthly_distribution_id')
      .notNull()
      .references(() => accountingDistributions.id, { onDelete: 'restrict' }),

    note: varchar('note', { length: 70 }),

    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('uniq_insurance_companies_document_number_id').on(
      t.identificationTypeId,
      t.documentNumber
    ),
  ]
);

export const insuranceRateRangeMetricEnum = pgEnum('insurance_rate_range_metric', [
  'INSTALLMENT_COUNT', // # de cuotas
  'CREDIT_AMOUNT', // monto del credito
]);
// ---------------------------------------------------------------------
// Concr34 - Valores de seguros (rangos)
// Nota (ES):
// Define rangos de valor (monto) para calcular el seguro de una aseguradora.
// Campos clave:
// - valueFrom/valueTo: rango de monto al que aplica.
// - rateValue: valor/tasa configurada para el cálculo del seguro.
// ---------------------------------------------------------------------
export const insuranceRateRanges = pgTable(
  'insurance_rate_ranges',
  {
    id: serial('id').primaryKey(),
    insuranceCompanyId: integer('insurance_company_id')
      .notNull()
      .references(() => insuranceCompanies.id, { onDelete: 'cascade' }),
    rangeMetric: insuranceRateRangeMetricEnum('range_metric').notNull(),
    valueFrom: integer('value_from').notNull(),
    valueTo: integer('value_to').notNull(),
    rateValue: decimal('rate_value', { precision: 12, scale: 5 }).notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('uniq_insurance_rate_range').on(
      t.insuranceCompanyId,
      t.rangeMetric,
      t.valueFrom,
      t.valueTo
    ),
    check('chk_insurance_rate_range_order', sql`${t.valueFrom} <= ${t.valueTo}`),
  ]
);

export const financingTypeEnum = pgEnum('financing_type', [
  'FIXED_AMOUNT', // Valor Fijo
  'ON_BALANCE', // Valor Sobre Saldo
]);

// Modo configurado por producto (concr07 / creditProducts)
export const riskEvaluationModeEnum = pgEnum('risk_evaluation_mode', [
  'NONE', // no integra / no valida
  'VALIDATE_ONLY', // consulta riesgo pero no bloquea aprobación
  'REQUIRED', // consulta riesgo y es obligatorio pasar
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
  'credit_products',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    // Concr07.codcre -> fondo por defecto
    creditFundId: integer('credit_fund_id')
      .references(() => creditFunds.id, {
        onDelete: 'restrict',
      })
      .notNull(),
    paymentAllocationPolicyId: integer('payment_allocation_policy_id')
      .notNull()
      .references(() => paymentAllocationPolicies.id, { onDelete: 'cascade' }),
    xmlModelId: integer('xml_model_id'),
    // Concr07.tipfin
    financingType: financingTypeEnum('financing_type').notNull(),
    // Concr07.pagseg (S/N)
    paysInsurance: boolean('pays_insurance').notNull().default(false),
    insuranceRangeMetric: insuranceRateRangeMetricEnum('insurance_range_metric')
      .notNull()
      .default('CREDIT_AMOUNT'),
    // Concr07.codcap/codint/codmor -> Concr05 (distribuciones)
    capitalDistributionId: integer('capital_distribution_id')
      .notNull()
      .references(() => accountingDistributions.id, { onDelete: 'restrict' }),
    interestDistributionId: integer('interest_distribution_id')
      .notNull()
      .references(() => accountingDistributions.id, { onDelete: 'restrict' }),
    lateInterestDistributionId: integer('late_interest_distribution_id')
      .notNull()
      .references(() => accountingDistributions.id, { onDelete: 'restrict' }),
    // Concr07.repdcr (S/N)
    reportsToCreditBureau: boolean('reports_to_credit_bureau').notNull().default(false),
    // Concr07.numcuo (max cuotas)
    maxInstallments: integer('max_installments'),
    // Concr07.codcen -> centro de costo
    costCenterId: integer('cost_center_id').references(() => costCenters.id, {
      onDelete: 'set null',
    }),
    riskEvaluationMode: riskEvaluationModeEnum('risk_evaluation_mode').notNull().default('NONE'),

    riskMinScore: decimal('risk_min_score', {
      precision: 12,
      scale: 5,
    }),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [
    index('idx_credit_products_fund').on(t.creditFundId),
    index('idx_credit_products_cost_center').on(t.costCenterId),
  ]
);

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
  'credit_product_categories',
  {
    id: serial('id').primaryKey(),
    creditProductId: integer('credit_product_id')
      .notNull()
      .references(() => creditProducts.id, { onDelete: 'cascade' }),
    categoryCode: varchar('category_code', { length: 1 }).notNull(),
    installmentsFrom: integer('installments_from').notNull(),
    installmentsTo: integer('installments_to').notNull(),
    financingFactor: decimal('financing_factor', {
      precision: 12,
      scale: 9,
    }).notNull(),
    lateFactor: decimal('late_factor', { precision: 12, scale: 9 }).notNull(),
    pledgeFactor: decimal('pledge_factor', { precision: 12, scale: 9 }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('uniq_credit_product_category_range').on(
      t.creditProductId,
      t.categoryCode,
      t.installmentsFrom,
      t.installmentsTo
    ),

    check('chk_credit_product_category_installments_min', sql`${t.installmentsFrom} >= 1`),
    check(
      'chk_credit_product_category_installments_order',
      sql`${t.installmentsFrom} <= ${t.installmentsTo}`
    ),
  ]
);

// =====================================================================
// Concr44 - Tipos de crédito vs Documentos requeridos (pivot)
// Nota:
// Define qué documentos se solicitan para cada producto de crédito.
// Campos clave:
// - creditProductId: producto de crédito.
// - documentTypeId: tipo de documento.
// - isRequired: si es obligatorio o solo informativo.
// =====================================================================
export const creditProductDocuments = pgTable(
  'credit_product_documents',
  {
    id: serial('id').primaryKey(),
    creditProductId: integer('credit_product_id')
      .notNull()
      .references(() => creditProducts.id, { onDelete: 'cascade' }),
    documentTypeId: integer('document_type_id')
      .notNull()
      .references(() => documentTypes.id, { onDelete: 'restrict' }),
    isRequired: boolean('is_required').notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex('uniq_credit_product_document').on(t.creditProductId, t.documentTypeId)]
);

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
  'credit_product_accounts',
  {
    id: serial('id').primaryKey(),
    creditProductId: integer('credit_product_id')
      .notNull()
      .references(() => creditProducts.id, { onDelete: 'cascade' }),
    capitalGlAccountId: integer('capital_gl_account_id')
      .notNull()
      .references(() => glAccounts.id, { onDelete: 'restrict' }),
    interestGlAccountId: integer('interest_gl_account_id')
      .notNull()
      .references(() => glAccounts.id, { onDelete: 'restrict' }),
    lateInterestGlAccountId: integer('late_interest_gl_account_id')
      .notNull()
      .references(() => glAccounts.id, { onDelete: 'restrict' }),
    ...timestamps,
  },
  (t) => [
    // 1 a 1 con creditProducts
    uniqueIndex('uniq_credit_product_accounts_credit_product').on(t.creditProductId),
  ]
);

export const bankAccountTypeEnum = pgEnum('bank_account_type', [
  'SAVINGS', // A
  'CHECKING', // C
]);

export const loanApplicationStatusEnum = pgEnum('loan_application_status', [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELED',
]);

export const loanApprovalTypeEnum = pgEnum('loan_approval_type', ['IMMEDIATE', 'NON_IMMEDIATE']);

export const riskStatusEnum = pgEnum('risk_status', [
  'NOT_REQUIRED',
  'PENDING',
  'PASSED',
  'FAILED',
  'MANUAL_REVIEW',
  'ERROR',
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
  'loan_applications',
  {
    id: serial('id').primaryKey(),
    code: varchar('code', { length: 20 }).notNull().unique(),
    // Fondo asignado
    creditFundId: integer('credit_fund_id')
      .references(() => creditFunds.id, {
        onDelete: 'restrict',
      })
      .notNull(),
    applicationDate: date('application_date').notNull(),
    affiliationOfficeId: integer('affiliation_office_id')
      .notNull()
      .references(() => affiliationOffices.id, { onDelete: 'restrict' }),
    // IAM externo
    createdByUserId: uuid('created_by_user_id').notNull(),
    // Solicitante (tercero)
    thirdPartyId: integer('third_party_id')
      .notNull()
      .references(() => thirdParties.id, { onDelete: 'restrict' }),

    // mancat S/N -> boolean
    isCategoryManual: boolean('is_category_manual').notNull().default(false),
    // codcat
    categoryCode: varchar('category_code', { length: 1 }).notNull(),

    // forpag -> tu tabla “repayment_methods” (libranza/pignoración/etc)
    repaymentMethodId: integer('repayment_method_id')
      .notNull()
      .references(() => repaymentMethods.id, { onDelete: 'restrict' }),

    // pigsub S/N -> boolean
    pledgesSubsidy: boolean('pledges_subsidy').notNull().default(false),

    salary: decimal('salary', { precision: 14, scale: 2 }).notNull(),
    otherIncome: decimal('other_income', { precision: 14, scale: 2 }).notNull(),
    otherCredits: decimal('other_credits', {
      precision: 14,
      scale: 2,
    }).notNull(),
    paymentCapacity: decimal('payment_capacity', {
      precision: 14,
      scale: 2,
    }).notNull(),

    // Desembolso
    bankAccountNumber: varchar('bank_account_number', { length: 25 }).notNull(),
    bankAccountType: bankAccountTypeEnum('bank_account_type').notNull(),
    bankId: integer('bank_id')
      .notNull()
      .references(() => banks.id, { onDelete: 'restrict' }),

    creditProductId: integer('credit_product_id')
      .notNull()
      .references(() => creditProducts.id, { onDelete: 'restrict' }),

    paymentFrequencyId: integer('payment_frequency_id').references(() => paymentFrequencies.id, {
      onDelete: 'restrict',
    }),

    financingFactor: decimal('financing_factor', {
      precision: 12,
      scale: 9,
    }).notNull(),
    installments: integer('installments').notNull(),

    // Seguro (opcional)
    insuranceCompanyId: integer('insurance_company_id').references(() => insuranceCompanies.id, {
      onDelete: 'restrict',
    }),
    // facseg (%). Si no hay seguro, lo dejamos 0.
    insuranceFactor: decimal('insurance_factor', { precision: 12, scale: 5 })
      .notNull()
      .default('0'),

    requestedAmount: decimal('requested_amount', {
      precision: 14,
      scale: 2,
    }).notNull(),
    approvedAmount: decimal('approved_amount', { precision: 14, scale: 2 }),
    approvalType: loanApprovalTypeEnum('approval_type'),

    investmentTypeId: integer('investment_type_id').references(() => investmentTypes.id, {
      onDelete: 'restrict',
    }),

    status: loanApplicationStatusEnum('status').notNull().default('PENDING'),

    receivedDate: date('received_date').notNull(),

    // IAM externo
    statusChangedByUserId: uuid('status_changed_by_user_id'),
    statusDate: date('status_date'),
    actNumber: varchar('act_number', { length: 20 }),
    rejectionReasonId: integer('rejection_reason_id').references(() => rejectionReasons.id, {
      onDelete: 'restrict',
    }),

    note: varchar('note', { length: 255 }),
    // aprseg enum('N','S') -> boolean
    isInsuranceApproved: boolean('is_insurance_approved').notNull().default(false),

    // estcre int -> mejor decimal (dinero)
    creditStudyFee: decimal('credit_study_fee', { precision: 14, scale: 2 }).notNull().default('0'),
    ...timestamps,
    riskStatus: riskStatusEnum('risk_status').notNull().default('NOT_REQUIRED'),
    riskScore: decimal('risk_score', { precision: 12, scale: 5 }),
    riskCheckedAt: timestamp('risk_checked_at', { withTimezone: true }),
    riskNote: varchar('risk_note', { length: 255 }),
    channelId: integer('channel_id').references(() => channels.id, {
      onDelete: 'set null',
    }),
  },
  (t) => [
    index('idx_loan_applications_date_office').on(t.applicationDate, t.affiliationOfficeId),
    index('idx_loan_applications_office').on(t.affiliationOfficeId),
    index('idx_loan_applications_status').on(t.status),
    index('idx_loan_applications_third_party').on(t.thirdPartyId),
    index('idx_loan_applications_product').on(t.creditProductId),
  ]
);

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
  'loan_application_pledges',
  {
    id: serial('id').primaryKey(),
    loanApplicationId: integer('loan_application_id')
      .notNull()
      .references(() => loanApplications.id, { onDelete: 'cascade' }),
    agreementCode: varchar('agreement_code', { length: 20 }).notNull(),
    spouseDocumentNumber: varchar('spouse_document_number', { length: 20 }),
    beneficiaryCode: integer('beneficiary_code').notNull(),
    pledgedAmount: decimal('pledged_amount', {
      precision: 14,
      scale: 2,
    }).notNull(),
    effectiveDate: date('effective_date').notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('uniq_pledge_application_beneficiary').on(
      t.loanApplicationId,
      t.agreementCode,
      t.beneficiaryCode
    ),
    index('idx_pledges_application').on(t.loanApplicationId),
    index('idx_pledges_agreement').on(t.agreementCode),
  ]
);

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
  'co_debtors',
  {
    id: serial('id').primaryKey(),

    identificationTypeId: integer('identification_type_id')
      .notNull()
      .references(() => identificationTypes.id, { onDelete: 'restrict' }),
    documentNumber: varchar('document_number', { length: 20 }).notNull(),

    homeAddress: varchar('home_address', { length: 80 }).notNull(),
    homeCityId: integer('home_city_id')
      .notNull()
      .references(() => cities.id, { onDelete: 'restrict' }),
    homePhone: varchar('home_phone', { length: 20 }).notNull(),

    companyName: varchar('company_name', { length: 80 }).notNull(),
    workAddress: varchar('work_address', { length: 80 }).notNull(),
    workCityId: integer('work_city_id')
      .notNull()
      .references(() => cities.id, { onDelete: 'restrict' }),
    workPhone: varchar('work_phone', { length: 20 }).notNull(),

    ...timestamps,
  },
  (t) => [
    uniqueIndex('uniq_co_debtors_document_number').on(t.identificationTypeId, t.documentNumber),
  ]
);

// ---------------------------------------------------------------------
// Concr41 - Relación solicitud - codeudor
// Nota:
// Asocia uno o varios codeudores a una solicitud de crédito.
// ---------------------------------------------------------------------
export const loanApplicationCoDebtors = pgTable(
  'loan_application_co_debtors',
  {
    id: serial('id').primaryKey(),
    loanApplicationId: integer('loan_application_id')
      .notNull()
      .references(() => loanApplications.id, { onDelete: 'cascade' }),
    coDebtorId: integer('co_debtor_id')
      .notNull()
      .references(() => coDebtors.id, { onDelete: 'restrict' }),

    ...timestamps,
  },
  (t) => [
    uniqueIndex('uniq_application_codebtor').on(t.loanApplicationId, t.coDebtorId),
    index('idx_application_codebtor_app').on(t.loanApplicationId),
    index('idx_application_codebtor_codebtor').on(t.coDebtorId),
  ]
);

// ---------------------------------------------------------------------
// Concr45 - Documentos entregados en solicitudes
// Nota:
// Evidencia de documentos por solicitud. Permite marcar entrega y adjuntar archivo.
// Campos clave:
// - loanApplicationId + documentTypeId: identifica el documento requerido.
// - isDelivered: indica si fue entregado.
// - fileKey: referencia al archivo en el storage (S3/R2/GCS/etc).
// ---------------------------------------------------------------------
export const loanApplicationDocuments = pgTable(
  'loan_application_documents',
  {
    id: serial('id').primaryKey(),
    loanApplicationId: integer('loan_application_id')
      .notNull()
      .references(() => loanApplications.id, { onDelete: 'cascade' }),
    documentTypeId: integer('document_type_id')
      .notNull()
      .references(() => documentTypes.id, { onDelete: 'restrict' }),
    isDelivered: boolean('is_delivered').notNull().default(false),
    fileKey: varchar('file_key', { length: 512 }),
    uploadedByUserId: uuid('uploaded_by_user_id'),
    uploadedByUserName: uuid('uploaded_by_user_name'),
    ...timestamps,
  },
  (t) => [uniqueIndex('uniq_application_document_type').on(t.loanApplicationId, t.documentTypeId)]
);

// ------------------------------------------------------------
// Enums Concr08
// ------------------------------------------------------------
export const loanStatusEnum = pgEnum('loan_status', [
  'ACTIVE', // A
  'GENERATED', // G
  'INACTIVE', // I
  'ACCOUNTED', // C (contabilizado)
  'VOID', // X (anulado)
  'RELIQUIDATED', // R
  'FINISHED', // T (terminado)
  'PAID', // P
]);

export const loanDisbursementStatusEnum = pgEnum('loan_disbursement_status', [
  'LIQUIDATED', // L
  'SENT_TO_ACCOUNTING', // C
  'SENT_TO_BANK', // B
  'DISBURSED', // D
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
  'loans',
  {
    id: serial('id').primaryKey(),
    // código del crédito.
    code: varchar('code', { length: 20 }).notNull().unique(),
    creditFundId: integer('credit_fund_id').references(() => creditFunds.id, {
      onDelete: 'restrict',
    }),

    // IAM externo (sin FK)
    createdByUserId: uuid('created_by_user_id').notNull(),

    // fecha de registro/aprobación en el sistema
    recordDate: date('record_date').notNull(),

    loanApplicationId: integer('loan_application_id')
      .notNull()
      .references(() => loanApplications.id, { onDelete: 'restrict' }),

    // Deudor (solicitante)
    thirdPartyId: integer('third_party_id')
      .notNull()
      .references(() => thirdParties.id, { onDelete: 'restrict' }),

    // A quién se desembolsa (puede ser el mismo tercero o un proveedor)
    payeeThirdPartyId: integer('payee_third_party_id')
      .notNull()
      .references(() => thirdParties.id, { onDelete: 'restrict' }),

    installments: integer('installments').notNull(),

    // Fechas (en legacy feccre/fecven/fecpag)
    creditStartDate: date('credit_start_date').notNull(), // feccre: inicio/creación del crédito
    maturityDate: date('maturity_date').notNull(), // fecven: vencimiento final
    firstCollectionDate: date('first_collection_date'), // fecpag: cuándo empieza a cobrarse

    // Montos
    principalAmount: decimal('principal_amount', {
      precision: 14,
      scale: 2,
    }).notNull(),
    initialTotalAmount: decimal('initial_total_amount', {
      precision: 14,
      scale: 2,
    }).notNull(),

    // Seguro
    insuranceCompanyId: integer('insurance_company_id').references(() => insuranceCompanies.id, {
      onDelete: 'restrict',
    }),
    insuranceValue: decimal('insurance_value', { precision: 14, scale: 2 }),

    // Fondo/registro ??????? // otro seguro al credito
    fundRegisterTaxId: varchar('fund_register_tax_id', { length: 20 }),
    fundRegisterValue: decimal('fund_register_value', {
      precision: 14,
      scale: 2,
    }),

    // Flag legacy: desestcre
    discountStudyCredit: boolean('discount_study_credit').notNull().default(false),

    costCenterId: integer('cost_center_id').references(() => costCenters.id, {
      onDelete: 'set null',
    }),

    repaymentMethodId: integer('repayment_method_id')
      .notNull()
      .references(() => repaymentMethods.id, { onDelete: 'restrict' }),

    paymentGuaranteeTypeId: integer('payment_guarantee_type_id')
      .notNull()
      .references(() => paymentGuaranteeTypes.id, { onDelete: 'restrict' }),

    guaranteeDocument: varchar('guarantee_document', { length: 50 }),

    // estado (A/G/I/C/X/R/T/P)
    status: loanStatusEnum('status').notNull().default('ACTIVE'),
    statusDate: date('status_date').notNull(),

    affiliationOfficeId: integer('affiliation_office_id')
      .notNull()
      .references(() => affiliationOffices.id, { onDelete: 'restrict' }),

    // IAM externo (quien cambió el estado)
    statusChangedByUserId: uuid('status_changed_by_user_id'),

    note: varchar('note', { length: 255 }),

    // numcom: comprobante/numero contable (si aplica)
    voucherNumber: varchar('voucher_number', { length: 30 }),

    paymentFrequencyId: integer('payment_frequency_id').references(() => paymentFrequencies.id, {
      onDelete: 'restrict',
    }),

    // CIFIN / centrales (mejor default false)
    isReportedToCifin: boolean('is_reported_to_cifin').notNull().default(false),
    cifinReportDate: date('cifin_report_date'),

    // Jurídico
    hasLegalProcess: boolean('has_legal_process').notNull().default(false),
    legalProcessDate: date('legal_process_date'),

    // Acuerdo de pago
    hasPaymentAgreement: boolean('has_payment_agreement').notNull().default(false),
    paymentAgreementDate: date('payment_agreement_date'),

    // estpag (L/C/B/D) => estado del desembolso ???????
    disbursementStatus: loanDisbursementStatusEnum('disbursement_status')
      .notNull()
      .default('LIQUIDATED'),

    lastPaymentDate: date('last_payment_date'),

    // Castigo
    isWrittenOff: boolean('is_written_off').notNull().default(false),
    writtenOffDate: date('written_off_date'),

    isInterestWrittenOff: boolean('is_interest_written_off').notNull().default(false),
    interestWriteOffDocument: varchar('interest_write_off_document', {
      length: 30,
    }),

    withheldBalanceValue: integer('withheld_balance_value').notNull().default(0),
    channelId: integer('channel_id').references(() => channels.id, {
      onDelete: 'set null',
    }),

    ...timestamps,
  },
  (t) => [
    uniqueIndex('uniq_loans_code').on(t.code),

    index('idx_loans_application').on(t.loanApplicationId),
    index('idx_loans_status').on(t.status),
    index('idx_loans_start_status').on(t.creditStartDate, t.status),
    index('idx_loans_office').on(t.affiliationOfficeId),
    index('idx_loans_third_party').on(t.thirdPartyId),
    index('idx_loans_payee').on(t.payeeThirdPartyId),
    index('idx_loans_disbursement_status').on(t.disbursementStatus),
  ]
);

export const installmentRecordStatusEnum = pgEnum('installment_record_status', [
  'GENERATED', // G
  'ACCOUNTED', // C
  'VOID', // X
  'RELIQUIDATED', // R
  'INACTIVE', // I
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
  'loan_installments',
  {
    id: serial('id').primaryKey(),

    loanId: integer('loan_id')
      .notNull()
      .references(() => loans.id, { onDelete: 'cascade' }),

    // Para soportar cambios del plan (abonos extra, refinanciaciones, etc.)
    scheduleVersion: integer('schedule_version').notNull().default(1),

    installmentNumber: integer('installment_number').notNull(),

    dueDate: date('due_date').notNull(),

    principalAmount: decimal('principal_amount', {
      precision: 14,
      scale: 2,
    }).notNull(),
    interestAmount: decimal('interest_amount', { precision: 14, scale: 2 }).notNull().default('0'),
    insuranceAmount: decimal('insurance_amount', { precision: 14, scale: 2 })
      .notNull()
      .default('0'),

    // Estado del registro del plan (no confundir con “pagada/vencida”)
    status: installmentRecordStatusEnum('status').notNull().default('GENERATED'),

    remainingPrincipal: decimal('remaining_principal', {
      precision: 14,
      scale: 2,
    }).notNull(),

    ...timestamps,
  },
  (t) => [
    uniqueIndex('uniq_loan_installment_version_number').on(
      t.loanId,
      t.scheduleVersion,
      t.installmentNumber
    ),

    index('idx_installments_loan_version_due').on(t.loanId, t.scheduleVersion, t.dueDate),
    index('idx_installments_loan_status_due').on(t.loanId, t.status, t.dueDate),

    check(
      'chk_installment_amounts_non_negative',
      sql`
      ${t.principalAmount} >= 0 AND
      ${t.interestAmount} >= 0 AND
      ${t.insuranceAmount} >= 0 AND
      ${t.remainingPrincipal} >= 0
    `
    ),
  ]
);

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
  'loan_application_act_numbers',
  {
    id: serial('id').primaryKey(),

    affiliationOfficeId: integer('affiliation_office_id')
      .notNull()
      .references(() => affiliationOffices.id, { onDelete: 'restrict' }),

    actDate: date('act_date').notNull(),

    actNumber: varchar('act_number', { length: 20 }).notNull(),

    // IAM externo (opcional): quién generó/registró el acta
    generatedByUserId: uuid('generated_by_user_id'),

    ...timestamps,
  },
  (t) => [
    uniqueIndex('uniq_act_office_date').on(t.affiliationOfficeId, t.actDate),
    index('idx_act_date').on(t.actDate),
    index('idx_act_office').on(t.affiliationOfficeId),
  ]
);

export const portfolioEntryStatusEnum = pgEnum('portfolio_entry_status', [
  'OPEN',
  'CLOSED',
  'VOID',
]);

// ---------------------------------------------------------------------
// Concr17 (legacy) + tconcr17 (legacy) - Cartera por ítem (saldo actual)
// Nota (ES):
// Saldo actual por auxiliar + tercero + crédito + cuota.
// Se actualiza con movimientos contabilizados (Concr22).
// Regla: balance = chargeAmount - paymentAmount.
// ---------------------------------------------------------------------
export const portfolioEntries = pgTable(
  'portfolio_entries',
  {
    id: serial('id').primaryKey(),

    glAccountId: integer('gl_account_id')
      .notNull()
      .references(() => glAccounts.id, { onDelete: 'restrict' }),

    thirdPartyId: integer('third_party_id')
      .notNull()
      .references(() => thirdParties.id, { onDelete: 'restrict' }),

    loanId: integer('loan_id')
      .notNull()
      .references(() => loans.id, { onDelete: 'cascade' }),

    installmentNumber: integer('installment_number').notNull().default(0),

    // equivalente a concr22.fecven / tconcr17.fecven
    dueDate: date('due_date').notNull(),

    // equivalente a tconcr17.valor / abonos / saldo
    chargeAmount: decimal('charge_amount', { precision: 14, scale: 2 }).notNull().default('0'),
    paymentAmount: decimal('payment_amount', { precision: 14, scale: 2 }).notNull().default('0'),
    balance: decimal('balance', { precision: 14, scale: 2 }).notNull().default('0'),

    // equivalente a tconcr17.fecha (último movimiento aplicado)
    lastMovementDate: date('last_movement_date'),

    status: portfolioEntryStatusEnum('status').notNull().default('OPEN'),

    // estado legacy (si lo quieres guardar tal cual)
    legacyStatusCode: varchar('legacy_status_code', { length: 1 }),

    ...timestamps,
  },
  (t) => [
    // equivalente a PK legacy (auxiliar,numdoc,doccru,nocts)
    uniqueIndex('uniq_portfolio_entry').on(
      t.glAccountId,
      t.thirdPartyId,
      t.loanId,
      t.installmentNumber
    ),

    index('idx_portfolio_loan').on(t.loanId),
    index('idx_portfolio_due_status').on(t.dueDate, t.status),
    index('idx_portfolio_third_party').on(t.thirdPartyId),
    index('idx_portfolio_gl_account').on(t.glAccountId),
  ]
);

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
  'accounting_entries',
  {
    id: serial('id').primaryKey(),

    // concr22.tipo / documento / sec (llave legacy)
    processType: processTypeEnum('process_type').notNull(),
    documentCode: varchar('document_code', { length: 7 }).notNull(),
    sequence: integer('sequence').notNull(),

    voucherNumber: varchar('voucher_number', { length: 13 }).notNull(),
    entryDate: date('entry_date').notNull(),

    glAccountId: integer('gl_account_id')
      .notNull()
      .references(() => glAccounts.id, { onDelete: 'restrict' }),

    costCenterId: integer('cost_center_id').references(() => costCenters.id, {
      onDelete: 'restrict',
    }),

    thirdPartyId: integer('third_party_id').references(() => thirdParties.id, {
      onDelete: 'restrict',
    }),

    description: varchar('description', { length: 255 }).notNull(),

    // nat: en legacy parece 'D'/'C'
    nature: entryNatureEnum('nature').notNull(),

    amount: decimal('amount', { precision: 14, scale: 2 }).notNull(),

    // doccru/nocts/fecven -> para amarrar a crédito/cuota
    loanId: integer('loan_id').references(() => loans.id, {
      onDelete: 'restrict',
    }),
    installmentNumber: integer('installment_number'),
    dueDate: date('due_date'),

    checkNumber: varchar('check_number', { length: 7 }),

    // estado: al menos 'C' es contabilizado
    statusCode: varchar('status_code', { length: 1 }).notNull(),

    transactionTypeCode: varchar('transaction_type_code', { length: 1 }),
    transactionDocument: varchar('transaction_document', {
      length: 7,
    }).notNull(),
    processRunId: integer('process_run_id').references(() => processRuns.id, {
      onDelete: 'restrict',
    }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('uniq_accounting_entry_legacy_key').on(t.processType, t.documentCode, t.sequence),

    index('idx_entries_process_run').on(t.processRunId),

    // índices para cartera / consultas típicas
    index('idx_entries_loan_installment_due_status').on(
      t.loanId,
      t.installmentNumber,
      t.dueDate,
      t.statusCode
    ),
    index('idx_entries_gl_third_party_status').on(t.glAccountId, t.thirdPartyId, t.statusCode),
    index('idx_entries_voucher').on(t.voucherNumber, t.entryDate),
  ]
);

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
  'loan_refinancing_links',
  {
    id: serial('id').primaryKey(),

    // doccre -> crédito resultante (nuevo)
    loanId: integer('loan_id')
      .notNull()
      .references(() => loans.id, { onDelete: 'cascade' }),

    // docref -> crédito origen (anterior)
    referenceLoanId: integer('reference_loan_id')
      .notNull()
      .references(() => loans.id, { onDelete: 'restrict' }),

    payoffAmount: decimal('payoff_amount', { precision: 14, scale: 2 }),
    createdByUserId: uuid('created_by_user_id'),

    ...timestamps,
  },
  (t) => [
    uniqueIndex('uniq_loan_ref_link').on(t.loanId, t.referenceLoanId),
    index('idx_ref_link_reference_loan').on(t.referenceLoanId),
  ]
);

export const processRunStatusEnum = pgEnum('process_status', [
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'CANCELED',
]);

// ---------------------------------------------------------------------
// Concr33-Concr42 Process Runs
// Nota:
// Registro de ejecuciones batch (quién/cuándo/estado). Sirve para auditoría y
// para saber si “hoy ya se corrió” a nivel global. No guarda detalle por crédito.
// ---------------------------------------------------------------------
export const processRuns = pgTable(
  'process_runs',
  {
    id: serial('id').primaryKey(),
    processType: processTypeEnum('process_type').notNull(),
    accountingPeriodId: integer('accounting_period_id')
      .references(() => accountingPeriods.id, { onDelete: 'restrict' })
      .notNull(),
    processDate: date('process_date').notNull(),
    executedByUserId: integer('executed_by_user_id').notNull(),
    executedAt: timestamp('executed_at', { withTimezone: false }).notNull(),
    status: processRunStatusEnum('status').notNull().default('COMPLETED'),
    note: text('note'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('uniq_process_run').on(t.processType, t.processDate),
    index('idx_process_run_type_date').on(t.processType, t.processDate),
    index('idx_process_run_period').on(t.accountingPeriodId),
  ]
);

// ---------------------------------------------------------------------
// Loan Process State (idempotencia por crédito + tipo)
// Nota:
// 1 fila por (crédito, tipo de proceso). Guarda la última fecha procesada para
// evitar reprocesar el mismo crédito el mismo día. Esto reemplaza la necesidad
// de guardar "concr42" registro por registro diario.
// Campos clave: loanId, processType, lastProcessedDate.
// ---------------------------------------------------------------------
export const loanProcessStates = pgTable(
  'loan_process_states',
  {
    loanId: integer('loan_id')
      .notNull()
      .references(() => loans.id, { onDelete: 'cascade' }),
    processType: processTypeEnum('process_type').notNull(),
    // La fecha “lógica” del último proceso aplicado a este crédito para ese tipo
    lastProcessedDate: date('last_processed_date').notNull(),
    // Trazabilidad
    lastProcessRunId: integer('last_process_run_id')
      .references(() => processRuns.id, { onDelete: 'set null' })
      .notNull(),
    //control de fallos
    lastError: text('last_error'),
    ...timestamps,
  },
  (t) => [
    primaryKey({ columns: [t.loanId, t.processType] }),
    index('idx_loan_process_state_last_date').on(t.processType, t.lastProcessedDate),
  ]
);

// ---------------------------------------------------------------------
// Concr63-Concr28 - Histórico cartera (aging snapshot)
// Nota (ES):
// Foto mensual de cartera por crédito y auxiliar (cuenta contable).
// Se usa para reportes históricos “as-of” (aging: corriente, 30, 60, ...).
// Clave: accountingPeriodId + loanId + glAccountId.
// ---------------------------------------------------------------------
export const portfolioAgingSnapshots = pgTable(
  'portfolio_aging_snapshots',
  {
    id: serial('id').primaryKey(),

    accountingPeriodId: integer('accounting_period_id')
      .notNull()
      .references(() => accountingPeriods.id, { onDelete: 'restrict' }),
    agingProfileId: integer('aging_profile_id').references(() => agingProfiles.id, {
      onDelete: 'restrict',
    }),

    // fecgen / horgen / usugen (legacy)
    generatedAt: timestamp('generated_at', { withTimezone: true }).notNull().defaultNow(),
    generatedByUserId: uuid('generated_by_user_id').notNull(),

    affiliationOfficeId: integer('affiliation_office_id')
      .notNull()
      .references(() => affiliationOffices.id, { onDelete: 'restrict' }),

    creditProductId: integer('credit_product_id')
      .notNull()
      .references(() => creditProducts.id, { onDelete: 'restrict' }),

    glAccountId: integer('gl_account_id')
      .notNull()
      .references(() => glAccounts.id, { onDelete: 'restrict' }),

    loanId: integer('loan_id')
      .notNull()
      .references(() => loans.id, { onDelete: 'cascade' }),

    thirdPartyId: integer('third_party_id')
      .notNull()
      .references(() => thirdParties.id, { onDelete: 'restrict' }),

    categoryCode: varchar('category_code', { length: 1 }),

    principalAmount: decimal('principal_amount', {
      precision: 14,
      scale: 2,
    }).notNull(),

    installmentValue: decimal('installment_value', {
      precision: 14,
      scale: 2,
    }).notNull(),

    repaymentMethodId: integer('repayment_method_id')
      .notNull()
      .references(() => repaymentMethods.id, { onDelete: 'restrict' }),

    // edad (opcional pero útil)
    daysPastDue: integer('days_past_due').notNull().default(0),

    // buckets
    currentAmount: decimal('current_amount', {
      precision: 14,
      scale: 2,
    }).notNull(),

    totalPastDue: decimal('total_past_due', {
      precision: 14,
      scale: 2,
    }).notNull(),
    totalPortfolio: decimal('total_portfolio', {
      precision: 14,
      scale: 2,
    }).notNull(),

    ...timestamps,
  },
  (t) => [
    uniqueIndex('uniq_portfolio_aging_snapshot').on(t.accountingPeriodId, t.loanId, t.glAccountId),

    index('idx_portfolio_aging_period').on(t.accountingPeriodId),
    index('idx_portfolio_aging_office_period').on(t.affiliationOfficeId, t.accountingPeriodId),
    index('idx_portfolio_aging_credit_product_period').on(t.creditProductId, t.accountingPeriodId),

    // super útil para reportes por persona
    index('idx_portfolio_aging_third_period').on(t.thirdPartyId, t.accountingPeriodId),
    index('idx_portfolio_aging_loan_period').on(t.loanId, t.accountingPeriodId),
  ]
);

export const payrollExcessStatusEnum = pgEnum('payroll_excess_status', [
  'PENDING', // P
  'APPLIED', // A
  'CANCELED', // X
]);

export const payrollExcessPayments = pgTable(
  'payroll_excess_payments',
  {
    id: serial('id').primaryKey(),

    // Concr64.tipmov -> tipos de movimiento (según tu enum global)
    processType: processTypeEnum('process_type').notNull(),

    // Concr64.numlib -> aquí lo están usando como referencia al crédito (concr08)
    loanId: integer('loan_id')
      .notNull()
      .references(() => loans.id, { onDelete: 'restrict' }),

    // Concr64.nitlib (empresa/entidad pagadora). NO FK a thirdParties.
    payerTaxId: varchar('payer_tax_id', { length: 15 }),

    // Concr64.fecha
    date: date('date').notNull(),

    // Concr64.descripcion (legacy char(150))
    description: varchar('description', { length: 150 }).notNull(),

    // Concr64.valexc
    excessAmount: decimal('excess_amount', {
      precision: 14,
      scale: 2,
    }).notNull(),

    // Concr64.estado (legacy char(1))
    status: payrollExcessStatusEnum('status').notNull().default('PENDING'),

    // Concr64.usuario (viene de IAM/otro DB)
    createdByUserId: uuid('created_by_user_id').notNull(),

    ...timestamps,
  },
  (t) => [
    index('idx_payroll_excess_loan').on(t.loanId),
    index('idx_payroll_excess_date').on(t.date),
    index('idx_payroll_excess_status').on(t.status),
    index('idx_payroll_excess_payer').on(t.payerTaxId),
    index('idx_payroll_excess_type').on(t.processType),
  ]
);

export const loanPaymentStatusEnum = pgEnum('loan_payment_status', [
  'PAID', // P
  'VOID', // A (anulado)
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
  'loan_payments',
  {
    id: serial('id').primaryKey(),

    // marca char(2) -> Concr29
    receiptTypeId: integer('receipt_type_id')
      .notNull()
      .references(() => paymentReceiptTypes.id, { onDelete: 'restrict' }),

    // documento char(7) (número recibo)
    code: varchar('code', { length: 7 }).notNull(),

    // tipmov char(1) (REDUNDANTE: se deriva de receiptType.movementType)
    // Si quieres auditar “como llegó” en legacy, déjalo opcional:
    movementTypeSnapshot: paymentReceiptMovementTypeEnum('movement_type_snapshot'),

    // fecha
    paymentDate: date('payment_date').notNull(),

    // fecela (fecha elaboración/creación del recibo)
    issuedDate: date('issued_date'),

    // numcre -> loans
    loanId: integer('loan_id')
      .notNull()
      .references(() => loans.id, { onDelete: 'restrict' }),

    description: varchar('description', { length: 150 }).notNull(),

    // valor total del abono
    amount: decimal('amount', { precision: 14, scale: 2 }).notNull(),

    // estado: P/A
    status: loanPaymentStatusEnum('status').notNull().default('PAID'),

    statusDate: date('status_date'),

    // codcop/doccon: comprobante contable generado por el abono
    accountingVoucherTypeCode: varchar('accounting_voucher_type_code', {
      length: 4,
    }),
    accountingDocumentCode: varchar('accounting_document_code', { length: 7 }),

    // libranza / nómina
    payrollReferenceNumber: varchar('payroll_reference_number', { length: 7 }),
    payrollPayerTaxId: varchar('payroll_payer_tax_id', { length: 15 }),

    // usuario (IAM externo)
    createdByUserId: uuid('created_by_user_id').notNull(),

    // desglose legacy
    cashAmount: decimal('cash_amount', { precision: 14, scale: 2 }),
    checkAmount: decimal('check_amount', { precision: 14, scale: 2 }),
    creditAmount: decimal('credit_amount', { precision: 14, scale: 2 }),
    returnedAmount: decimal('returned_amount', { precision: 14, scale: 2 }),

    note: varchar('note', { length: 255 }),

    // valmay int (lo dejo legacy hasta entenderlo 100%)
    legacyValmay: integer('legacy_valmay'),

    // auxiliar (cuando aplica por auxiliar)
    glAccountId: integer('gl_account_id').references(() => glAccounts.id, {
      onDelete: 'restrict',
    }),

    // interfaz enum('N','S')
    isInterfaced: boolean('is_interfaced').notNull().default(false),

    legacySub43Mark: varchar('legacy_sub43_mark', { length: 2 }),
    legacySub43Document: varchar('legacy_sub43_document', { length: 8 }),

    ...timestamps,
  },
  (t) => [
    uniqueIndex('uniq_loan_payment_receipt').on(t.receiptTypeId, t.code),
    index('idx_loan_payment_loan_date').on(t.loanId, t.paymentDate),
    index('idx_loan_payment_status').on(t.status),
  ]
);

// ---------------------------------------------------------------------
// Concr35 - Detalle de formas de pago por recaudo
// Nota:
// Un pago (loan_payments) puede distribuirse entre
// varias formas de pago (payment_tender_types). Equivalente a Concr35.
// Campos clave: loanPaymentId + collectionMethodId + lineNumber.
// ---------------------------------------------------------------------
export const loanPaymentMethodAllocations = pgTable(
  'loan_payment_method_allocations',
  {
    id: serial('id').primaryKey(),

    loanPaymentId: integer('loan_payment_id')
      .notNull()
      .references(() => loanPayments.id, { onDelete: 'cascade' }),

    // Concr35.forma (FK a Concr53)
    collectionMethodId: integer('collection_method_id')
      .notNull()
      .references(() => paymentTenderTypes.id, { onDelete: 'restrict' }),

    // Concr35.numero
    lineNumber: integer('line_number').notNull(),

    // Concr35.mnum (referencia: transferencia, voucher, autorización, etc.)
    tenderReference: varchar('tender_reference', { length: 50 }),

    amount: decimal('amount', { precision: 14, scale: 2 }).notNull(),

    ...timestamps,
  },
  (t) => [
    uniqueIndex('uniq_payment_method_allocation').on(
      t.loanPaymentId,
      t.collectionMethodId,
      t.lineNumber
    ),
    index('idx_payment_method_allocation_payment').on(t.loanPaymentId),
    index('idx_payment_method_allocation_method').on(t.collectionMethodId),
  ]
);

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
export const creditsSettings = pgTable('credits_settings', {
  id: serial('id').primaryKey(),
  appSlug: varchar('app_slug', { length: 255 }).notNull().unique(),
  auditTransactionsEnabled: boolean('audit_transactions_enabled').notNull().default(false),
  // cnt: código/ambiente de contabilidad (si aplica como string)
  accountingSystemCode: varchar('accounting_system_code', {
    length: 2,
  }).notNull(),
  // online: contabiliza “en línea” vs proceso posterior
  postAccountingOnline: boolean('post_accounting_online').notNull().default(false),

  // subsi: si el módulo usa subsidio/pignoración
  subsidyEnabled: boolean('subsidy_enabled').notNull().default(false),

  // conta: si integra contabilidad
  accountingEnabled: boolean('accounting_enabled').notNull().default(true),

  // Auxiliares (glAccounts)
  cashGlAccountId: integer('cash_gl_account_id').references(() => glAccounts.id, {
    onDelete: 'restrict',
  }),
  majorGlAccountId: integer('major_gl_account_id').references(() => glAccounts.id, {
    onDelete: 'restrict',
  }),
  excessGlAccountId: integer('excess_gl_account_id').references(() => glAccounts.id, {
    onDelete: 'restrict',
  }),
  pledgeSubsidyGlAccountId: integer('pledge_subsidy_gl_account_id').references(
    () => glAccounts.id,
    { onDelete: 'restrict' }
  ),
  writeOffGlAccountId: integer('write_off_gl_account_id').references(() => glAccounts.id, {
    onDelete: 'restrict',
  }),

  // Centro de costo por defecto (Concr19)
  defaultCostCenterId: integer('default_cost_center_id').references(() => costCenters.id, {
    onDelete: 'restrict',
  }),

  // Firmas/cargos
  creditManagerName: varchar('credit_manager_name', { length: 50 }),
  creditManagerTitle: varchar('credit_manager_title', { length: 80 }),
  adminManagerName: varchar('admin_manager_name', { length: 50 }),
  adminManagerTitle: varchar('admin_manager_title', { length: 80 }),
  legalAdvisorName: varchar('legal_advisor_name', { length: 50 }),
  legalAdvisorTitle: varchar('legal_advisor_title', { length: 80 }),
  adminDirectorName: varchar('admin_director_name', { length: 50 }),
  adminDirectorTitle: varchar('admin_director_title', { length: 80 }),
  financeManagerName: varchar('finance_manager_name', { length: 50 }),
  financeManagerTitle: varchar('finance_manager_title', { length: 80 }),

  ...timestamps,
});

//======= NUEVO REQUERIMIENTOS =======

// ------------------------------------------------------------
// Parametrización de conceptos de facturación (FGA, cuota manejo, etc.)
// ------------------------------------------------------------
export const billingConceptTypeEnum = pgEnum('billing_concept_type', [
  'PRINCIPAL',
  'INTEREST',
  'LATE_INTEREST',

  'FEE', // cuota de manejo, estudio, etc.
  'INSURANCE', // seguro
  'GUARANTEE', // FGA u otras garantías
  'OTHER',
]);

export const billingConceptFrequencyEnum = pgEnum('billing_concept_frequency', [
  'ONE_TIME', // único (p.ej. estudio)
  'MONTHLY', // mensual
  'PER_INSTALLMENT', // por cuota
  'PER_EVENT', // por evento (p.ej. cobranza, mora, etc.)
]);

export const billingConceptFinancingModeEnum = pgEnum('billing_concept_financing_mode', [
  'DISCOUNT_FROM_DISBURSEMENT', // se descuenta del desembolso
  'FINANCED_IN_LOAN', // se suma/financia dentro del crédito
  'BILLED_SEPARATELY', // se cobra por fuera
]);

export const billingConceptCalcMethodEnum = pgEnum('billing_concept_calc_method', [
  'FIXED_AMOUNT', // valor fijo
  'PERCENTAGE', // porcentaje sobre una base
  'TIERED', // por rangos (como seguro por rangos)
]);

export const billingConceptBaseAmountEnum = pgEnum('billing_concept_base_amount', [
  'DISBURSED_AMOUNT', // monto desembolsado
  'PRINCIPAL', // capital
  'OUTSTANDING_BALANCE', // saldo
  'INSTALLMENT_AMOUNT', // valor cuota
]);

export const billingConceptRoundingModeEnum = pgEnum('billing_concept_rounding_mode', [
  'NEAREST',
  'UP',
  'DOWN',
]);

// ---------------------------------------------------------------------
// Billing Concepts - Catálogo
// ---------------------------------------------------------------------
export const billingConcepts = pgTable(
  'billing_concepts',
  {
    id: serial('id').primaryKey(),

    // Ej: "FGA", "CUOTA_MANEJO", "ESTUDIO_CREDITO", "SEGURO"
    code: varchar('code', { length: 50 }).notNull(),
    name: varchar('name', { length: 150 }).notNull(),
    isSystem: boolean('is_system').notNull().default(false),

    conceptType: billingConceptTypeEnum('concept_type').notNull(),

    // defaults (se pueden sobre-escribir en producto o en crédito)
    defaultFrequency: billingConceptFrequencyEnum('default_frequency').notNull(),
    defaultFinancingMode: billingConceptFinancingModeEnum('default_financing_mode').notNull(),

    // auxiliar / cuenta contable por defecto
    defaultGlAccountId: integer('default_gl_account_id').references(() => glAccounts.id, {
      onDelete: 'restrict',
    }),

    isActive: boolean('is_active').notNull().default(true),
    description: text('description'),

    ...timestamps,
  },
  (t) => [uniqueIndex('uniq_billing_concepts_code').on(t.code)]
);

export const billingConceptRangeMetricEnum = pgEnum('billing_concept_range_metric', [
  'INSTALLMENT_COUNT', // # de cuotas (1-10, 11-20, etc.)
  'DISBURSED_AMOUNT', // monto desembolsado
  'PRINCIPAL', // capital
  'OUTSTANDING_BALANCE', // saldo
  'INSTALLMENT_AMOUNT', // valor de la cuota
]);

// ---------------------------------------------------------------------
// Billing Concept Rules - Reglas / Rangos / Vigencias
// (con esto puedes modelar: fijo, porcentaje, o rangos tipo seguro)
// ---------------------------------------------------------------------
export const billingConceptRules = pgTable(
  'billing_concept_rules',
  {
    id: serial('id').primaryKey(),

    billingConceptId: integer('billing_concept_id')
      .notNull()
      .references(() => billingConcepts.id, { onDelete: 'cascade' }),

    calcMethod: billingConceptCalcMethodEnum('calc_method').notNull(),

    // base y rate aplican para PERCENTAGE / TIERED
    baseAmount: billingConceptBaseAmountEnum('base_amount'),
    rate: decimal('rate', { precision: 12, scale: 6 }),

    // amount aplica para FIXED_AMOUNT / TIERED
    amount: decimal('amount', { precision: 14, scale: 2 }),

    rangeMetric: billingConceptRangeMetricEnum('range_metric'),

    // rangos (para TIERED)
    valueFrom: decimal('value_from', { precision: 14, scale: 2 }),
    valueTo: decimal('value_to', { precision: 14, scale: 2 }),

    // topes opcionales
    minAmount: decimal('min_amount', { precision: 14, scale: 2 }),
    maxAmount: decimal('max_amount', { precision: 14, scale: 2 }),

    roundingMode: billingConceptRoundingModeEnum('rounding_mode').notNull().default('NEAREST'),
    roundingDecimals: integer('rounding_decimals').notNull().default(2),

    // vigencia
    effectiveFrom: date('effective_from'),
    effectiveTo: date('effective_to'),

    // si hay varias reglas activas que podrían aplicar, gana la mayor prioridad
    priority: integer('priority').notNull().default(0),

    isActive: boolean('is_active').notNull().default(true),

    ...timestamps,
  },
  (t) => [
    index('idx_billing_concept_rules_concept').on(t.billingConceptId),
    index('idx_billing_concept_rules_active').on(t.billingConceptId, t.isActive),
    check(
      'chk_billing_concept_rules_tier_requires_metric',
      sql`${t.calcMethod} <> 'TIERED' OR ${t.rangeMetric} IS NOT NULL`
    ),
    check(
      'chk_billing_concept_rules_range_order',
      sql`${t.valueFrom} IS NULL OR ${t.valueTo} IS NULL OR ${t.valueFrom} <= ${t.valueTo}`
    ),
  ]
);

// ---------------------------------------------------------------------
// Concr07 (credit_products) -> Conceptos por producto (línea de crédito)
// ---------------------------------------------------------------------
export const creditProductBillingConcepts = pgTable(
  'credit_product_billing_concepts',
  {
    id: serial('id').primaryKey(),

    creditProductId: integer('credit_product_id')
      .notNull()
      .references(() => creditProducts.id, { onDelete: 'cascade' }),

    billingConceptId: integer('billing_concept_id')
      .notNull()
      .references(() => billingConcepts.id, { onDelete: 'restrict' }),

    isEnabled: boolean('is_enabled').notNull().default(true),
    isMandatory: boolean('is_mandatory').notNull().default(true),

    // override por producto (si necesitas)
    overrideFrequency: billingConceptFrequencyEnum('override_frequency'),
    overrideFinancingMode: billingConceptFinancingModeEnum('override_financing_mode'),
    overrideGlAccountId: integer('override_gl_account_id').references(() => glAccounts.id, {
      onDelete: 'restrict',
    }),

    // puedes forzar una regla específica o dejar que se elija la regla activa por vigencia/rango
    overrideRuleId: integer('override_rule_id').references(() => billingConceptRules.id, {
      onDelete: 'set null',
    }),

    // orden sugerido (también te sirve luego para prioridad de aplicación de pagos)
    chargeOrder: integer('charge_order').notNull().default(0),

    ...timestamps,
  },
  (t) => [
    uniqueIndex('uniq_credit_product_billing_concepts').on(t.creditProductId, t.billingConceptId),
    index('idx_credit_product_billing_concepts_product').on(t.creditProductId),
  ]
);

// ---------------------------------------------------------------------
// Concr08 (loans) -> Conceptos “congelados” por crédito (snapshot)
// Esto es lo que te garantiza que si cambias reglas a futuro,
// el crédito ya creado conserva su configuración/valores.
// ---------------------------------------------------------------------
export const loanBillingConcepts = pgTable(
  'loan_billing_concepts',
  {
    id: serial('id').primaryKey(),

    loanId: integer('loan_id')
      .notNull()
      .references(() => loans.id, { onDelete: 'cascade' }),

    billingConceptId: integer('billing_concept_id')
      .notNull()
      .references(() => billingConcepts.id, { onDelete: 'restrict' }),

    // referencia de dónde salió (opcional pero muy útil)
    sourceCreditProductConceptId: integer('source_credit_product_concept_id').references(
      () => creditProductBillingConcepts.id,
      {
        onDelete: 'set null',
      }
    ),
    sourceRuleId: integer('source_rule_id').references(() => billingConceptRules.id, {
      onDelete: 'set null',
    }),

    // SNAPSHOT: se copian aquí los parámetros que aplicaron al momento de crear el crédito
    frequency: billingConceptFrequencyEnum('frequency').notNull(),
    financingMode: billingConceptFinancingModeEnum('financing_mode').notNull(),
    glAccountId: integer('gl_account_id').references(() => glAccounts.id, {
      onDelete: 'restrict',
    }),

    calcMethod: billingConceptCalcMethodEnum('calc_method').notNull(),
    baseAmount: billingConceptBaseAmountEnum('base_amount'),
    rate: decimal('rate', { precision: 12, scale: 6 }),
    amount: decimal('amount', { precision: 14, scale: 2 }),
    valueFrom: decimal('value_from', { precision: 14, scale: 2 }),
    valueTo: decimal('value_to', { precision: 14, scale: 2 }),
    minAmount: decimal('min_amount', { precision: 14, scale: 2 }),
    maxAmount: decimal('max_amount', { precision: 14, scale: 2 }),
    roundingMode: billingConceptRoundingModeEnum('rounding_mode').notNull().default('NEAREST'),
    roundingDecimals: integer('rounding_decimals').notNull().default(2),

    // vigencia dentro del crédito (ej: seguro solo durante el plazo)
    startDate: date('start_date'),
    endDate: date('end_date'),

    isActive: boolean('is_active').notNull().default(true),

    ...timestamps,
  },
  (t) => [
    uniqueIndex('uniq_loan_billing_concepts').on(t.loanId, t.billingConceptId),
    index('idx_loan_billing_concepts_loan').on(t.loanId),
  ]
);

export const lateInterestAgeBasisEnum = pgEnum('late_interest_age_basis', [
  'OLDEST_OVERDUE_INSTALLMENT', // la cuota vencida más antigua
  'EACH_INSTALLMENT', // calcula por cada cuota vencida
]);
// =====================================================================
// Reglas de interés de mora por edad de mora (días)
// Nota:
// - Permite “edad de mora mínima” (gracia) => primera regla empieza en daysFrom > 0
// - Permite escalonamiento por rangos de días (1-10, 11-30, etc.)
// - Ligado a Concr30 (credit_product_categories) para respetar categoría y rango de cuotas
// =====================================================================
export const creditProductLateInterestRules = pgTable(
  'credit_product_late_interest_rules',
  {
    id: serial('id').primaryKey(),

    creditProductCategoryId: integer('credit_product_category_id')
      .notNull()
      .references(() => creditProductCategories.id, { onDelete: 'cascade' }),

    // opcional: cómo medir “edad de mora”
    ageBasis: lateInterestAgeBasisEnum('age_basis').notNull().default('OLDEST_OVERDUE_INSTALLMENT'),

    // rango de días de mora al que aplica la regla
    daysFrom: integer('days_from').notNull(), // ej: 1, 5, 11, 31...
    daysTo: integer('days_to'), // null = sin tope (ej: 31+)

    // tasa/factor de mora (mismo “tipo” de dato que lateFactor)
    lateFactor: decimal('late_factor', { precision: 12, scale: 9 }).notNull(),

    // vigencia (por si cambian políticas en el tiempo)
    effectiveFrom: date('effective_from'),
    effectiveTo: date('effective_to'),

    // si hay choque de reglas, gana la mayor prioridad
    priority: integer('priority').notNull().default(0),

    isActive: boolean('is_active').notNull().default(true),

    ...timestamps,
  },
  (t) => [
    index('idx_late_rules_category').on(t.creditProductCategoryId),
    index('idx_late_rules_active').on(t.creditProductCategoryId, t.isActive),

    check('chk_late_rules_days_from_min', sql`${t.daysFrom} >= 0`),
    check('chk_late_rules_days_order', sql`${t.daysTo} IS NULL OR ${t.daysFrom} <= ${t.daysTo}`),
  ]
);

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
  'agreements',
  {
    id: serial('id').primaryKey(),

    // concr59.idecon (PK legacy)
    legacyIdecon: varchar('legacy_idecon', { length: 7 }).notNull(),

    // concr59.tipo
    typeCode: varchar('type_code', { length: 1 }).notNull(),

    // concr59.convenio
    agreementCode: varchar('agreement_code', { length: 20 }).notNull(),

    // concr59.nit
    nit: varchar('nit', { length: 17 }).notNull(),

    // concr59.razsoc
    businessName: varchar('business_name', { length: 80 }).notNull(),

    // concr59.direccion / telefono / codzon / repleg
    address: varchar('address', { length: 120 }),
    phone: varchar('phone', { length: 20 }),
    zoneCode: varchar('zone_code', { length: 5 }),
    legalRepresentative: varchar('legal_representative', { length: 80 }),

    // concr59.fecini / fecfin
    startDate: date('start_date').notNull(),
    endDate: date('end_date'),

    // concr59.nota
    note: varchar('note', { length: 255 }),

    // concr59.estado / fecest
    statusCode: varchar('status_code', { length: 1 }).notNull(),
    statusDate: date('status_date'),

    // bandera operativa (además del status legacy)
    isActive: boolean('is_active').notNull().default(true),

    ...timestamps,
  },
  (t) => [
    uniqueIndex('uniq_agreements_legacy_idecon').on(t.legacyIdecon),
    uniqueIndex('uniq_agreements_agreement_code').on(t.agreementCode),
    index('idx_agreements_nit').on(t.nit),
    index('idx_agreements_status').on(t.statusCode),
    index('idx_agreements_is_active').on(t.isActive),

    check(
      'chk_agreements_dates_order',
      sql`${t.endDate} IS NULL OR ${t.startDate} <= ${t.endDate}`
    ),
  ]
);

// =====================================================================
// Ciclos de facturación parametrizables por producto y por convenio
// =====================================================================

export const weekendPolicyEnum = pgEnum('weekend_policy', [
  'KEEP', // no mover (si cae fin de semana, se mantiene)
  'PREVIOUS_BUSINESS_DAY',
  'NEXT_BUSINESS_DAY',
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
  'billing_cycle_profiles',
  {
    id: serial('id').primaryKey(),

    name: varchar('name', { length: 150 }).notNull(),

    creditProductId: integer('credit_product_id')
      .notNull()
      .references(() => creditProducts.id, { onDelete: 'cascade' }),

    // Convenio/pagaduría. null => default del producto
    agreementId: integer('agreement_id').references(() => agreements.id, {
      onDelete: 'set null',
    }),

    // # de ciclos dentro del mes (1,2,3...)
    cyclesPerMonth: integer('cycles_per_month').notNull().default(1),

    weekendPolicy: weekendPolicyEnum('weekend_policy').notNull().default('NEXT_BUSINESS_DAY'),

    // vigencia opcional del perfil (por cambios de política)
    effectiveFrom: date('effective_from'),
    effectiveTo: date('effective_to'),

    isActive: boolean('is_active').notNull().default(true),

    ...timestamps,
  },
  (t) => [
    index('idx_billing_cycle_profiles_product').on(t.creditProductId),
    index('idx_billing_cycle_profiles_agreement').on(t.agreementId),
    index('idx_billing_cycle_profiles_active').on(t.isActive),

    check('chk_billing_cycle_profiles_cycles_per_month_min', sql`${t.cyclesPerMonth} >= 1`),
    check(
      'chk_billing_cycle_profiles_effective_order',
      sql`${t.effectiveTo} IS NULL OR ${t.effectiveFrom} IS NULL OR ${t.effectiveFrom} <= ${t.effectiveTo}`
    ),
  ]
);

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
  'billing_cycle_profile_cycles',
  {
    id: serial('id').primaryKey(),

    billingCycleProfileId: integer('billing_cycle_profile_id')
      .notNull()
      .references(() => billingCycleProfiles.id, { onDelete: 'cascade' }),

    // 1..N dentro del mes
    cycleInMonth: integer('cycle_in_month').notNull(),

    cutoffDay: integer('cutoff_day').notNull(), // día del mes (corte)
    runDay: integer('run_day').notNull(), // día del mes (generación)
    expectedPayDay: integer('expected_pay_day'), // opcional (día del mes esperado de pago)

    isActive: boolean('is_active').notNull().default(true),

    ...timestamps,
  },
  (t) => [
    uniqueIndex('uniq_billing_cycle_profile_cycle').on(t.billingCycleProfileId, t.cycleInMonth),
    index('idx_billing_cycle_profile_cycles_profile').on(t.billingCycleProfileId),

    check('chk_billing_cycle_profile_cycles_cycle_in_month_min', sql`${t.cycleInMonth} >= 1`),

    // Validación de días (1..31)
    check('chk_billing_cycle_profile_cycles_cutoff_day', sql`${t.cutoffDay} BETWEEN 1 AND 31`),
    check('chk_billing_cycle_profile_cycles_run_day', sql`${t.runDay} BETWEEN 1 AND 31`),
    check(
      'chk_billing_cycle_profile_cycles_expected_pay_day',
      sql`${t.expectedPayDay} IS NULL OR ${t.expectedPayDay} BETWEEN 1 AND 31`
    ),
  ]
);

export const riskDecisionEnum = pgEnum('risk_decision', ['PASS', 'FAIL']);
// ---------------------------------------------------------------------
// Historial de evaluaciones de riesgo por solicitud
// Guarda request/response completo (jsonb) y deja trazabilidad.
// ---------------------------------------------------------------------
export const loanApplicationRiskAssessments = pgTable(
  'loan_application_risk_assessments',
  {
    id: serial('id').primaryKey(),

    loanApplicationId: integer('loan_application_id')
      .notNull()
      .references(() => loanApplications.id, { onDelete: 'cascade' }),

    // trazabilidad
    executedByUserId: integer('executed_by_user_id').notNull(),
    executedAt: timestamp('executed_at', { withTimezone: true }).notNull().defaultNow(),

    // resultado normalizado
    decision: riskDecisionEnum('decision'),
    score: decimal('score', { precision: 12, scale: 5 }),

    // evidencia completa
    requestPayload: jsonb('request_payload'),
    responsePayload: jsonb('response_payload'),

    // error si falló integración
    errorMessage: varchar('error_message', { length: 255 }),

    // nota manual (ej: "se aprobó por excepción")
    note: varchar('note', { length: 255 }),

    ...timestamps,
  },
  (t) => [
    index('idx_risk_assessments_application').on(t.loanApplicationId),
    index('idx_risk_assessments_executed_at').on(t.executedAt),
  ]
);

// ---------------------------------------------------------------------
// Caneles de creacion de creditos
// ---------------------------------------------------------------------
export const channels = pgTable(
  'channels',
  {
    id: serial('id').primaryKey(),
    code: varchar('code', { length: 30 }).notNull(), // WEB, MOBILE, API, BACKOFFICE, BATCH...
    name: varchar('name', { length: 100 }).notNull(),
    description: varchar('description', { length: 255 }),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex('uniq_channels_code').on(t.code), index('idx_channels_active').on(t.isActive)]
);

// ---------------------------------------------------------------------
// Historial de estados (trazabilidad del ciclo)
// ---------------------------------------------------------------------
export const loanApplicationStatusHistory = pgTable(
  'loan_application_status_history',
  {
    id: serial('id').primaryKey(),

    loanApplicationId: integer('loan_application_id')
      .notNull()
      .references(() => loanApplications.id, { onDelete: 'cascade' }),

    fromStatus: loanApplicationStatusEnum('from_status'),
    toStatus: loanApplicationStatusEnum('to_status').notNull(),

    changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),

    // quién cambió el estado (nullable si fue job/automatización)
    changedByUserId: uuid('changed_by_user_id').notNull(),

    note: varchar('note', { length: 255 }),

    metadata: jsonb('metadata'),

    ...timestamps,
  },
  (t) => [
    index('idx_loan_app_status_hist_app').on(t.loanApplicationId),
    index('idx_loan_app_status_hist_changed_at').on(t.changedAt),
  ]
);

// ---------------------------------------------------------------------
// Eventos / Integraciones (trazabilidad técnica + payloads)
// ---------------------------------------------------------------------
export const loanApplicationEvents = pgTable(
  'loan_application_events',
  {
    id: serial('id').primaryKey(),

    loanApplicationId: integer('loan_application_id')
      .notNull()
      .references(() => loanApplications.id, { onDelete: 'cascade' }),

    eventKey: varchar('event_key', { length: 60 }).notNull(), // ej: RISK_CHECK, DATA_CREDITO, SAP_POSTING

    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),

    actorUserId: uuid('actor_user_id'),

    correlationId: varchar('correlation_id', { length: 100 }),

    // ✅ evidencia HTTP (opcional)
    httpMethod: varchar('http_method', { length: 10 }), // GET/POST/PUT...
    endpoint: varchar('endpoint', { length: 200 }), // guarda ruta "plantilla": /risk/check, no /risk/check/123
    httpStatus: integer('http_status'),
    durationMs: integer('duration_ms'),

    // payloads
    requestPayload: jsonb('request_payload'),
    responsePayload: jsonb('response_payload'),
    metadata: jsonb('metadata'),

    eventStatus: varchar('event_status', { length: 15 }).notNull().default('OK'), // OK/ERROR/PENDING
    message: varchar('message', { length: 255 }),

    ...timestamps,
  },
  (t) => [
    index('idx_loan_app_events_app').on(t.loanApplicationId),
    index('idx_loan_app_events_occurred_at').on(t.occurredAt),
    index('idx_loan_app_events_key').on(t.eventKey),
    index('idx_loan_app_events_status').on(t.eventStatus),
  ]
);

// ---------------------------------------------------------------------
// Políticas de refinanciación / consolidación por producto (concr07)
// Nota (ES):
// Permite parametrizar reglas: si se permite, límites, elegibilidad, etc.
// ---------------------------------------------------------------------
export const creditProductRefinancePolicies = pgTable(
  'credit_product_refinance_policies',
  {
    id: serial('id').primaryKey(),

    creditProductId: integer('credit_product_id')
      .notNull()
      .references(() => creditProducts.id, { onDelete: 'cascade' }),

    allowRefinance: boolean('allow_refinance').notNull().default(false),
    allowConsolidation: boolean('allow_consolidation').notNull().default(false),

    // límites / elegibilidad
    maxLoansToConsolidate: integer('max_loans_to_consolidate').notNull().default(1),
    minLoanAgeDays: integer('min_loan_age_days').notNull().default(0),
    maxDaysPastDue: integer('max_days_past_due').notNull().default(99999),
    minPaidInstallments: integer('min_paid_installments').notNull().default(0),
    maxRefinanceCount: integer('max_refinance_count').notNull().default(99),

    // tratamiento (si quieres dejarlo preparado)
    capitalizeArrears: boolean('capitalize_arrears').notNull().default(false),

    // control
    requireApproval: boolean('require_approval').notNull().default(false),
    allowOverride: boolean('allow_override').notNull().default(true),

    isActive: boolean('is_active').notNull().default(true),

    ...timestamps,
  },
  (t) => [
    uniqueIndex('uniq_refi_policy_product').on(t.creditProductId),
    index('idx_refi_policy_active').on(t.isActive),

    check('chk_refi_policy_max_loans_min', sql`${t.maxLoansToConsolidate} >= 1`),
    check('chk_refi_policy_min_age_min', sql`${t.minLoanAgeDays} >= 0`),
    check('chk_refi_policy_max_dpd_min', sql`${t.maxDaysPastDue} >= 0`),
    check('chk_refi_policy_min_paid_min', sql`${t.minPaidInstallments} >= 0`),
    check('chk_refi_policy_max_refi_min', sql`${t.maxRefinanceCount} >= 0`),
  ]
);

export const agingProfiles = pgTable(
  'aging_profiles',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 150 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    effectiveFrom: date('effective_from'),
    effectiveTo: date('effective_to'),
    note: varchar('note', { length: 255 }),
    ...timestamps,
  },
  (t) => [
    index('idx_aging_profiles_active').on(t.isActive),
    check(
      'chk_aging_profiles_effective_order',
      sql`${t.effectiveTo} IS NULL OR ${t.effectiveFrom} IS NULL OR ${t.effectiveFrom} <= ${t.effectiveTo}`
    ),
  ]
);

export const agingBuckets = pgTable(
  'aging_buckets',
  {
    id: serial('id').primaryKey(),

    agingProfileId: integer('aging_profile_id')
      .notNull()
      .references(() => agingProfiles.id, { onDelete: 'cascade' }),

    // orden en reportes
    sortOrder: integer('sort_order').notNull().default(0),

    name: varchar('name', { length: 60 }).notNull(), // ej: "Corriente", "1-30", "31-60"
    daysFrom: integer('days_from').notNull().default(0),
    daysTo: integer('days_to'), // null = abierto (ej: 360+)

    // % provisión para ese bucket
    provisionRate: decimal('provision_rate', { precision: 12, scale: 6 }),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('uniq_aging_bucket_profile_order').on(t.agingProfileId, t.sortOrder),
    index('idx_aging_buckets_profile').on(t.agingProfileId),
    check('chk_aging_bucket_days_from_min', sql`${t.daysFrom} >= 0`),
    check('chk_aging_bucket_days_order', sql`${t.daysTo} IS NULL OR ${t.daysFrom} <= ${t.daysTo}`),
  ]
);

// ---------------------------------------------------------------------
// portfolio_provision_snapshots (cabecera)
// portfolio_provision_snapshots: cabecera del cálculo mensual de provisiones
//  para un periodo contable y un agingProfile (versión de edades/buckets).
//   Guarda totales y el DELTA contable (lo que se debe contabilizar ese mes).
// ---------------------------------------------------------------------
export const portfolioProvisionSnapshots = pgTable(
  'portfolio_provision_snapshots',
  {
    id: serial('id').primaryKey(),

    accountingPeriodId: integer('accounting_period_id')
      .notNull()
      .references(() => accountingPeriods.id, { onDelete: 'restrict' }),

    // ✅ versión de buckets usada en el cálculo
    agingProfileId: integer('aging_profile_id')
      .notNull()
      .references(() => agingProfiles.id, { onDelete: 'restrict' }),

    generatedAt: timestamp('generated_at', { withTimezone: true }).notNull().defaultNow(),

    generatedByUserId: uuid('generated_by_user_id').notNull(),

    // Totales del cálculo del mes (as-of cierre)
    totalBaseAmount: decimal('total_base_amount', {
      precision: 14,
      scale: 2,
    }).notNull(),
    totalRequiredProvision: decimal('total_required_provision', {
      precision: 14,
      scale: 2,
    }).notNull(),

    previousProvisionBalance: decimal('previous_provision_balance', {
      precision: 14,
      scale: 2,
    })
      .notNull()
      .default('0'),

    deltaToPost: decimal('delta_to_post', {
      precision: 14,
      scale: 2,
    }).notNull(),

    note: varchar('note', { length: 255 }),
    metadata: jsonb('metadata'),

    ...timestamps,
  },
  (t) => [
    // 1 snapshot por periodo + profile (si quieres permitir varios, quita este unique)
    uniqueIndex('uniq_provision_snapshot_period_profile').on(
      t.accountingPeriodId,
      t.agingProfileId
    ),

    index('idx_provision_snapshot_period').on(t.accountingPeriodId),
    index('idx_provision_snapshot_profile').on(t.agingProfileId),
  ]
);

// ---------------------------------------------------------------------
// portfolio_provision_snapshot_details (detalle)
//detalle por línea de cartera (aging snapshot)
//   y por bucket. NO duplica dimensiones (producto/auxiliar/tercero/loan/etc) porque
//   esas ya están en portfolio_aging_snapshots. El detalle referencia agingSnapshotId.
// ---------------------------------------------------------------------
export const portfolioProvisionSnapshotDetails = pgTable(
  'portfolio_provision_snapshot_details',
  {
    id: serial('id').primaryKey(),

    provisionSnapshotId: integer('provision_snapshot_id')
      .notNull()
      .references(() => portfolioProvisionSnapshots.id, {
        onDelete: 'cascade',
      }),

    // ✅ referencia a la fila del cierre de cartera (ya contiene producto/auxiliar/loan/tercero/etc)
    agingSnapshotId: integer('aging_snapshot_id')
      .notNull()
      .references(() => portfolioAgingSnapshots.id, { onDelete: 'cascade' }),

    // ✅ bucket (edad) usado en esa línea
    agingBucketId: integer('aging_bucket_id')
      .notNull()
      .references(() => agingBuckets.id, { onDelete: 'restrict' }),

    // base para esa línea y bucket (monto de cartera que cae en ese bucket)
    baseAmount: decimal('base_amount', { precision: 14, scale: 2 }).notNull(),

    // snapshot del % aplicado (copiado al cierre para auditoría, no depende del bucket actual)
    provisionRate: decimal('provision_rate', { precision: 12, scale: 6 }),

    // provisión calculada para esa línea y bucket
    provisionAmount: decimal('provision_amount', {
      precision: 14,
      scale: 2,
    }).notNull(),

    ...timestamps,
  },
  (t) => [
    uniqueIndex('uniq_provision_detail_line_bucket').on(
      t.provisionSnapshotId,
      t.agingSnapshotId,
      t.agingBucketId
    ),
    index('idx_provision_detail_snapshot').on(t.provisionSnapshotId),
    index('idx_provision_detail_aging_snapshot').on(t.agingSnapshotId),
    index('idx_provision_detail_bucket').on(t.agingBucketId),

    check('chk_provision_detail_base_nonneg', sql`${t.baseAmount} >= 0`),
    check('chk_provision_detail_amount_nonneg', sql`${t.provisionAmount} >= 0`),
  ]
);

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

export const overpaymentHandlingEnum = pgEnum('overpayment_handling', [
  'EXCESS_BALANCE', // saldo a favor / excedente
  'APPLY_TO_PRINCIPAL',
  'APPLY_TO_FUTURE_INSTALLMENTS',
]);

export const allocationScopeEnum = pgEnum('allocation_scope', [
  'ONLY_PAST_DUE', // solo vencido
  'PAST_DUE_FIRST', // vencido primero, luego vigente si sobra
  'CURRENT_ALLOWED', // permite vigente (prepago) directamente
]);

export const orderWithinEnum = pgEnum('allocation_order_within', [
  'DUE_DATE_ASC', // más antiguo primero
  'INSTALLMENT_ASC', // cuota # menor primero
]);

export const paymentAllocationPolicies = pgTable(
  'payment_allocation_policies',
  {
    id: serial('id').primaryKey(),
    code: varchar('code', { length: 40 }).notNull(), // ej: NORMAL, CAPITAL_ONLY
    name: varchar('name', { length: 120 }).notNull(),

    overpaymentHandling: overpaymentHandlingEnum('overpayment_handling')
      .notNull()
      .default('EXCESS_BALANCE'),

    isActive: boolean('is_active').notNull().default(true),
    note: varchar('note', { length: 255 }),

    ...timestamps,
  },
  (t) => [
    uniqueIndex('uniq_payment_allocation_policies_code').on(t.code),
    index('idx_payment_allocation_policies_active').on(t.isActive),
  ]
);

export const paymentAllocationPolicyRules = pgTable(
  'payment_allocation_policy_rules',
  {
    id: serial('id').primaryKey(),

    policyId: integer('policy_id')
      .notNull()
      .references(() => paymentAllocationPolicies.id, { onDelete: 'cascade' }),

    // prelación
    priority: integer('priority').notNull(),

    // destino de imputación (SYSTEM o CUSTOM)
    billingConceptId: integer('billing_concept_id')
      .notNull()
      .references(() => billingConcepts.id, { onDelete: 'restrict' }),

    scope: allocationScopeEnum('scope').notNull().default('PAST_DUE_FIRST'),
    orderWithin: orderWithinEnum('order_within').notNull().default('DUE_DATE_ASC'),

    isActive: boolean('is_active').notNull().default(true),
    note: varchar('note', { length: 255 }),

    ...timestamps,
  },
  (t) => [
    uniqueIndex('uniq_payment_alloc_rule_order').on(t.policyId, t.priority),
    index('idx_payment_alloc_rules_policy').on(t.policyId),
    index('idx_payment_alloc_rules_concept').on(t.billingConceptId),

    check('chk_payment_alloc_rule_priority_min', sql`${t.priority} >= 1`),
  ]
);
