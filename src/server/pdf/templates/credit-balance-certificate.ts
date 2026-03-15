import React from 'react';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { PdfTemplateBuilder } from '../types';
import { createBaseStyles } from '../theme';
import { PageShell, SignatureBlock } from '../components';

const h = React.createElement;

export type CreditBalanceCertificateData = {
  companyName: string;
  companyDocumentNumber?: string | null;
  city: string;
  generatedAt: string;
  borrowerName: string;
  borrowerDocumentNumber?: string | null;
  creditNumber: string;
  obligationNumber: string;
  affiliationOfficeName?: string | null;
  creditLineName: string;
  cutoffDate: string;
  balanceAtCutoff: number;
  statusLabel: string;
  creditStartDate: string;
  signerName: string;
  signerTitle: string;
};

export const creditBalanceCertificateTemplate: PdfTemplateBuilder<CreditBalanceCertificateData> = (
  data,
  rpdf
) => {
  const { Text, View } = rpdf;
  const styles = createBaseStyles(rpdf);
  const hasOutstandingBalance = data.balanceAtCutoff > 0.01;

  return PageShell(rpdf, {
    styles,
    headerTitle: 'Certificado de Saldo',
    companyName: data.companyName,
    children: [
      h(
        Text,
        { style: styles.metaLine, key: 'city-date' },
        `${data.city}, ${formatDate(data.generatedAt)}`
      ),
      h(Text, { style: { ...styles.sectionTitle, marginTop: 20 }, key: 'title' }, 'CERTIFICACION'),
      hasOutstandingBalance
        ? h(
            Text,
            { style: styles.legalText, key: 'intro-balance' },
            `Una vez revisado nuestro sistema de informacion financiera de credito y cartera se encontro que ${data.borrowerName}${data.borrowerDocumentNumber ? `, identificado(a) con documento ${data.borrowerDocumentNumber},` : ''} a la fecha presenta el siguiente estado en sus saldos con nuestra Corporacion:`
          )
        : h(
            Text,
            { style: styles.legalText, key: 'intro-clear' },
            `Una vez revisado nuestro sistema de informacion financiera de credito y cartera se encontro que ${data.borrowerName}${data.borrowerDocumentNumber ? `, identificado(a) con documento ${data.borrowerDocumentNumber},` : ''} a la fecha de corte no presenta saldo pendiente con nuestra Corporacion para la obligacion relacionada a continuacion.`
          ),
      h(
        View,
        { style: { marginTop: 14, marginBottom: 18 }, key: 'summary' },
        h(Text, { style: styles.metaLine, key: 'obligation' }, `No. Obligacion: ${data.obligationNumber}`),
        data.affiliationOfficeName
          ? h(
              Text,
              { style: styles.metaLine, key: 'office' },
              `Oficina afiliacion: ${data.affiliationOfficeName}`
            )
          : null,
        h(Text, { style: styles.metaLine, key: 'line' }, `Linea credito: ${data.creditLineName}`),
        h(
          Text,
          { style: styles.metaLine, key: 'cutoff' },
          `Fecha de corte: ${formatDate(data.cutoffDate)}`
        ),
        h(
          Text,
          { style: styles.metaLine, key: 'balance' },
          `Saldo a fecha corte: ${formatCurrency(data.balanceAtCutoff)}`
        ),
        h(Text, { style: styles.metaLine, key: 'status' }, `Estado actual: ${data.statusLabel}`),
        h(
          Text,
          { style: styles.metaLine, key: 'start' },
          `Fecha de credito: ${formatDate(data.creditStartDate)}`
        )
      ),
      h(
        Text,
        { style: styles.legalText, key: 'closing' },
        `Se expide a solicitud del interesado(a) en la ciudad de ${data.city}, el ${formatDate(data.generatedAt)}.`
      ),
      h(Text, { style: styles.legalText, key: 'farewell' }, 'Cordialmente,'),
      SignatureBlock(rpdf, styles, {
        name: data.signerName,
        title: data.signerTitle,
      }),
    ].filter(Boolean) as React.ReactNode[],
  });
};
