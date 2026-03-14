import React from 'react';
import { formatCurrency, formatDate, formatPercent } from '@/utils/formatters';
import { PdfTemplateBuilder } from '../types';
import { createBaseStyles } from '../theme';
import { MetaLines, PageShell, PdfTable, TableColumn } from '../components';

const h = React.createElement;

export type PaidInstallmentsReportRow = {
  installmentNumber: number;
  dueDate: string;
  installmentAmount: number;
  paidAmount: number;
  balance: number;
  movementDate: string | null;
};

export type PaidInstallmentsReportAuxiliary = {
  auxiliaryLabel: string;
  rows: PaidInstallmentsReportRow[];
  totalInstallmentAmount: number;
  totalPaidAmount: number;
  totalBalance: number;
};

export type PaidInstallmentsReportData = {
  companyName: string;
  creditNumber: string;
  creditStartDate: string;
  borrowerName: string;
  borrowerDocumentNumber: string | null;
  creditLineName: string;
  financingFactor: number;
  installments: number;
  borrowerAddress: string | null;
  installmentValue: number;
  borrowerCity: string | null;
  employerName: string | null;
  categoryLabel: string;
  insuranceFactor: number;
  creditValue: number;
  borrowerPhone: string | null;
  paymentGuaranteeName: string | null;
  auxiliaries: PaidInstallmentsReportAuxiliary[];
  totalInstallmentAmount: number;
  totalPaidAmount: number;
  totalBalance: number;
};

export const paidInstallmentsReportTemplate: PdfTemplateBuilder<PaidInstallmentsReportData> = (
  data,
  rpdf
) => {
  const { Text, View } = rpdf;
  const styles = createBaseStyles(rpdf);

  const columns: TableColumn<PaidInstallmentsReportRow>[] = [
    { header: 'Cuota', width: '10%', getValue: (row) => String(row.installmentNumber) },
    { header: 'Vencimiento', width: '18%', getValue: (row) => formatDate(row.dueDate) },
    {
      header: 'Vr Cuota',
      width: '18%',
      textAlign: 'right',
      getValue: (row) => formatCurrency(row.installmentAmount),
    },
    {
      header: 'Vr Abono',
      width: '18%',
      textAlign: 'right',
      getValue: (row) => formatCurrency(row.paidAmount),
    },
    {
      header: 'Vr Saldo',
      width: '18%',
      textAlign: 'right',
      getValue: (row) => formatCurrency(row.balance),
    },
    {
      header: 'F. Movimiento',
      width: '18%',
      getValue: (row) => (row.movementDate ? formatDate(row.movementDate) : '-'),
    },
  ];

  return PageShell(rpdf, {
    styles,
    headerTitle: 'Resumen de Cuotas Pagadas',
    companyName: data.companyName,
    children: [
      h(
        Text,
        { style: { ...styles.title, textAlign: 'center', marginBottom: 4 }, key: 'title' },
        'RESUMEN DE CUOTAS PAGADAS'
      ),
      ...MetaLines(rpdf, styles, [
        { label: 'No. Credito', value: data.creditNumber },
        { label: 'Fecha', value: formatDate(data.creditStartDate) },
      ]),
      h(
        View,
        { style: { marginTop: 10 }, key: 'summary-grid' },
        ...[
          ['Cedula', data.borrowerDocumentNumber ?? '-'],
          ['Nombre', data.borrowerName],
          ['Linea', data.creditLineName],
          ['Factor Financiacion', formatPercent(data.financingFactor, 5)],
          ['Cuotas', String(data.installments)],
          ['Direccion', data.borrowerAddress ?? '-'],
          ['Valor Cuota', formatCurrency(data.installmentValue)],
          ['Municipio', data.borrowerCity ?? '-'],
          ['Empresa', data.employerName ?? '-'],
          ['Categoria', data.categoryLabel],
          ['Factor Seguro', formatPercent(data.insuranceFactor, 5)],
          ['Vr Credito', formatCurrency(data.creditValue)],
          ['Telefono', data.borrowerPhone ?? '-'],
          ['Garantia', data.paymentGuaranteeName ?? '-'],
        ].map(([label, value], index) =>
          h(
            Text,
            { style: styles.metaLine, key: `meta-${index}` },
            `${label}: ${value}`
          )
        )
      ),
      ...data.auxiliaries.flatMap((auxiliary, auxiliaryIndex) => [
        h(
          Text,
          {
            style: { ...styles.sectionHeader, textAlign: 'left', marginTop: 14 },
            key: `aux-title-${auxiliaryIndex}`,
          },
          `Auxiliar: ${auxiliary.auxiliaryLabel}`
        ),
        PdfTable(rpdf, styles, {
          columns,
          rows: auxiliary.rows,
          emptyMessage: 'No hay movimientos para este auxiliar.',
          keyExtractor: (row) => `${auxiliary.auxiliaryLabel}-${row.installmentNumber}`,
          tableKey: `aux-${auxiliaryIndex}`,
          footerValues: [
            'Subtotal',
            '',
            formatCurrency(auxiliary.totalInstallmentAmount),
            formatCurrency(auxiliary.totalPaidAmount),
            formatCurrency(auxiliary.totalBalance),
            '',
          ],
        }),
      ]),
      h(
        Text,
        {
          style: { ...styles.sectionHeader, textAlign: 'left', marginTop: 14 },
          key: 'totals-title',
        },
        'TOTAL CREDITO'
      ),
      h(
        View,
        { style: { marginTop: 6 }, key: 'totals' },
        h(Text, { style: styles.metaLine }, `Vr Cuota: ${formatCurrency(data.totalInstallmentAmount)}`),
        h(Text, { style: styles.metaLine }, `Vr Abono: ${formatCurrency(data.totalPaidAmount)}`),
        h(Text, { style: styles.metaLine }, `Vr Saldo: ${formatCurrency(data.totalBalance)}`)
      ),
    ],
  });
};
