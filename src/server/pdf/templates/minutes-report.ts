import React from 'react';
import { formatCurrency, formatDate, formatDateTime } from '@/utils/formatters';
import { PdfTemplateBuilder } from '../types';
import { createBaseStyles } from '../theme';
import { PageShell, PdfTable, SignatureBlock, TableColumn } from '../components';

const h = React.createElement;

export type MinutesReportSigner = {
  name: string;
  title: string;
};

export type MinutesReportApprovedLoan = {
  itemNumber: number;
  thirdPartyName: string;
  thirdPartyDocumentNumber: string | null;
  approvedAmount: number;
  creditNumber: string;
};

export type MinutesReportGroup = {
  creditLineName: string;
  approvedAmount: number;
  pendingAmount: number;
  rejectedAmount: number;
  approvedLoans: MinutesReportApprovedLoan[];
};

export type MinutesReportData = {
  companyName: string;
  city: string;
  actNumber: string;
  actDate: string;
  generatedAt: string;
  locationName: string;
  signers: MinutesReportSigner[];
  reviewedApplicationsCount: number;
  groups: MinutesReportGroup[];
};

export const minutesReportTemplate: PdfTemplateBuilder<MinutesReportData> = (data, rpdf) => {
  const { Text, View } = rpdf;
  const styles = createBaseStyles(rpdf);

  const approvedLoanColumns: TableColumn<MinutesReportApprovedLoan>[] = [
    { header: 'Item', width: '10%', getValue: (row) => String(row.itemNumber) },
    { header: 'Nombre', width: '43%', getValue: (row) => row.thirdPartyName },
    {
      header: 'Cedula',
      width: '17%',
      getValue: (row) => row.thirdPartyDocumentNumber ?? '-',
    },
    {
      header: 'Valor',
      width: '15%',
      textAlign: 'right',
      getValue: (row) => formatCurrency(row.approvedAmount),
    },
    { header: 'Credito', width: '15%', getValue: (row) => row.creditNumber },
  ];

  return PageShell(rpdf, {
    styles,
    headerTitle: 'Comite Aprobacion de Prestamos',
    companyName: data.companyName,
    children: [
      h(
        Text,
        { style: { ...styles.title, textAlign: 'center', marginBottom: 2 }, key: 'title-1' },
        'COMITE APROBACION DE PRESTAMOS'
      ),
      h(
        Text,
        { style: { ...styles.sectionTitle, textAlign: 'center', marginTop: 0 }, key: 'title-2' },
        `ACTA No. ${data.actNumber}`
      ),
      h(View, { style: { marginTop: 14 }, key: 'meta-block' },
        h(Text, { style: styles.metaLine }, `Fecha: ${formatDate(data.actDate)}`),
        h(Text, { style: styles.metaLine }, `Lugar: ${data.locationName}`),
        h(Text, { style: styles.metaLine }, `Hora: ${formatDateTime(data.generatedAt).split(', ').pop() ?? ''}`),
        h(
          Text,
          { style: styles.metaLine },
          `Integrantes: ${data.signers.map((signer) => `${signer.name} - ${signer.title}`).join(' / ')}`
        )
      ),
      h(
        Text,
        { style: { ...styles.legalText, marginTop: 16 }, key: 'paragraph-1' },
        'Los arriba mencionados en su condicion de miembros del comite conformado para la aprobacion de los prestamos a afiliados, teniendo en cuenta lo reglamentado para tal fin, se reunieron y evaluaron las solicitudes y la documentacion recibida a la fecha de corte.'
      ),
      h(
        Text,
        { style: styles.legalText, key: 'paragraph-2' },
        `Una vez verificada la informacion se procedio a la elaboracion de la presente acta y a su firma por los que en ella intervinieron, bajo las siguientes consideraciones: 1. Se evaluaron ${data.reviewedApplicationsCount} solicitudes. 2. Teniendo en cuenta los fondos disponibles para cada una de las modalidades de prestamos, se procedio a la aprobacion o rechazo de las solicitudes, conforme al cumplimiento de los requisitos y a la presentacion de la documentacion requerida, asi:`
      ),
      ...data.groups.flatMap((group, groupIndex) => {
        const groupElements: React.ReactNode[] = [
          h(
            Text,
            {
              style: { ...styles.sectionHeader, textAlign: 'left', marginTop: 12 },
              key: `group-title-${groupIndex}`,
            },
            `Linea Credito: ${group.creditLineName}`
          ),
          h(
            View,
            { style: { marginBottom: 8 }, key: `group-summary-${groupIndex}` },
            h(Text, { style: styles.metaLine }, `Monto Aprobado: ${formatCurrency(group.approvedAmount)}`),
            h(Text, { style: styles.metaLine }, `Monto Pendiente: ${formatCurrency(group.pendingAmount)}`),
            h(Text, { style: styles.metaLine }, `Monto Rechazado: ${formatCurrency(group.rejectedAmount)}`)
          ),
          h(
            Text,
            { style: { ...styles.metaLine, fontWeight: 'bold' as const }, key: `group-approved-title-${groupIndex}` },
            'Creditos Aprobados'
          ),
          PdfTable(rpdf, styles, {
            columns: approvedLoanColumns,
            rows: group.approvedLoans,
            emptyMessage: 'No hay creditos aprobados para esta linea.',
            keyExtractor: (row) => `${group.creditLineName}-${row.creditNumber}`,
            tableKey: `group-approved-${groupIndex}`,
          }),
        ];

        return groupElements;
      }),
      h(
        Text,
        { style: { ...styles.legalText, marginTop: 12 }, key: 'closing' },
        `La presente acta se expide en la ciudad de ${data.city.toLowerCase()} a los efectos correspondientes.`
      ),
      h(
        View,
        { style: { marginTop: 40 }, key: 'signers' },
        ...data.signers.map((signer, index) =>
          h(
            View,
            { style: { marginBottom: 30 }, key: `signer-${index}` },
            SignatureBlock(rpdf, styles, {
              name: signer.name,
              title: signer.title,
            })
          )
        )
      ),
    ],
  });
};
