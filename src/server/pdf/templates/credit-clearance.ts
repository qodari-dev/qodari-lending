import React from 'react';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { PdfTemplateBuilder } from '../types';
import { createBaseStyles } from '../theme';
import { PageShell, SignatureBlock } from '../components';

const h = React.createElement;

export type CreditClearanceData = {
  companyName: string;
  companyDocumentNumber?: string | null;
  city: string;
  generatedAt: string;
  borrowerName: string;
  borrowerDocumentNumber?: string | null;
  borrowerAddress?: string | null;
  borrowerCity?: string | null;
  creditNumber: string;
  creditValue: number;
  creditStartDate: string;
  lastPaymentDate: string;
  clearanceDate: string;
  signerName: string;
  signerTitle: string;
};

export const creditClearanceTemplate: PdfTemplateBuilder<CreditClearanceData> = (data, rpdf) => {
  const { Text, View } = rpdf;
  const styles = createBaseStyles(rpdf);

  return PageShell(rpdf, {
    styles,
    headerTitle: 'Paz y Salvo de Credito',
    companyName: data.companyName,
    children: [
      h(
        Text,
        { style: styles.metaLine, key: 'city-date' },
        `${data.city}, ${formatDate(data.generatedAt)}`
      ),
      h(Text, { style: { ...styles.sectionTitle, marginTop: 20 }, key: 'title' }, 'CERTIFICACION'),
      h(
        Text,
        { style: styles.legalText, key: 'paragraph-1' },
        `${data.companyName}${data.companyDocumentNumber ? ` identificada con NIT ${data.companyDocumentNumber}` : ''} certifica que el credito No. ${data.creditNumber}, otorgado a ${data.borrowerName}${data.borrowerDocumentNumber ? ` identificado(a) con documento ${data.borrowerDocumentNumber}` : ''}, se encuentra totalmente cancelado y sin saldo pendiente a la fecha de expedicion de la presente constancia.`
      ),
      h(
        Text,
        { style: styles.legalText, key: 'paragraph-2' },
        `El valor del credito fue ${formatCurrency(data.creditValue)}, con fecha de otorgamiento ${formatDate(data.creditStartDate)} y fecha de ultimo pago ${formatDate(data.lastPaymentDate)}.`
      ),
      h(
        Text,
        { style: styles.legalText, key: 'paragraph-3' },
        'La presente se expide a solicitud del interesado para los fines que estime convenientes.'
      ),
      h(
        View,
        { style: { marginTop: 20 }, key: 'recipient-summary' },
        h(
          Text,
          { style: styles.metaLine, key: 'borrower-name' },
          `Titular: ${data.borrowerName}`
        ),
        data.borrowerDocumentNumber
          ? h(
              Text,
              { style: styles.metaLine, key: 'borrower-document' },
              `Documento: ${data.borrowerDocumentNumber}`
            )
          : null,
        data.borrowerAddress
          ? h(
              Text,
              { style: styles.metaLine, key: 'borrower-address' },
              `Direccion: ${data.borrowerAddress}`
            )
          : null,
        data.borrowerCity
          ? h(
              Text,
              { style: styles.metaLine, key: 'borrower-city' },
              `Ciudad: ${data.borrowerCity}`
            )
          : null,
        h(
          Text,
          { style: styles.metaLine, key: 'clearance-date' },
          `Fecha paz y salvo: ${formatDate(data.clearanceDate)}`
        )
      ),
      h(Text, { style: styles.legalText, key: 'farewell' }, 'Cordialmente,'),
      SignatureBlock(rpdf, styles, {
        name: data.signerName,
        title: data.signerTitle,
      }),
    ].filter(Boolean) as React.ReactNode[],
  });
};
