import React from 'react';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { PdfTemplateBuilder } from '../types';
import { createBaseStyles } from '../theme';
import { PageShell, SignatureBlock } from '../components';

const h = React.createElement;

export type CollectionLetterData = {
  referenceCode?: string | null;
  title: string;
  subject: string;
  creditNumber: string;
  recipientName: string;
  recipientLines: string[];
  city: string;
  generatedAt: string;
  greeting?: string | null;
  introParagraphs: string[];
  loanLineName: string;
  overdueAmount: number;
  futureActionItems?: string[];
  closingParagraphs: string[];
  contactParagraph?: string | null;
  senderName: string;
  senderRole: string;
  companyName?: string | null;
};

export const collectionLetterTemplate: PdfTemplateBuilder<CollectionLetterData> = (data, rpdf) => {
  const { Text, View } = rpdf;
  const styles = createBaseStyles(rpdf);

  return PageShell(rpdf, {
    styles,
    headerTitle: data.title,
    companyName: data.companyName ?? undefined,
    children: [
      data.referenceCode
        ? h(Text, { style: styles.metaLine, key: 'reference-code' }, data.referenceCode)
        : null,
      h(
        Text,
        { style: styles.metaLine, key: 'letter-city' },
        `${data.city}, ${formatDate(data.generatedAt)}`
      ),
      h(View, { style: { marginTop: 18 }, key: 'recipient-block' }, ...data.recipientLines.map((line, index) =>
        h(Text, { style: styles.metaLine, key: `recipient-line-${index}` }, line)
      )),
      h(
        Text,
        { style: { ...styles.legalText, marginTop: 18, fontWeight: 'bold' as const }, key: 'subject' },
        `Asunto: ${data.subject}. CREDITO No. ${data.creditNumber}`
      ),
      data.greeting
        ? h(Text, { style: styles.legalText, key: 'greeting' }, data.greeting)
        : null,
      ...data.introParagraphs.map((paragraph, index) =>
        h(Text, { style: styles.legalText, key: `intro-${index}` }, paragraph)
      ),
      h(
        Text,
        { style: { ...styles.legalText, fontWeight: 'bold' as const, marginTop: 6 }, key: 'summary-title' },
        'Consultando nuestra base de datos su estado de cartera reporta lo siguiente:'
      ),
      h(
        View,
        {
          style: {
            borderWidth: 1,
            borderColor: '#d1d5db',
            marginTop: 8,
            marginBottom: 12,
          },
          key: 'summary-box',
        },
        h(
          View,
          {
            style: {
              flexDirection: 'row',
              backgroundColor: '#f3f4f6',
              borderBottomWidth: 1,
              borderBottomColor: '#d1d5db',
            },
            key: 'summary-head',
          },
          h(
            Text,
            {
              style: { width: '60%', padding: 6, fontSize: 10, fontWeight: 'bold' as const },
              key: 'summary-head-line',
            },
            'Linea de CREDITO'
          ),
          h(
            Text,
            {
              style: { width: '40%', padding: 6, fontSize: 10, fontWeight: 'bold' as const, textAlign: 'right' as const },
              key: 'summary-head-balance',
            },
            'TOTAL SALDO EN MORA'
          )
        ),
        h(
          View,
          { style: { flexDirection: 'row' }, key: 'summary-row' },
          h(
            Text,
            { style: { width: '60%', padding: 6, fontSize: 10 }, key: 'summary-line' },
            data.loanLineName
          ),
          h(
            Text,
            { style: { width: '40%', padding: 6, fontSize: 10, textAlign: 'right' as const }, key: 'summary-balance' },
            formatCurrency(data.overdueAmount)
          )
        )
      ),
      ...(data.futureActionItems?.length
        ? [
            h(
              Text,
              { style: { ...styles.legalText, fontWeight: 'bold' as const }, key: 'future-title' },
              'ESTADO DE GESTIONES FUTURAS'
            ),
            ...data.futureActionItems.map((item, index) =>
              h(
                Text,
                { style: styles.legalText, key: `future-item-${index}` },
                `* ${item}`
              )
            ),
          ]
        : []),
      ...data.closingParagraphs.map((paragraph, index) =>
        h(Text, { style: styles.legalText, key: `closing-${index}` }, paragraph)
      ),
      data.contactParagraph
        ? h(Text, { style: styles.legalText, key: 'contact' }, data.contactParagraph)
        : null,
      h(Text, { style: styles.legalText, key: 'farewell' }, 'Cordialmente,'),
      SignatureBlock(rpdf, styles, {
        name: data.senderName,
        title: data.senderRole,
      }),
    ].filter(Boolean) as React.ReactNode[],
  });
};
