import React from 'react';
import { PdfTemplateBuilder } from '../types';
import { createBaseStyles } from '../theme';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { PageShell, MetaLines, PdfTable, TableColumn, HorizontalRule, SignatureBlock } from '../components';
import { LoanDocumentData } from './loan-document-types';
import {
  getBorrowerFullName,
  getBorrowerDocument,
  getAgreementName,
  getAgreementNit,
  getCreditLineName,
} from './loan-document-helpers';

const h = React.createElement;

type LiquidacionRow = {
  key: string;
  detalle: string;
  debito: string;
  credito: string;
};

const columns: TableColumn<LiquidacionRow>[] = [
  { header: 'Detalle', width: '40%', paddingRight: 4, getValue: (r) => r.detalle },
  { header: 'Debito', width: '30%', textAlign: 'right', getValue: (r) => r.debito ? formatCurrency(r.debito) : '' },
  { header: 'Credito', width: '30%', textAlign: 'right', getValue: (r) => r.credito ? formatCurrency(r.credito) : '' },
];

export const liquidacionTemplate: PdfTemplateBuilder<LoanDocumentData> = (data, rpdf) => {
  const { Text, View } = rpdf;
  const styles = createBaseStyles(rpdf);
  const { loan, printDate } = data;

  const principal = loan.principalAmount;

  const rows: LiquidacionRow[] = [
    { key: 'prestamo', detalle: 'Prestamo', debito: principal, credito: principal },
    { key: 'intereses', detalle: 'Intereses Anticipados Hasta el', debito: '', credito: '' },
    { key: 'estudio', detalle: 'Estudio Credito', debito: '', credito: '' },
    { key: 'fondo', detalle: 'Fondo Proteccion', debito: '', credito: '' },
  ];

  return PageShell(rpdf, {
    styles,
    children: [
      h(Text, { style: { ...styles.title, textAlign: 'right' }, key: 'title' }, 'Liquidacion de Credito'),

      h(View, { style: styles.twoColumnRow, key: 'header-row' },
        h(Text, { style: styles.metaLine }, `Pagare: ${loan.creditNumber}`),
        h(Text, { style: styles.metaLine }, `Linea: ${getCreditLineName(loan)}`),
      ),
      h(Text, { style: styles.metaLine, key: 'fecha' }, `Fecha: ${formatDate(printDate)}`),

      HorizontalRule(rpdf, styles),

      ...MetaLines(rpdf, styles, [
        { label: 'Deudor', value: `${getBorrowerFullName(loan)}                    C.C.: ${getBorrowerDocument(loan)}` },
        { label: 'Empresa Dependencia', value: `${getAgreementName(loan)}    NIT: ${getAgreementNit(loan)}` },
      ]),

      h(Text, { style: { marginTop: 12 }, key: 'spacer' }, ''),

      PdfTable(rpdf, styles, {
        columns,
        rows,
        keyExtractor: (r) => r.key,
        tableKey: 'liquidacion',
      }),

      h(Text, { style: { ...styles.metaLine, marginTop: 16, fontWeight: 'bold' as const }, key: 'desembolso-label' }, 'Valor Desembolsado:'),
      h(Text, { style: { ...styles.sectionTitle, marginTop: 2 }, key: 'desembolso-value' }, formatCurrency(principal)),
      h(Text, { style: styles.metaLine, key: 'a-nombre' }, `A nombre de: ${getBorrowerFullName(loan)}`),

      h(View, { style: styles.signatureRow, key: 'firma-row' },
        SignatureBlock(rpdf, styles, { name: '', title: 'Preparado' }),
        SignatureBlock(rpdf, styles, { name: '', title: 'Revisado' }),
      ),

      h(Text, { style: { fontWeight: 'bold' as const, fontSize: 10, marginTop: 20 }, key: 'obs-label' }, 'Observaciones:'),
      h(View, { style: styles.hr, key: 'obs-line1' }),
      h(View, { style: styles.hr, key: 'obs-line2' }),
    ],
  });
};
