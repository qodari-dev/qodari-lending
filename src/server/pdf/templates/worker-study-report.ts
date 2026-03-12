import React from 'react';
import type { PdfTemplateBuilder } from '../types';
import { createBaseStyles } from '../theme';
import { formatCurrency, formatDate, formatNumber } from '@/utils/formatters';
import { PageShell, MetaLines, SummaryGrid, PdfTable, type TableColumn } from '../components';
import { WorkerStudyResponseSchema } from '@/schemas/credit-simulation';
import {
  loanApplicationStatusLabels,
  type LoanApplicationStatus,
} from '@/schemas/loan-application';
import {
  loanDisbursementStatusLabels,
  type LoanDisbursementStatus,
  loanStatusLabels,
  type LoanStatus,
} from '@/schemas/loan';
import type { z } from 'zod';

const h = React.createElement;

export type WorkerStudyPdfData = z.infer<typeof WorkerStudyResponseSchema> & {
  companyName?: string;
};

type Contribution = WorkerStudyPdfData['contributions'][number];
type CompanyHistory = WorkerStudyPdfData['companyHistory'][number];
type LoanApplication = WorkerStudyPdfData['loanApplications'][number];
type Credit = WorkerStudyPdfData['credits'][number];
type Beneficiary = WorkerStudyPdfData['beneficiaries'][number];
type SubsidyPayment = WorkerStudyPdfData['subsidyPayments'][number];

const paymentBehaviorLabels: Record<Credit['paymentBehavior'], string> = {
  PAID: 'Pagado',
  CURRENT: 'Al dia',
  OVERDUE: 'Con mora',
};

// ---------------------------------------------------------------------------
// Table column definitions
// ---------------------------------------------------------------------------

const contributionColumns: TableColumn<Contribution>[] = [
  { header: 'Periodo', width: '20%', getValue: (r) => r.period },
  { header: 'Empresa', width: '35%', getValue: (r) => r.companyName },
  {
    header: 'IBC',
    width: '22%',
    textAlign: 'right',
    getValue: (r) => formatCurrency(r.baseSalary),
  },
  {
    header: 'Valor aporte',
    width: '23%',
    textAlign: 'right',
    getValue: (r) => formatCurrency(r.contributionValue),
  },
];

const companyHistoryColumns: TableColumn<CompanyHistory>[] = [
  { header: 'Empresa', width: '35%', getValue: (r) => r.companyName },
  { header: 'Desde', width: '20%', getValue: (r) => formatDate(r.fromDate) },
  {
    header: 'Hasta',
    width: '20%',
    getValue: (r) => (r.toDate ? formatDate(r.toDate) : 'Actual'),
  },
  {
    header: 'Meses',
    width: '25%',
    textAlign: 'right',
    getValue: (r) => formatNumber(r.contributionMonths),
  },
];

const loanApplicationColumns: TableColumn<LoanApplication>[] = [
  { header: 'Solicitud', width: '15%', getValue: (r) => r.creditNumber },
  { header: 'Fecha', width: '14%', getValue: (r) => formatDate(r.applicationDate) },
  { header: 'Producto', width: '20%', getValue: (r) => r.creditProductName ?? '-' },
  {
    header: 'Estado',
    width: '13%',
    getValue: (r) =>
      loanApplicationStatusLabels[r.status as LoanApplicationStatus] ?? r.status,
  },
  {
    header: 'Solicitado',
    width: '19%',
    textAlign: 'right',
    getValue: (r) => formatCurrency(r.requestedAmount),
  },
  {
    header: 'Aprobado',
    width: '19%',
    textAlign: 'right',
    getValue: (r) => (r.approvedAmount !== null ? formatCurrency(r.approvedAmount) : '-'),
  },
];

