import React from 'react';
import { PdfTemplateBuilder } from '../types';
import { createBaseStyles } from '../theme';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { PageShell, SignatureField, SignatureRow } from '../components';
import { LoanDocumentData } from './loan-document-types';
import {
  getBorrowerFullName,
  getBorrowerDocument,
  getAgreementName,
  getCreditLineName,
  getFinancingRatePercent,
  getInstallmentTotalCuota,
} from './loan-document-helpers';

const h = React.createElement;

export const libranzaTemplate: PdfTemplateBuilder<LoanDocumentData> = (data, rpdf) => {
  const { Text, View } = rpdf;
  const styles = createBaseStyles(rpdf);
  const { loan } = data;

  const name = getBorrowerFullName(loan);
  const doc = getBorrowerDocument(loan);

  const installments = (loan.loanInstallments ?? []).filter((i) => i.status !== 'VOID');
  const firstInstallment = installments[0];
  const cuotaMensual = firstInstallment ? getInstallmentTotalCuota(firstInstallment) : 0;
  const totalCredito = Number(loan.initialTotalAmount);

  return PageShell(rpdf, {
    styles,
    children: [
      h(Text, { style: { ...styles.title, textAlign: 'right' }, key: 'title' }, 'Autorizacion Descuento por Nomina'),

      h(Text, { style: { ...styles.metaLine, marginTop: 8 }, key: 'senores' }, `Senores, ${getAgreementName(loan)}.`),

      h(Text, { style: { ...styles.sectionTitle, textAlign: 'center' }, key: 'sec-caract' }, 'CARACTERISTICAS DEL CREDITO'),

      h(View, { style: styles.twoColumnRow, key: 'caract-row1' },
        h(Text, { style: styles.metaLine }, `Numero de Credito: ${loan.creditNumber}`),
        h(Text, { style: styles.metaLine }, `Valor Aprobado: ${formatCurrency(loan.principalAmount)}`),
      ),
      h(Text, { style: styles.metaLine, key: 'caract-linea' }, `Linea de Credito: ${getCreditLineName(loan)}`),

      h(Text, { style: { ...styles.sectionTitle, textAlign: 'center' }, key: 'sec-financ' }, 'FINANCIACION'),

      h(View, { style: styles.twoColumnRow, key: 'fin-row1' },
        h(Text, { style: styles.metaLine }, `Valor Cuotas Mensuales a Descontar: ${formatCurrency(cuotaMensual)}`),
        h(Text, { style: styles.metaLine }, `No. de Cuotas: ${loan.installments}`),
      ),
      h(View, { style: styles.twoColumnRow, key: 'fin-row2' },
        h(Text, { style: styles.metaLine }, `Tasa Efectiva Anual: ${getFinancingRatePercent(loan)}`),
        h(Text, { style: styles.metaLine }, `Valor Total del Credito: ${formatCurrency(totalCredito)}`),
      ),
      h(View, { style: styles.twoColumnRow, key: 'fin-row3' },
        h(Text, { style: styles.metaLine }, `Fecha 1er. Descuento: ${formatDate(loan.firstCollectionDate)}`),
        h(Text, { style: styles.metaLine }, `Fecha 1er. Pago a Comfamiliar: ${formatDate(loan.firstCollectionDate)}`),
      ),
      h(Text, { style: styles.metaLine, key: 'fin-venc' }, `Fecha Vencimiento Final: ${formatDate(loan.maturityDate)}`),

      h(Text, { style: { ...styles.legalText, marginTop: 10 }, key: 'p1' }, 'Asi mismo, retener del salario, compensaciones o aportes sociales que devengo(amos) en los siguientes casos: en el evento de causarse intereses de mora, hasta por el valor de los mismos; cuando por desafiliacion de la empresa a la Caja de Compensacion Familiar de Cartagena COMFAMILIAR CARTAGENA, se reajusten los intereses pactados y se produzca la extincion del plazo o se haga exigible la totalidad de la obligacion antes de su vencimiento; pagar el valor de las cuotas durante el tiempo que permanezca(amos) en vacaciones, licencias, incapacidades o suspendido del cargo, descontando inclusive de mis primas legales o extralegales y remuneracion de vacaciones.'),

      h(Text, { style: styles.legalText, key: 'p2' }, 'Al retiro de esta empresa o cooperativa o en caso de liquidacion, parcial con destino a la cancelacion del precitado prestamo y hasta la concurrencia del saldo pendiente por capital, intereses y cualquier gasto que ocasiones el cobro de la deuda, descontando inclusive de las prestaciones sociales, indemnizaciones, compensaciones o aportes sociales que me(nos) corresponda(n).'),

      h(Text, { style: styles.legalText, key: 'p3' }, 'Caja de Compensacion Familiar de Cartagena COMFAMILIAR CARTAGENA queda revestida de las mas amplias facultades, para tramitar todo lo referente al reconocimiento de mis prestaciones sociales, compensaciones o aportes y recibir el correspondiente pago.'),

      h(Text, { style: styles.legalText, key: 'p4' }, 'Senor empleador: Es obligatorio el descuento por nomina autorizado por el trabajador conforme lo establece el Codigo Sustantivo del Trabajo, articulo 149 modificado por el Art. 18.'),

      h(Text, { style: styles.legalText, key: 'p5' }, 'Ley 1429 del 2010, el cual expresa: "Los empleadores quedaran obligados a efectuar oportunamente los descuentos autorizados por sus trabajadores que se ajusten a la ley. El empleador que incumpla lo anterior, sera responsable de los perjuicios que dicho incumplimiento le ocasione al trabajador o al beneficiario del descuento".'),

      h(Text, { style: { ...styles.legalText, fontWeight: 'bold' as const }, key: 'p6' }, 'En caso de que la Empresa por cualquier motivo no realice el descuento por nomina y por consiguiente no pueda pagar oportunamente la(s) cuota(s), NOS COMPROMETEMOS a cancelar, personalmente en las oficinas de Comfamiliar la(s) correspondiente(s) cuota(s) dentro de los plazos previstos; si esto no se cumple y el credito presenta mora Comfamiliar Cartagena queda autorizado para realizar el descuento al codeudor.'),

      // Signatures
      SignatureRow(rpdf, styles, [
        SignatureField(rpdf, styles, {
          title: 'El Deudor',
          fields: [
            { label: 'Nombre', value: name },
            { label: 'No. Documento', value: doc },
          ],
        }),
        SignatureField(rpdf, styles, {
          title: 'Deudor Solidario',
          fields: [
            { label: 'Nombre' },
            { label: 'No. Documento' },
          ],
        }),
      ]),

      SignatureRow(rpdf, styles, [
        SignatureField(rpdf, styles, {
          title: 'Deudor Solidario',
          fields: [
            { label: 'Nombre' },
            { label: 'No. Documento' },
          ],
        }),
        SignatureField(rpdf, styles, {
          title: 'Deudor Solidario',
          fields: [
            { label: 'Nombre' },
            { label: 'No. Documento' },
          ],
        }),
      ]),

      h(View, { style: { marginTop: 16 }, key: 'firma-empresa' },
        h(Text, { style: { ...styles.legalText, fontWeight: 'bold' as const, marginBottom: 8 } }, 'Persona autorizada por la empresa para aceptar y firmar la autorizacion descuento por nomina'),
        h(View, { style: { ...styles.signatureLine, marginTop: 16 } }),
        h(Text, { style: { fontSize: 9 } }, 'Nombre:'),
        h(View, { style: { ...styles.signatureLine, marginTop: 16 } }),
        h(Text, { style: { fontSize: 9 } }, 'Cargo:'),
      ),
    ],
  });
};
