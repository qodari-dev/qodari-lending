import React from 'react';
import type { PdfTemplateBuilder } from '../types';
import { createBaseStyles } from '../theme';
import { formatCurrency, formatDate, formatDateTime, formatNumber } from '@/utils/formatters';
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

export type WorkerStudyPdfData = z.infer<typeof WorkerStudyResponseSchema>;

type Contribution = WorkerStudyPdfData['contributions'][number];
type CompanyHistory = WorkerStudyPdfData['companyHistory'][number];
type LoanApplication = WorkerStudyPdfData['loanApplications'][number];
type Credit = WorkerStudyPdfData['credits'][number];

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
    getValue: (r) => formatCurrency(r.contributionBaseSalary),
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
    children: [
      h(Text, { style: styles.title, key: 'title' }, 'ESTUDIO DE TRABAJADOR'),

      // -- Worker info --
      ...MetaLines(rpdf, styles, [
        { label: 'Nombre', value: data.worker.fullName },
        {
          label: 'Documento',
          value: `${data.worker.identificationTypeCode} ${data.worker.documentNumber}`,
        },
        { label: 'Generado', value: formatDateTime(data.generatedAt) },
      ]),

      // -- Salary & trajectory --
      ...(data.salary || data.trajectory
        ? [
            h(Text, { style: styles.sectionTitle, key: 'sec-salary' }, 'Salario y trayectoria'),
            SummaryGrid(rpdf, styles, [
              ...(data.salary
                ? [
                    { label: 'Salario actual', value: formatCurrency(data.salary.currentSalary) },
                    {
                      label: 'Promedio 6 meses',
                      value: formatCurrency(data.salary.averageSalaryLastSixMonths),
                    },
                    {
                      label: 'Mas alto 6 meses',
                      value: formatCurrency(data.salary.highestSalaryLastSixMonths),
                    },
                  ]
                : []),
              ...(data.trajectory
                ? [
                    {
                      label: 'Meses de aportes',
                      value: formatNumber(data.trajectory.totalContributionMonths),
                    },
                    { label: 'Empresa actual', value: data.trajectory.currentCompanyName ?? '-' },
                    { label: 'Empresa anterior', value: data.trajectory.previousCompanyName ?? '-' },
                  ]
                : []),
            ]),
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

      // -- Footer --
      h(
        Text,
        { style: { ...styles.small, marginTop: 20 }, key: 'print-date' },
        `Fecha de generacion: ${formatDateTime(data.generatedAt)}`,
      ),
    ],
  });
};