const beneficiaryColumns: TableColumn<Beneficiary>[] = [
  { header: 'Nombre', width: '30%', getValue: (r) => r.fullName },
  { header: 'Documento', width: '18%', getValue: (r) => r.documentNumber ?? '-' },
  { header: 'Parentesco', width: '17%', getValue: (r) => r.relationship ?? '-' },
  { header: 'Nacimiento', width: '15%', getValue: (r) => r.birthDate ? formatDate(r.birthDate) : '-' },
  {
    header: 'Edad',
    width: '10%',
    textAlign: 'right',
    getValue: (r) => r.age !== null ? String(r.age) : '-',
  },
  { header: 'Estado', width: '10%', getValue: (r) => r.isDeceased ? 'Fallecido' : 'Activo' },
];

const subsidyPaymentColumns: TableColumn<SubsidyPayment>[] = [
  { header: 'Periodo', width: '14%', getValue: (r) => r.period },
  { header: 'Parentesco', width: '16%', getValue: (r) => r.beneficiaryRelationship ?? '-' },
  { header: 'Tipo pago', width: '16%', getValue: (r) => r.paymentType ?? '-' },
  { header: 'Cuota #', width: '10%', getValue: (r) => r.installmentNumber ?? '-' },
  {
    header: 'Valor',
    width: '16%',
    textAlign: 'right',
    getValue: (r) => formatCurrency(r.installmentValue),
  },
  { header: 'Per. giro', width: '14%', getValue: (r) => r.transferPeriod ?? '-' },
  { header: 'Anulado', width: '14%', getValue: (r) => r.isVoided ? 'Si' : 'No' },
];

const creditColumns: TableColumn<Credit>[] = [
  { header: 'Credito', width: '12%', getValue: (r) => r.creditNumber },
  {
    header: 'Estado',
    width: '11%',
    getValue: (r) => loanStatusLabels[r.status as LoanStatus] ?? r.status,
  },
  {
    header: 'Desembolso',
    width: '13%',
    getValue: (r) =>
      loanDisbursementStatusLabels[r.disbursementStatus as LoanDisbursementStatus] ??
      r.disbursementStatus,
  },
  {
    header: 'Capital',
    width: '13%',
    textAlign: 'right',
    getValue: (r) => formatCurrency(r.principalAmount),
  },
  {
    header: 'Saldo',
    width: '13%',
    textAlign: 'right',
    getValue: (r) => formatCurrency(r.currentBalance),
  },
  {
    header: 'Mora',
    width: '12%',
    textAlign: 'right',
    getValue: (r) => formatCurrency(r.overdueBalance),
  },
  {
    header: 'Abonado',
    width: '13%',
    textAlign: 'right',
    getValue: (r) => formatCurrency(r.totalPaid),
  },
  {
    header: 'Comp.',
    width: '13%',
    getValue: (r) => paymentBehaviorLabels[r.paymentBehavior],
  },
];

// ---------------------------------------------------------------------------
// Template
// ---------------------------------------------------------------------------

