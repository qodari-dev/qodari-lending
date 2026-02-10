import React from 'react';
import { PdfTemplateBuilder } from '../types';
import { createBaseStyles } from '../theme';
import { formatCurrency, formatDate } from '../format';
import { PageShell, MetaLines, PdfTable, TableColumn, SignatureBlock } from '../components';
import { LoanDocumentData } from './loan-document-types';
import {
  getBorrowerFullName,
  getBorrowerDocument,
  getBorrowerAddress,
  getBorrowerPhone,
  getAgreementName,
  getAgreementNit,
  getCreditLineName,
  getCategoryCode,
  getFinancingRatePercent,
  getSalary,
  getInstallmentTotalCuota,
} from './loan-document-helpers';

const h = React.createElement;

type InstallmentRow = {
  installmentNumber: number;
  dueDate: string;
  principalAmount: string;
  interestAmount: string;
  insuranceAmount: string;
  remainingPrincipal: string;
};

const columns: TableColumn<InstallmentRow>[] = [
  { header: 'Cuota', width: '7%', getValue: (r) => String(r.installmentNumber) },
  { header: 'Fecha Venc.', width: '14%', getValue: (r) => formatDate(r.dueDate) },
  {
    header: 'Abono Capital',
    width: '16%',
    textAlign: 'right',
    getValue: (r) => formatCurrency(r.principalAmount),
  },
  {
    header: 'Valor Intereses',
    width: '16%',
    textAlign: 'right',
    getValue: (r) => formatCurrency(r.interestAmount),
  },
  {
    header: 'Valor Seguros',
    width: '16%',
    textAlign: 'right',
    getValue: (r) => formatCurrency(r.insuranceAmount),
  },
  {
    header: 'Valor Cuota',
    width: '16%',
    textAlign: 'right',
    getValue: (r) => formatCurrency(getInstallmentTotalCuota(r)),
  },
  {
    header: 'Saldo',
    width: '15%',
    textAlign: 'right',
    getValue: (r) => formatCurrency(r.remainingPrincipal),
  },
];

export const planDePagosTemplate: PdfTemplateBuilder<LoanDocumentData> = (data, rpdf) => {
  const { Text, View } = rpdf;
  const styles = createBaseStyles(rpdf);
  const { loan, printDate } = data;

  const installments = (loan.loanInstallments ?? []).filter((i) => i.status !== 'VOID');

  const totalCapital = installments.reduce((s, i) => s + Number(i.principalAmount), 0);
  const totalInterest = installments.reduce((s, i) => s + Number(i.interestAmount), 0);
  const totalInsurance = installments.reduce((s, i) => s + Number(i.insuranceAmount), 0);
  const totalCuota = totalCapital + totalInterest + totalInsurance;

  const totalsRow: InstallmentRow = {
    installmentNumber: 0,
    dueDate: '',
    principalAmount: String(totalCapital),
    interestAmount: String(totalInterest),
    insuranceAmount: String(totalInsurance),
    remainingPrincipal: '0',
  };

  const totalColumns: TableColumn<InstallmentRow>[] = [
    { header: '', width: '7%', getValue: () => '' },
    { header: '', width: '14%', getValue: () => 'Total:' },
    { header: '', width: '16%', textAlign: 'right', getValue: (r) => formatCurrency(r.principalAmount) },
    { header: '', width: '16%', textAlign: 'right', getValue: (r) => formatCurrency(r.interestAmount) },
    { header: '', width: '16%', textAlign: 'right', getValue: (r) => formatCurrency(r.insuranceAmount) },
    { header: '', width: '16%', textAlign: 'right', getValue: () => formatCurrency(totalCuota) },
    { header: '', width: '15%', textAlign: 'right', getValue: (r) => formatCurrency(r.remainingPrincipal) },
  ];

  return PageShell(rpdf, {
    children: [
      h(Text, { style: styles.title, key: 'title' }, 'REPORTE DE PLAN DE PAGOS'),
      h(Text, { style: { ...styles.sectionTitle, marginTop: 4 }, key: 'credit' }, `CREDITO: ${loan.creditNumber}`),

      ...MetaLines(rpdf, styles, [
        { label: 'Cedula', value: getBorrowerDocument(loan) },
        { label: 'Nombre', value: getBorrowerFullName(loan) },
        { label: 'Nit', value: getAgreementNit(loan) },
        { label: 'Empresa', value: getAgreementName(loan) },
        { label: 'Direccion', value: getBorrowerAddress(loan) },
        { label: 'Telefono', value: getBorrowerPhone(loan) },
        { label: 'Tipo de Credito', value: getCreditLineName(loan) },
        { label: 'Categoria', value: getCategoryCode(loan) },
        { label: 'Fecha del credito', value: formatDate(loan.creditStartDate) },
        { label: 'Fac. Financ', value: getFinancingRatePercent(loan) },
        { label: 'Salario Solicitud', value: formatCurrency(getSalary(loan)) },
        { label: 'Cuotas', value: String(loan.installments) },
        { label: 'Valor Credito', value: formatCurrency(loan.principalAmount) },
        { label: 'Salario Actual', value: formatCurrency(getSalary(loan)) },
      ]),

      h(Text, { style: { ...styles.sectionTitle, marginTop: 12 }, key: 'sec-table' }, ''),

      ...PdfTable(rpdf, styles, {
        columns,
        rows: installments as InstallmentRow[],
        emptyMessage: 'Sin cuotas registradas.',
        keyExtractor: (r) => `inst-${r.installmentNumber}`,
        tableKey: 'installments',
      }),

      // Totals row
      h(
        View,
        { style: { ...styles.row, borderTopWidth: 1, borderTopColor: '#111827' }, key: 'totals' },
        ...totalColumns.map((col, i) =>
          h(
            Text,
            {
              style: {
                width: col.width,
                ...(col.textAlign ? { textAlign: col.textAlign } : {}),
                fontWeight: 'bold' as const,
              },
              key: `total-${i}`,
            },
            col.getValue(totalsRow),
          ),
        ),
      ),

      h(View, { style: { marginTop: 40 }, key: 'signatures' },
        SignatureBlock(rpdf, { name: '', title: 'REVISADO POR' }),
        SignatureBlock(rpdf, { name: '', title: 'ELABORADO POR' }),
      ),

      h(Text, { style: { ...styles.small, marginTop: 20 }, key: 'print-date' }, `Fecha de Impresion: ${formatDate(printDate)}`),
    ],
  });
};
