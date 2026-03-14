import React from 'react';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { PdfTemplateBuilder } from '../types';
import { createBaseStyles } from '../theme';
import { PageShell, PdfTable, SignatureBlock, TableColumn } from '../components';

const h = React.createElement;

export type ThirdPartyClearanceLoanRow = {
  lineName: string;
  creditNumber: string;
  creditStartDate: string;
  maturityDate: string;
  creditValue: number;
};

export type ThirdPartyClearanceData = {
  companyName: string;
  companyDocumentNumber?: string | null;
  city: string;
  generatedAt: string;
  thirdPartyName: string;
  thirdPartyDocumentNumber: string;
  signerName: string;
  signerTitle: string;
  loans: ThirdPartyClearanceLoanRow[];
};

export const thirdPartyClearanceTemplate: PdfTemplateBuilder<ThirdPartyClearanceData> = (
  data,
  rpdf
) => {
  const { Text } = rpdf;
  const styles = createBaseStyles(rpdf);

  const columns: TableColumn<ThirdPartyClearanceLoanRow>[] = [
    {
      header: 'LINEA DE CREDITO',
      width: '32%',
      getValue: (row) => row.lineName,
    },
    {
      header: 'CREDITO',
      width: '17%',
      getValue: (row) => row.creditNumber,
    },
    {
      header: 'FECHA CREDITO',
      width: '18%',
      getValue: (row) => formatDate(row.creditStartDate),
    },
    {
      header: 'VENCIMIENTO',
      width: '18%',
      getValue: (row) => formatDate(row.maturityDate),
    },
    {
      header: 'VALOR',
      width: '15%',
      textAlign: 'right',
      getValue: (row) => formatCurrency(row.creditValue),
    },
  ];

  const intro =
    data.loans.length > 0
      ? `Que una vez revisado nuestro sistema de informacion financiera de Credito y Cartera se encontro que el senor(a) ${data.thirdPartyName} identificado con documento numero ${data.thirdPartyDocumentNumber}, a la fecha se encuentra a PAZ Y SALVO con nuestra Corporacion por concepto de cancelacion total de creditos otorgados por esta Entidad que se anexan a continuacion:`
      : `Que una vez revisado nuestro sistema de informacion financiera de Credito y Cartera se encontro que el senor(a) ${data.thirdPartyName} identificado con documento numero ${data.thirdPartyDocumentNumber}, a la fecha se encuentra a PAZ Y SALVO con nuestra Corporacion y no registra obligaciones pendientes por concepto de creditos otorgados por esta Entidad.`;

  return PageShell(rpdf, {
    styles,
    headerTitle: 'Paz y Salvo de Tercero',
    companyName: data.companyName,
    children: [
      h(
        Text,
        { style: styles.metaLine, key: 'city-date' },
        `${data.city}, ${formatDate(data.generatedAt)}`
      ),
      h(Text, { style: { ...styles.sectionTitle, marginTop: 20 }, key: 'title' }, 'CERTIFICACION'),
      h(Text, { style: styles.legalText, key: 'intro' }, intro),
      data.loans.length
        ? PdfTable(rpdf, styles, {
            columns,
            rows: data.loans,
            keyExtractor: (row) => `${row.creditNumber}`,
            tableKey: 'third-party-clearance-loans',
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
