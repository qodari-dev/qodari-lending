import React from 'react';
import type { PdfTemplateBuilder } from '../types';
import { createBaseStyles } from '../theme';
import { formatCurrency, formatDate, formatPercent, formatNumber } from '@/utils/formatters';
import { PageShell, MetaLines, SummaryGrid, PdfTable, type TableColumn } from '../components';
import { financingTypeLabels } from '@/schemas/credit-product';
import { CalculateCreditSimulationResponseSchema } from '@/schemas/credit-simulation';
import type { z } from 'zod';

const h = React.createElement;

export type CreditSimulationPdfData = z.infer<typeof CalculateCreditSimulationResponseSchema> & {
  printDate: string;
};

type InstallmentRow = CreditSimulationPdfData['installments'][number];

const columns: TableColumn<InstallmentRow>[] = [
  { header: 'Cuota', width: '7%', getValue: (r) => String(r.installmentNumber) },
  { header: 'Vencimiento', width: '12%', getValue: (r) => formatDate(r.dueDate) },
  { header: 'Dias', width: '6%', textAlign: 'right', getValue: (r) => String(r.days) },
  {
    header: 'Saldo Inicial',
    width: '13%',
    textAlign: 'right',
    getValue: (r) => formatCurrency(r.openingBalance),
  },
  {
    header: 'Capital',
    width: '13%',
    textAlign: 'right',
    getValue: (r) => formatCurrency(r.principal),
  },
  {
    header: 'Interes',
    width: '13%',
    textAlign: 'right',
    getValue: (r) => formatCurrency(r.interest),
  },
  {
    header: 'Seguro',
    width: '12%',
    textAlign: 'right',
    getValue: (r) => formatCurrency(r.insurance),
  },
  {
    header: 'Pago',
    width: '12%',
    textAlign: 'right',
    getValue: (r) => formatCurrency(r.payment),
  },
  {
    header: 'Saldo Final',
    width: '12%',
    textAlign: 'right',
    getValue: (r) => formatCurrency(r.closingBalance),
  },
];

export const creditSimulationReportTemplate: PdfTemplateBuilder<CreditSimulationPdfData> = (
  data,
  rpdf,
) => {
  const { Text } = rpdf;
  const styles = createBaseStyles(rpdf);
  const { summary } = data;

  const insuranceLabel =
    data.insuranceRateType === 'FIXED_AMOUNT' ? 'Seguro (valor fijo)' : 'Factor de seguro';
  const insuranceValue =
    data.insuranceRateType === 'FIXED_AMOUNT'
      ? formatCurrency(data.insuranceFactor)
      : formatPercent(data.insuranceFactor, 4);

  return PageShell(rpdf, {
    styles,
    children: [
      h(Text, { style: styles.title, key: 'title' }, 'SIMULACION DE CREDITO'),

      h(Text, { style: styles.sectionTitle, key: 'sec-params' }, 'Parametros'),
      ...MetaLines(rpdf, styles, [
        { label: 'Tipo de financiamiento', value: financingTypeLabels[data.financingType] },
        { label: 'Tasa financiera', value: formatPercent(data.financingFactor, 4) },
        { label: insuranceLabel, value: insuranceValue },
      ]),

      h(Text, { style: styles.sectionTitle, key: 'sec-summary' }, 'Resumen'),
      SummaryGrid(rpdf, styles, [
        { label: 'Capital', value: formatCurrency(summary.principal) },
        { label: 'Cuotas', value: formatNumber(summary.installments, 0) },
        { label: 'Dias intervalo', value: formatNumber(summary.daysInterval, 0) },
        { label: 'Total intereses', value: formatCurrency(summary.totalInterest) },
        { label: 'Total seguro', value: formatCurrency(summary.totalInsurance) },
        { label: 'Total a pagar', value: formatCurrency(summary.totalPayment) },
        { label: 'Cuota maxima', value: formatCurrency(summary.maxInstallmentPayment) },
        { label: 'Cuota minima', value: formatCurrency(summary.minInstallmentPayment) },
        { label: 'Capacidad de pago', value: formatCurrency(data.capacity.paymentCapacity) },
      ]),

      h(
        Text,
        { style: styles.sectionTitle, key: 'sec-table' },
        'Tabla de amortizacion',
      ),
      PdfTable(rpdf, styles, {
        columns,
        rows: data.installments,
        emptyMessage: 'Sin cuotas.',
        keyExtractor: (r) => `inst-${r.installmentNumber}`,
        tableKey: 'amortization',
        footerValues: [
          '',
          'Total:',
          '',
          '',
          formatCurrency(summary.totalPrincipal),
          formatCurrency(summary.totalInterest),
          formatCurrency(summary.totalInsurance),
          formatCurrency(summary.totalPayment),
          '',
        ],
      }),

      h(
        Text,
        { style: { ...styles.small, marginTop: 20 }, key: 'print-date' },
        `Fecha de generacion: ${formatDate(data.printDate)}`,
      ),
      h(
        Text,
        { style: styles.small, key: 'disclaimer' },
        'Este documento es una simulacion y no constituye una oferta de credito.',
      ),
    ],
  });
};
