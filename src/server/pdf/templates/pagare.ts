import React from 'react';
import { PdfTemplateBuilder } from '../types';
import { createBaseStyles } from '../theme';
import { PageShell } from '../components';
import { LoanDocumentData } from './loan-document-types';
import { getBorrowerFullName, getBorrowerDocument, getBorrowerAddress } from './loan-document-helpers';

const h = React.createElement;

export const pagareTemplate: PdfTemplateBuilder<LoanDocumentData> = (data, rpdf) => {
  const { Text, View } = rpdf;
  const styles = createBaseStyles(rpdf);
  const { loan } = data;

  const name = getBorrowerFullName(loan);
  const doc = getBorrowerDocument(loan);
  const address = getBorrowerAddress(loan);

  const bodyStyle = { marginBottom: 6, lineHeight: 1.5, fontSize: 9, textAlign: 'justify' as const };
  const labelStyle = { ...styles.metaLine, fontSize: 10 };
  const sectionHeader = { fontSize: 10, fontWeight: 'bold' as const, marginTop: 10, marginBottom: 4, textAlign: 'center' as const };

  return PageShell(rpdf, {
    children: [
      h(Text, { style: { ...styles.title, textAlign: 'right' }, key: 'title' }, 'PAGARE'),

      h(View, { style: { borderBottomWidth: 1, borderBottomColor: '#111827', marginVertical: 8 }, key: 'hr1' }),

      h(Text, { style: labelStyle, key: 'lugar' }, 'Lugar y Fecha de firma:'),
      h(Text, { style: labelStyle, key: 'pagare-num' }, `Pagare numero: ${loan.creditNumber}`),
      h(Text, { style: labelStyle, key: 'int-plazo' }, 'Intereses durante el plazo:'),
      h(Text, { style: labelStyle, key: 'int-mora' }, 'Intereses de Mora:'),
      h(Text, { style: labelStyle, key: 'persona-pago' }, 'Persona a quien debe hacerse el pago: Caja de Compensacion Familiar de Cartagena - Comfamiliar'),
      h(Text, { style: labelStyle, key: 'lugar-pago' }, 'Lugar en donde se efectuara el pago:'),
      h(Text, { style: labelStyle, key: 'fecha-venc' }, 'Fecha de vencimiento de la Obligacion:'),

      h(Text, { style: sectionHeader, key: 'deudor-title' }, 'DEUDOR'),
      h(Text, { style: labelStyle, key: 'deudor-name' }, `Nombre/Razon Social: ${name}`),
      h(Text, { style: labelStyle, key: 'deudor-id' }, `Identificacion: ${doc}`),
      h(Text, { style: labelStyle, key: 'deudor-dir' }, `Domicilio: ${address}`),

      h(Text, { style: sectionHeader, key: 'codeudor-title' }, 'CODEUDOR'),
      h(Text, { style: labelStyle, key: 'codeudor-name' }, 'Nombre/Razon Social:'),
      h(Text, { style: labelStyle, key: 'codeudor-id' }, 'Identificacion:'),
      h(Text, { style: labelStyle, key: 'codeudor-dir' }, 'Domicilio:'),

      h(Text, { style: bodyStyle, key: 'c1' }, 'Declaro (declaramos solidariamente): Primera. Objeto. Que por virtud del presente titulo valor pagare (mos) incondicionalmente, a la orden de la Caja de Compensacion Familiar de Cartagena - Comfamiliar, o a quien represente sus derechos, en la ciudad y direccion indicados, en las fechas de amortizacion por cuotas senaladas en la clausula segunda de este paga la suma de:'),

      h(View, { style: { borderBottomWidth: 1, borderBottomColor: '#111827', marginVertical: 4, width: '100%' }, key: 'line1' }),
      h(View, { style: { borderBottomWidth: 1, borderBottomColor: '#111827', marginVertical: 4, width: '100%' }, key: 'line2' }),

      h(Text, { style: bodyStyle, key: 'c1b' }, 'mas los intereses senalados en la clausula tercera.'),

      h(Text, { style: bodyStyle, key: 'c2' }, 'Segunda. Plazo. Que pagare (pagaremos) la suma indicada en la clausula anterior, mediante instalamentos o cuotas mensuales sucesivas correspondientes cada una, a la cantidad de:'),

      h(View, { style: { borderBottomWidth: 1, borderBottomColor: '#111827', marginVertical: 4, width: '100%' }, key: 'line3' }),
      h(View, { style: { borderBottomWidth: 1, borderBottomColor: '#111827', marginVertical: 4, width: '100%' }, key: 'line4' }),

      h(Text, { style: bodyStyle, key: 'c2b' }, 'El primer pago se efectuara el dia ________ del mes ________ del ano ____________, y los demas pagos se haran sucesivamente, los primeros ________ dias de cada mes, durante ________ meses, hasta cancelar la totalidad de la obligacion.'),

      h(Text, { style: bodyStyle, key: 'c3' }, 'Tercera. Intereses. Que sobre las sumas debidas o saldos insolutos, reconocere (reconoceremos) intereses remuneratorios mensuales vencidos durante el plazo, hasta por la tasa de interes maxima legal permitida que mensualmente fija la Superintendencia Financiera de Colombia, y asi autorizo (autorizamos) se proceda. En caso de que deje (dejemos) de atender en las fechas convenidas una o mas cuotas de capital y/o intereses, reconoceremos un interes de mora a la tasa mas alta autorizada de conformidad con las disposiciones legales en la materia.'),

      h(Text, { style: bodyStyle, key: 'c4' }, 'Cuarta. Clausula Aceleratoria. El tenedor del pagare podra declarar vencidos la totalidad de los plazos de esta obligacion o de las cuotas que constituyan el saldo de lo debido, y exigir la cancelacion inmediata del saldo pendiente, ya sea Judicial o extrajudicialmente, cuando el (los) deudor (es) entren en mora o incumpla una cualquiera de las obligaciones derivadas del presente documento, y muy especialmente, en los siguientes eventos:'),

      h(Text, { style: bodyStyle, key: 'c4a' }, '1. El incumplimiento en el pago de una o mas cuotas.'),
      h(Text, { style: bodyStyle, key: 'c4b' }, '2. Si el (los) suscrito(s) fuere(n) demandado(s) judicialmente o se le(s) embargaren bienes por cualquier clase de acto.'),
      h(Text, { style: bodyStyle, key: 'c4c' }, '3. En caso de declaratoria de quiebra, admision de concordato o concurso de acreedores, fallecimiento, inhabilidad o incapacidad de uno o varios de (los) que firma (firmamos) el presente documento.'),
      h(Text, { style: bodyStyle, key: 'c4d' }, '4. Cuando los deudores inicien tramite de liquidacion de obligaciones laborales en forma definitiva con la empresa, termine la relacion laboral con la empresa en que trabaja al momento de la firma de este documento.'),

      h(Text, { style: bodyStyle, key: 'c4e' }, 'En estos eventos, la Caja de Compensacion Familiar de Cartagena - Comfamiliar, podra hacer uso de la clausula aceleratoria aqui senalada sin necesidad de requerimientos ni constitucion en mora, derechos a los cuales renuncio (renunciamos).'),

      h(Text, { style: bodyStyle, key: 'c5' }, 'Quinta. Abonos adicionales. En caso de hacer abonos extraordinarios a la deuda, los cuales no podran ser inferiores al importe del valor de la cuota mensual del valor del credito, se modificara la cuantia de las cuotas a pagar o se reduciran los plazos para su amortizacion. Si el pago del capital no se efectuare en la(s) fecha(s) que se indica(n) en este pagare, me (nos) comprometo (comprometemos) a pagar ademas del capital, los intereses moratorios sobre saldos insolutos durante todo el tiempo que se encuentre sin satisfacer la obligacion, a la tasa senalada en la clausula tercera.'),

      h(Text, { style: bodyStyle, key: 'c6' }, 'Sexta. Tolerancias en los pagos mensuales. La simple tolerancia por parte del tenedor, en aceptar el pago de los instalamentos o cuotas, en fecha posterior a los vencimientos contractuales, no se entendera nunca, como animo o conducta modificadora del pagare, como tampoco implicaria novacion de las obligaciones incumplidas, pero en todos los casos en que asi se proceda, al recibimiento, el (los) deudor (es), reconocera (n) y pagara (n), a titulo de mora, un interes moratorio equivalente al indicado en este documento en forma mensual de los respectivos atrasos, pagaderos con imputacion preferencial a este concepto, y el saldo a la cuota que se pretender cubrir.'),

      h(Text, { style: bodyStyle, key: 'c7' }, 'Septima. Cesion. El tenedor, podra en cualquier tiempo o lugar, ceder o endosar los derechos y obligaciones contenidos en el presente pagare. Para ello, bastara que el mismo notifique por escrito a el (los) deudores, la cesion del prementado pagare, en cuyo caso, el (los) deudores, aceptan esta cesion, y se obligan al cumplimiento de sus obligaciones como tal, ante el cesionario o nuevo tenedor.'),

      h(Text, { style: bodyStyle, key: 'c8' }, 'Octava. Impuesto y gastos. Los gastos originados por concepto de impuestos de timbre correran a cargo del (los) deudor (es). Acepto (aceptamos) que en caso de incumplimiento de las obligaciones de este titulo valor sean de mi (nuestro) cargo los costos y gastos de la cobranza. Asimismo, el interes de mora estipulado en el presente pagare se aplicara a las sumas que invierta la Caja de Compensacion Familiar de Cartagena - Comfamiliar, para hacer efectivo este documento, en caso de incumplimiento del (los) deudor (deudores), tales como honorarios del abogado, costos, etc., las cuales me (nos) obligo (obligamos) reembolsar.'),

      h(Text, { style: { ...bodyStyle, marginTop: 12 }, key: 'constancia' }, 'Para constancia se firma en Cartagena de Indias, Departamento de Bolivar a los ________ dias del mes de ______________________________.'),

      h(Text, { style: { ...labelStyle, marginTop: 10 }, key: 'otorgantes' }, 'Otorgantes'),

      h(View, { style: { flexDirection: 'row', marginTop: 20, gap: 40 }, key: 'firma-row' },
        h(View, { style: { width: '45%' }, key: 'firma-deudor' },
          h(Text, { style: { fontWeight: 'bold', fontSize: 10, marginBottom: 4 } }, 'Deudor'),
          h(Text, { style: { fontSize: 9 } }, `Apellido(s) y Nombre(s): ${name}`),
          h(Text, { style: { fontSize: 9 } }, `Identificacion: ${doc}`),
          h(Text, { style: { fontSize: 9 } }, `Direccion: ${address}`),
          h(Text, { style: { fontSize: 9 } }, 'Tel: '),
          h(Text, { style: { fontSize: 9, marginTop: 8 } }, 'Firma: _______________________________'),
          h(Text, { style: { fontSize: 8, marginTop: 16, textAlign: 'center' } }, 'Huella Dactilar'),
        ),
        h(View, { style: { width: '45%' }, key: 'firma-codeudor' },
          h(Text, { style: { fontWeight: 'bold', fontSize: 10, marginBottom: 4 } }, 'Codeudor'),
          h(Text, { style: { fontSize: 9 } }, 'Apellido(s) y Nombre(s): '),
          h(Text, { style: { fontSize: 9 } }, 'Identificacion: '),
          h(Text, { style: { fontSize: 9 } }, 'Direccion: '),
          h(Text, { style: { fontSize: 9 } }, 'Tel: '),
          h(Text, { style: { fontSize: 9, marginTop: 8 } }, 'Firma: _______________________________'),
          h(Text, { style: { fontSize: 8, marginTop: 16, textAlign: 'center' } }, 'Huella Dactilar'),
        ),
      ),
    ],
  });
};
