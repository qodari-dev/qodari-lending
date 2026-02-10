import React from 'react';
import { PdfTemplateBuilder } from '../types';
import { createBaseStyles } from '../theme';
import { PageShell } from '../components';
import { LoanDocumentData } from './loan-document-types';
import {
  getBorrowerFullName,
  getBorrowerDocument,
  getAgreementName,
} from './loan-document-helpers';

const h = React.createElement;

export const pignoracionTemplate: PdfTemplateBuilder<LoanDocumentData> = (data, rpdf) => {
  const { Text } = rpdf;
  const styles = createBaseStyles(rpdf);
  const { loan } = data;

  const name = getBorrowerFullName(loan);
  const doc = getBorrowerDocument(loan);
  const empresa = getAgreementName(loan);
  const plazo = loan.installments;

  const bodyStyle = { marginBottom: 8, lineHeight: 1.5, fontSize: 9, textAlign: 'justify' as const };

  return PageShell(rpdf, {
    children: [
      h(Text, { style: { ...styles.title, textAlign: 'right' }, key: 'title1' }, 'Carta de Autorizacion de Deduccion de la'),
      h(Text, { style: { ...styles.title, textAlign: 'right', marginBottom: 12 }, key: 'title2' }, 'Cuota Monetaria'),

      h(Text, { style: bodyStyle, key: 'intro' }, `Yo, ${name}, identificado con cedula de ciudadania No. ${doc}. De ___________, actualmente empleado de la empresa ${empresa} por intermedio de la cual me encuentro afiliado a la Caja de Compensacion Familiar de Cartagena - Comfamiliar, en sustentacion de la solicitud formal que mas adelante invocare en mi condicion aludida me permito hacerle saber:`),

      h(Text, { style: bodyStyle, key: 'p1' }, '1. Que actualmente en el cargo aludido, recibo ingresos mensuales inferiores a cuatro (4) salarios minimo legales mensuales, en razon de lo cual mis beneficiarios tienen derecho al subsidio familiar en dinero'),

      h(Text, { style: bodyStyle, key: 'p2' }, '2. Que el importe de dicho subsidio en dinero es recibido personalmente por el suscrito de la Caja de Compensacion Familiar de Cartagena - Comfamiliar, correspondiente a mis beneficiarios _____________________________________________________________________________________, todos con derecho a ello, y que, como tal, no los recibe ni su progenitora, ni ninguna otra persona, bien por autorizacion del suscrito, de ella o de alguna autoridad judicial'),

      h(Text, { style: bodyStyle, key: 'p3' }, '3. Que siendo el objeto de esta prestacion social en dinero aliviar las cargas de los trabajadores, pretendo a traves del mismo resolver algunas necesidades basicas de mi familia con la buena labor que pueda hacer la Caja, en el sentido de otorgarme un anticipo en el pago de dicho subsidio en dinero sin que ello implique una destinacion diferente a la que establece la ley 21 de 1982 y la ley 789 de 2002.'),

      h(Text, { style: bodyStyle, key: 'p4' }, '4. Que si la empresa para la cual trabajo no paga cumplidamente los aportes o pierdo el derecho al pago de la cuota monetaria, por no actualizar oportunamente los certificados de escolaridad y/o supervivencia o por cualquier otro motivo, autorizo a la empresa para que deduzca de mi salario una cantidad igual a la cuota monetaria pactada en el momento del desembolso del credito. Esta novedad sera informada en su momento por la Caja de Compensacion Familiar de Cartagena - Comfamiliar; de lo contrario me obligo mediante este documento a cancelar el total de la deuda en el tiempo previamente pactado, mas los intereses de mora correspondiente a la misma.'),

      h(Text, { style: bodyStyle, key: 'p5' }, '5. Que en el evento de que se produzca mi retiro de la empresa a la cual presto mis servicios, autorizo al pagador de esta entidad, para que deduzca de mis prestaciones sociales e indemnizacion segun el caso, el saldo adeudado a la fecha de mi desvinculacion. Esta novedad sera informada en su momento a la Caja de Compensacion Familiar de Cartagena - Comfamiliar.'),

      h(Text, { style: bodyStyle, key: 'solicito' }, `Que en virtud de lo anterior SOLICITO a la Caja de Compensacion Familiar de Cartagena - Comfamiliar, un anticipo del subsidio en dinero, a que tengo derecho como afiliado a esa caja, en cuantia equivalente a _________________ veces el importe total que recibo mensualmente con ocasion a mis beneficiarios con derecho a dicho auxilio monetario, suma que sera descontada mensualmente con cargo a los aportes en dinero a recibir y durante el plazo de tres ( ${plazo} ) meses, o el que corresponde de conformidad con los pagos que efectivamente reciban de la empresa para la cual laboro.`),

      h(Text, { style: { ...bodyStyle, marginTop: 8 }, key: 'espera' }, 'En espera de respuesta positiva.'),
      h(Text, { style: { ...bodyStyle, marginTop: 4 }, key: 'atentamente' }, 'Atentamente.'),

      h(Text, { style: { fontWeight: 'bold', fontSize: 10, marginTop: 20 }, key: 'firma-name' }, name),
      h(Text, { style: { fontSize: 10 }, key: 'firma-doc' }, `C.C ${doc}`),
    ],
  });
};
