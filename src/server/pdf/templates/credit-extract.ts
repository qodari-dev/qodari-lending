import React from 'react';
import { CreditExtractReportResponse } from '@/schemas/report-credit';
import { LoanBalanceByAccount, LoanStatementEntry } from '@/schemas/loan';
import { PdfTemplateBuilder } from '../types';
import { createBaseStyles } from '../theme';
import { formatCurrency, formatDate } from '../format';
import { PageShell, MetaLines, SummaryGrid, PdfTable, TableColumn } from '../components';

const h = React.createElement;

const balanceColumns: TableColumn<LoanBalanceByAccount>[] = [
  {
    header: 'Auxiliar',
    width: '40%',
    paddingRight: 4,
    getValue: (r) => [r.glAccountCode, r.glAccountName].filter(Boolean).join(' - ') || '-',
  },
  {
    header: 'Cargos',
    width: '20%',
    textAlign: 'right',
    getValue: (r) => formatCurrency(r.chargeAmount),
  },
  {
    header: 'Pagos',
    width: '20%',
    textAlign: 'right',
    getValue: (r) => formatCurrency(r.paymentAmount),
  },
  {
    header: 'Saldo',
    width: '20%',
    textAlign: 'right',
    getValue: (r) => formatCurrency(r.balance),
  },
];

const movementColumns: TableColumn<LoanStatementEntry>[] = [
  {
    header: 'Fecha',
    width: '10%',
    getValue: (r) => formatDate(r.entryDate),
  },
  {
    header: 'Fuente',
    width: '15%',
    paddingRight: 4,
    getValue: (r) =>
      r.relatedPaymentNumber ? `${r.sourceLabel} (${r.relatedPaymentNumber})` : r.sourceLabel,
  },
  {
    header: 'Doc',
    width: '8%',
    getValue: (r) => `${r.documentCode}-${r.sequence}`,
  },
  {
    header: 'Cuenta',
    width: '20%',
    paddingRight: 4,
    getValue: (r) => [r.glAccountCode, r.glAccountName].filter(Boolean).join(' - ') || '-',
  },
  {
    header: 'Nat',
    width: '6%',
    getValue: (r) => r.nature,
  },
  {
    header: 'Valor',
    width: '12%',
    textAlign: 'right',
    getValue: (r) => formatCurrency(r.amount),
  },
  {
    header: 'Delta',
    width: '12%',
    textAlign: 'right',
    getValue: (r) => formatCurrency(r.receivableDelta),
  },
  {
    header: 'Saldo',
    width: '12%',
    textAlign: 'right',
    getValue: (r) => formatCurrency(r.runningBalance),
  },
  {
    header: 'Estado',
    width: '9%',
    getValue: (r) => r.status,
  },
];

export const creditExtractTemplate: PdfTemplateBuilder<CreditExtractReportResponse> = (
  data,
  rpdf,
) => {
  const { Text } = rpdf;
  const styles = createBaseStyles(rpdf);

  return PageShell(rpdf, {
    children: [
      h(Text, { style: styles.title, key: 'title' }, 'Extracto de credito'),
      ...MetaLines(rpdf, styles, [
        { label: 'Credito', value: data.loan.creditNumber },
        { label: 'Titular', value: data.loan.borrowerName },
        { label: 'Documento', value: data.loan.borrowerDocumentNumber ?? '-' },
        { label: 'Estado', value: data.loan.status },
        { label: 'Generado', value: formatDate(data.generatedAt) },
        { label: 'Oficina', value: data.loan.affiliationOfficeName ?? '-' },
        { label: 'Convenio', value: data.loan.agreementLabel ?? '-' },
      ]),
      h(Text, { style: styles.sectionTitle, key: 'sec-summary' }, 'Resumen de saldo'),
      SummaryGrid(rpdf, styles, [
        { label: 'Saldo actual', value: formatCurrency(data.balanceSummary.currentBalance) },
        { label: 'Saldo vencido', value: formatCurrency(data.balanceSummary.overdueBalance) },
        { label: 'Cuotas abiertas', value: String(data.balanceSummary.openInstallments) },
        { label: 'Total causado', value: formatCurrency(data.balanceSummary.totalCharged) },
        { label: 'Total pagado', value: formatCurrency(data.balanceSummary.totalPaid) },
        { label: 'Proximo vencimiento', value: formatDate(data.balanceSummary.nextDueDate) },
      ]),
      h(Text, { style: styles.sectionTitle, key: 'sec-balance' }, 'Saldo por auxiliar'),
      ...PdfTable(rpdf, styles, {
        columns: balanceColumns,
        rows: data.balanceSummary.byAccount,
        emptyMessage: 'Sin informacion de cartera por auxiliar.',
        keyExtractor: (r) => `bal-${r.glAccountId}`,
        tableKey: 'balance',
      }),
      h(Text, { style: styles.sectionTitle, key: 'sec-movements' }, 'Movimientos'),
      ...PdfTable(rpdf, styles, {
        columns: movementColumns,
        rows: data.statement.entries,
        emptyMessage: 'Sin movimientos.',
        keyExtractor: (r) => `mov-${r.id}`,
        tableKey: 'movements',
      }),
    ],
  });
};
