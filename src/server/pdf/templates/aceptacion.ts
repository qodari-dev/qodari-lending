import React from 'react';
import { PdfTemplateBuilder } from '../types';
import { createBaseStyles } from '../theme';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { PageShell, MetaLines } from '../components';
import { LoanDocumentData } from './loan-document-types';
import {
  getBorrowerFullName,
  getBorrowerDocument,
  getFinancingRatePercent,
  getInstallmentTotalCuota,
} from './loan-document-helpers';

const h = React.createElement;

export const aceptacionTemplate: PdfTemplateBuilder<LoanDocumentData> = (data, rpdf) => {
  const { Text, View } = rpdf;
  const styles = createBaseStyles(rpdf);
  const { loan, printDate } = data;

  const name = getBorrowerFullName(loan);
  const doc = getBorrowerDocument(loan);

  const installments = (loan.loanInstallments ?? []).filter((i) => i.status !== 'VOID');
  const firstInstallment = installments[0];
  const cuotaMensual = firstInstallment ? getInstallmentTotalCuota(firstInstallment) : 0;

  return PageShell(rpdf, {
    styles,
    children: [
      h(Text, { style: styles.metaLine, key: 'city-date' }, `Cartagena, ${formatDate(printDate)}`),

      h(View, { style: { marginTop: 16 }, key: 'dest' },
        h(Text, { style: styles.legalText }, 'Senores:'),
        h(Text, { style: { ...styles.legalText, fontWeight: 'bold' as const } }, 'SECCION DE CREDITO Y CARTERA'),
        h(Text, { style: styles.legalText }, 'COMFAMILIAR'),
        h(Text, { style: styles.legalText }, 'Cartagena'),
      ),

      h(Text, { style: { ...styles.legalText, marginTop: 12 }, key: 'asunto' }, 'Asunto: Reconocimiento y aceptacion del credito'),

      h(Text, { style: { ...styles.legalText, marginTop: 8 }, key: 'body' }, `Por medio de la presente, yo ${name}, identificado (a) con cedula de ciudadania No. ${doc}, expedida en la ciudad de _____________________, reconozco y acepto haber recibido las condiciones en que fue aprobado el credito No. ${loan.creditNumber} que asumo asi`),

      h(View, { style: { marginTop: 8, marginBottom: 16 }, key: 'conditions' },
        ...MetaLines(rpdf, styles, [
          { label: 'Valor del Credito', value: formatCurrency(loan.principalAmount) },
          { label: 'Tasa de Interes Efectiva Anual', value: getFinancingRatePercent(loan) },
          { label: 'Plazo', value: `${loan.installments} meses` },
          { label: 'Cuota Mensual', value: formatCurrency(cuotaMensual) },
          { label: 'Valor del Seguro', value: formatCurrency(loan.insuranceValue ?? '0') },
          { label: 'Valor Estudio del Credito', value: loan.discountStudyCredit ? 'Si' : '$0' },
        ]),
      ),

      // Signature form
      h(View, { style: { borderWidth: 1, borderColor: '#e5e7eb', marginTop: 8 }, key: 'form' },
        h(View, { style: styles.formCell, key: 'f-firma' },
          h(Text, { style: styles.formLabel }, 'Firma:'),
        ),
        h(View, { style: styles.formCell, key: 'f-nombre' },
          h(Text, { style: styles.formLabel }, 'Nombres y Apellidos:'),
        ),
        h(View, { style: { ...styles.formCell, flexDirection: 'row' }, key: 'f-doc-row' },
          h(View, { style: { width: '50%' } },
            h(Text, { style: styles.formLabel }, 'Tipo de Documento:'),
          ),
          h(View, { style: { width: '50%', borderLeftWidth: 1, borderLeftColor: '#e5e7eb', paddingLeft: 4 } },
            h(Text, { style: styles.formLabel }, 'Numero de Documento:'),
          ),
        ),
        h(View, { style: styles.formCell, key: 'f-exp' },
          h(Text, { style: styles.formLabel }, 'Lugar de Expedicion:'),
        ),
        h(View, { style: styles.formCell, key: 'f-dir' },
          h(Text, { style: styles.formLabel }, 'Direccion de Residencia:'),
        ),
        h(View, { style: { ...styles.formCell, flexDirection: 'row' }, key: 'f-tel-row' },
          h(View, { style: { width: '50%' } },
            h(Text, { style: styles.formLabel }, 'Telefono Fijo:'),
          ),
          h(View, { style: { width: '50%', borderLeftWidth: 1, borderLeftColor: '#e5e7eb', paddingLeft: 4 } },
            h(Text, { style: styles.formLabel }, 'Celular:'),
          ),
        ),
        h(View, { style: { ...styles.formCell, borderBottomWidth: 0 }, key: 'f-email' },
          h(Text, { style: styles.formLabel }, 'Correo Electronico:'),
        ),
      ),
    ],
  });
};