export const workerStudyReportTemplate: PdfTemplateBuilder<WorkerStudyPdfData> = (
  data,
  rpdf,
) => {
  const { Text } = rpdf;
  const styles = createBaseStyles(rpdf);

  return PageShell(rpdf, {
    styles,
    headerTitle: 'Estudio de trabajador',
    companyName: data.companyName,
    children: [
      // -- Worker info --
      ...MetaLines(rpdf, styles, [
        { label: 'Nombre', value: data.worker.fullName },
        {
          label: 'Documento',
          value: `${data.worker.identificationTypeCode} ${data.worker.documentNumber}`,
        },
      ]),

      // -- Worker details --
      h(Text, { style: styles.sectionTitle, key: 'sec-worker-details' }, 'Datos del trabajador'),
      SummaryGrid(rpdf, styles, [
        {
          label: 'Salario actual',
          value: data.worker.currentSalary != null
            ? formatCurrency(data.worker.currentSalary)
            : '-',
        },
        { label: 'Categoria', value: data.worker.categoryCode ?? '-' },
        { label: 'Sexo', value: data.worker.sex ?? '-' },
        { label: 'Direccion', value: data.worker.address ?? '-' },
        { label: 'Telefono', value: data.worker.phone ?? '-' },
        { label: 'Email', value: data.worker.email ?? '-' },
        { label: 'Fuente subsidio', value: data.subsidySource ?? '-' },
      ]),

      // -- Spouses --
      ...(data.spouses.length > 0
        ? [
            h(Text, { style: styles.sectionTitle, key: 'sec-spouses' }, 'Conyuges'),
            ...data.spouses.map((spouse) =>
              SummaryGrid(rpdf, styles, [
                { label: 'Nombre', value: spouse.fullName },
                { label: 'Documento', value: spouse.documentNumber ?? '-' },
                { label: 'Nacimiento', value: spouse.birthDate ? formatDate(spouse.birthDate) : '-' },
              ])
            ),
          ]
        : []),

      // -- Contributions --
      h(Text, { style: styles.sectionTitle, key: 'sec-contributions' }, 'Historial de aportes'),
      PdfTable(rpdf, styles, {
        columns: contributionColumns,
        rows: data.contributions,
        emptyMessage: 'Sin informacion de aportes.',
        keyExtractor: (r) => `contrib-${r.period}`,
        tableKey: 'contributions',
      }),

      // -- Company history --
      h(Text, { style: styles.sectionTitle, key: 'sec-companies' }, 'Historial de empresas'),
      PdfTable(rpdf, styles, {
        columns: companyHistoryColumns,
        rows: data.companyHistory,
        emptyMessage: 'Sin informacion de empresas.',
        keyExtractor: (r) => `company-${r.companyName}-${r.fromDate}`,
        tableKey: 'companies',
      }),

      // -- Loan applications --
      h(
        Text,
        { style: styles.sectionTitle, key: 'sec-applications' },
        'Solicitudes de credito',
      ),
      PdfTable(rpdf, styles, {
        columns: loanApplicationColumns,
        rows: data.loanApplications,
        emptyMessage: 'Sin solicitudes registradas.',
        keyExtractor: (r) => `app-${r.id}`,
        tableKey: 'applications',
      }),

      // -- Credits --
      h(Text, { style: styles.sectionTitle, key: 'sec-credits' }, 'Creditos y cartera'),
      PdfTable(rpdf, styles, {
        columns: creditColumns,
        rows: data.credits,
        emptyMessage: 'Sin creditos registrados.',
        keyExtractor: (r) => `credit-${r.id}`,
        tableKey: 'credits',
      }),

      // -- Beneficiaries --
      h(Text, { style: styles.sectionTitle, key: 'sec-beneficiaries' }, 'Beneficiarios'),
      PdfTable(rpdf, styles, {
        columns: beneficiaryColumns,
        rows: data.beneficiaries,
        emptyMessage: 'Sin beneficiarios registrados.',
        keyExtractor: (r) => `ben-${r.documentNumber ?? r.fullName}`,
        tableKey: 'beneficiaries',
      }),

      // -- Subsidy payments --
      h(
        Text,
        { style: styles.sectionTitle, key: 'sec-subsidy-payments' },
        'Historial de giro de subsidio',
      ),
      PdfTable(rpdf, styles, {
        columns: subsidyPaymentColumns,
        rows: data.subsidyPayments,
        emptyMessage: 'Sin historial de giros.',
        keyExtractor: (r) => `sp-${r.period}-${r.installmentNumber ?? ''}-${r.beneficiaryRelationship ?? ''}`,
        tableKey: 'subsidy-payments',
      }),

      // -- Notes --
      ...(data.notes
        ? [
            h(
              Text,
              { style: styles.sectionTitle, key: 'sec-notes' },
              'Observaciones',
            ),
            h(Text, { style: styles.metaLine, key: 'notes-content' }, data.notes),
          ]
        : []),

    ],
  });
};
