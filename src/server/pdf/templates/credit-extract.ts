import React from 'react';
import { CreditExtractReportResponse } from '@/schemas/credit-report';
import { PdfTemplateBuilder } from '../types';
import { createBaseStyles } from '../theme';
import { formatCurrency, formatDate } from '../format';
import { PageShell, MetaLines, SummaryGrid, PdfTable, TableColumn } from '../components';

const h = React.createElement;

const movementColumns: TableColumn<CreditExtractReportResponse['clientStatement']['movements'][number]>[] = [
  {
    header: 'Fecha',
    width: '12%',
    getValue: (r) => formatDate(r.entryDate),
  },
  {
    header: 'Movimiento',
    width: '16%',
    paddingRight: 4,
    getValue: (r) => r.movement,
  },
  {
    header: 'Referencia',
    width: '16%',
    getValue: (r) => r.reference,
  },
  {
    header: 'Concepto',
    width: '24%',
    paddingRight: 4,
    getValue: (r) => r.concept,
  },
  {
    header: 'Cargo',
    width: '10%',
    textAlign: 'right',
    getValue: (r) => formatCurrency(r.chargeAmount),
  },
  {
    header: 'Abono',
    width: '10%',
    textAlign: 'right',
    getValue: (r) => formatCurrency(r.paymentAmount),
  },
  {
    header: 'Saldo',
    width: '12%',
    textAlign: 'right',
    getValue: (r) => formatCurrency(r.runningBalance),
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
      h(Text, { style: styles.sectionTitle, key: 'sec-summary' }, 'Situacion actual del credito'),
      SummaryGrid(rpdf, styles, [
        { label: 'Saldo actual', value: formatCurrency(data.balanceSummary.currentBalance) },
        { label: 'Saldo vencido', value: formatCurrency(data.balanceSummary.overdueBalance) },
        { label: 'Saldo al dia', value: formatCurrency(data.balanceSummary.currentDueBalance) },
        { label: 'Cuotas abiertas', value: String(data.balanceSummary.openInstallments) },
        { label: 'Proximo vencimiento', value: formatDate(data.balanceSummary.nextDueDate) },
      ]),
      h(Text, { style: styles.sectionTitle, key: 'sec-period' }, 'Resumen del periodo del extracto'),
      SummaryGrid(rpdf, styles, [
        { label: 'Saldo inicial', value: formatCurrency(data.clientStatement.openingBalance) },
        { label: 'Cargos del periodo', value: formatCurrency(data.clientStatement.totalCharges) },
        { label: 'Abonos del periodo', value: formatCurrency(data.clientStatement.totalPayments) },
        { label: 'Saldo final', value: formatCurrency(data.clientStatement.closingBalance) },
      ]),
      h(Text, { style: styles.sectionTitle, key: 'sec-movements' }, 'Movimientos del extracto'),
      PdfTable(rpdf, styles, {
        columns: movementColumns,
        rows: data.clientStatement.movements,
        emptyMessage: 'Sin movimientos.',
        keyExtractor: (r) => r.id,
        tableKey: 'movements',
      }),
    ],
  });
};
