import React from 'react';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { PdfTemplateBuilder } from '../types';
import { createBaseStyles } from '../theme';
import { PageShell, PdfTable, SignatureBlock, TableColumn } from '../components';

const h = React.createElement;

export type ThirdPartyBalanceCertificateLoanRow = {
  lineName: string;
  creditNumber: string;
  creditStartDate: string;
  maturityDate: string;
  balanceAtCutoff: number;
  statusLabel: string;
};

export type ThirdPartyBalanceCertificateData = {
  companyName: string;
  companyDocumentNumber?: string | null;
  city: string;
  generatedAt: string;
  cutoffDate: string;
  thirdPartyName: string;
  thirdPartyDocumentNumber: string;
  totalBalanceAtCutoff: number;
  signerName: string;
  signerTitle: string;
  loans: ThirdPartyBalanceCertificateLoanRow[];
};

export const thirdPartyBalanceCertificateTemplate: PdfTemplateBuilder<ThirdPartyBalanceCertificateData> = (
  data,
  rpdf
) => {
  const { Text } = rpdf;
  const styles = createBaseStyles(rpdf);

  const columns: TableColumn<ThirdPartyBalanceCertificateLoanRow>[] = [
    {
      header: 'LINEA DE CREDITO',
      width: '28%',
      getValue: (row) => row.lineName,
    },
    {
      header: 'CREDITO',
      width: '16%',
      getValue: (row) => row.creditNumber,
    },
    {
      header: 'FECHA CREDITO',
      width: '16%',
      getValue: (row) => formatDate(row.creditStartDate),
    },
    {
      header: 'VENCIMIENTO',
      width: '16%',
      getValue: (row) => formatDate(row.maturityDate),
    },
    {
      header: 'ESTADO',
      width: '12%',
      getValue: (row) => row.statusLabel,
    },
    {
      header: 'SALDO',
      width: '12%',
      textAlign: 'right',
      getValue: (row) => formatCurrency(row.balanceAtCutoff),
    },
  ];

  const intro =
    data.loans.length > 0
      ? `Una vez revisado nuestro sistema de informacion financiera de credito y cartera se encontro que ${data.thirdPartyName}, identificado(a) con documento ${data.thirdPartyDocumentNumber}, presenta a la fecha de corte las siguientes obligaciones con saldo en nuestra Corporacion:`
      : `Una vez revisado nuestro sistema de informacion financiera de credito y cartera se encontro que ${data.thirdPartyName}, identificado(a) con documento ${data.thirdPartyDocumentNumber}, no registra obligaciones con saldo pendiente a la fecha de corte indicada.`;

  return PageShell(rpdf, {
    styles,
    headerTitle: 'Certificado de Saldo de Tercero',
    companyName: data.companyName,
    children: [
      h(
        Text,
        { style: styles.metaLine, key: 'city-date' },
        `${data.city}, ${formatDate(data.generatedAt)}`
      ),
      h(Text, { style: { ...styles.sectionTitle, marginTop: 20 }, key: 'title' }, 'CERTIFICACION'),
      h(Text, { style: styles.legalText, key: 'intro' }, intro),
      h(
        Text,
        { style: styles.metaLine, key: 'cutoff' },
        `Fecha de corte: ${formatDate(data.cutoffDate)}`
      ),
      h(
        Text,
        { style: styles.metaLine, key: 'total-balance' },
        `Saldo total a fecha corte: ${formatCurrency(data.totalBalanceAtCutoff)}`
      ),
      data.loans.length
        ? PdfTable(rpdf, styles, {
            columns,
            rows: data.loans,
            keyExtractor: (row) => row.creditNumber,
            tableKey: 'third-party-balance-loans',
            footerValues: ['', '', '', '', 'TOTAL', formatCurrency(data.totalBalanceAtCutoff)],
          })
        : null,
      h(
        Text,
        { style: styles.legalText, key: 'closing' },
        'La presente certificacion se expide a solicitud del interesado para los fines que estime convenientes.'
      ),
      h(Text, { style: styles.legalText, key: 'farewell' }, 'Cordialmente,'),
      SignatureBlock(rpdf, styles, {
        name: data.signerName,
        title: data.signerTitle,
      }),
    ].filter(Boolean) as React.ReactNode[],
  });
};
