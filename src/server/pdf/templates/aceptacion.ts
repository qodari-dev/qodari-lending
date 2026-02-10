import React from 'react';
import { PdfTemplateBuilder } from '../types';
import { createBaseStyles } from '../theme';
import { formatCurrency, formatDate } from '../format';
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

  const bodyStyle = { marginBottom: 6, lineHeight: 1.5, fontSize: 10, textAlign: 'justify' as const };
  const formLabelStyle = { fontWeight: 'bold' as const, fontSize: 9 };
  const formCellStyle = { borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingVertical: 4, paddingHorizontal: 4 };

  return PageShell(rpdf, {
    children: [
      h(Text, { style: styles.metaLine, key: 'city-date' }, `Cartagena, ${formatDate(printDate)}`),

      h(View, { style: { marginTop: 16 }, key: 'dest' },
        h(Text, { style: bodyStyle }, 'Senores:'),
        h(Text, { style: { ...bodyStyle, fontWeight: 'bold' } }, 'SECCION DE CREDITO Y CARTERA'),
        h(Text, { style: bodyStyle }, 'COMFAMILIAR'),
        h(Text, { style: bodyStyle }, 'Cartagena'),
      ),

      h(Text, { style: { ...bodyStyle, marginTop: 12 }, key: 'asunto' }, 'Asunto: Reconocimiento y aceptacion del credito'),

      h(Text, { style: { ...bodyStyle, marginTop: 8 }, key: 'body' }, `Por medio de la presente, yo ${name}, identificado (a) con cedula de ciudadania No. ${doc}, expedida en la ciudad de _____________________, reconozco y acepto haber recibido las condiciones en que fue aprobado el credito No. ${loan.creditNumber} que asumo asi`),

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
        h(View, { style: { ...formCellStyle }, key: 'f-firma' },
          h(Text, { style: formLabelStyle }, 'Firma:'),
        ),
        h(View, { style: { ...formCellStyle }, key: 'f-nombre' },
          h(Text, { style: formLabelStyle }, 'Nombres y Apellidos:'),
        ),
        h(View, { style: { ...formCellStyle, flexDirection: 'row' }, key: 'f-doc-row' },
          h(View, { style: { width: '50%' } },
            h(Text, { style: formLabelStyle }, 'Tipo de Documento:'),
          ),
          h(View, { style: { width: '50%', borderLeftWidth: 1, borderLeftColor: '#e5e7eb', paddingLeft: 4 } },
            h(Text, { style: formLabelStyle }, 'Numero de Documento:'),
          ),
        ),
        h(View, { style: { ...formCellStyle }, key: 'f-exp' },
          h(Text, { style: formLabelStyle }, 'Lugar de Expedicion:'),
        ),
        h(View, { style: { ...formCellStyle }, key: 'f-dir' },
          h(Text, { style: formLabelStyle }, 'Direccion de Residencia:'),
        ),
        h(View, { style: { ...formCellStyle, flexDirection: 'row' }, key: 'f-tel-row' },
          h(View, { style: { width: '50%' } },
            h(Text, { style: formLabelStyle }, 'Telefono Fijo:'),
          ),
          h(View, { style: { width: '50%', borderLeftWidth: 1, borderLeftColor: '#e5e7eb', paddingLeft: 4 } },
            h(Text, { style: formLabelStyle }, 'Celular:'),
          ),
        ),
        h(View, { style: { ...formCellStyle, borderBottomWidth: 0 }, key: 'f-email' },
          h(Text, { style: formLabelStyle }, 'Correo Electronico:'),
        ),
      ),
    ],
  });
};
