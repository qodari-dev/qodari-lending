import React from 'react';
import { PdfTemplateBuilder } from '../types';
import { createBaseStyles } from '../theme';
import { PageShell, SignatureField, SignatureRow } from '../components';
import { LoanDocumentData } from './loan-document-types';
import { getBorrowerFullName, getBorrowerDocument } from './loan-document-helpers';

const h = React.createElement;

export const cartaInstruccionesTemplate: PdfTemplateBuilder<LoanDocumentData> = (data, rpdf) => {
  const { Text } = rpdf;
  const styles = createBaseStyles(rpdf);
  const { loan } = data;

  const name = getBorrowerFullName(loan);
  const doc = getBorrowerDocument(loan);

  return PageShell(rpdf, {
    styles,
    children: [
      h(Text, { style: { ...styles.title, textAlign: 'right' }, key: 'title' }, 'Instrucciones para Llenar Pagare con Espacios en Blanco'),

      h(Text, { style: { ...styles.labelText, marginTop: 12 }, key: 'pagare-num' }, `PAGARE No. ${loan.creditNumber}`),

      h(Text, { style: { ...styles.legalText, marginTop: 8 }, key: 'senores' }, 'Senores:\nCaja de Compensacion Familiar de Cartagena - Comfamiliar.\nLa Ciudad.'),

      h(Text, { style: styles.legalText, key: 'suscrito' }, 'El (los) suscrito (s):'),
      h(Text, { style: styles.labelText, key: 'deudor' }, `Deudor Principal: ${name}`),
      h(Text, { style: { ...styles.labelText, marginBottom: 8 }, key: 'codeudor' }, 'Primer Codeudor:'),

      h(Text, { style: styles.legalText, key: 'intro' }, 'Estoy (estamos) autorizando expresamente a Ustedes, tenedores legitimos del titulo valor expedido de acuerdo con la ley su circulacion, para que haciendo uso de las facultades conferidas por el articulo 622 del Codigo de Comercio, llene los espacios que se han dejado en blanco en el pagare correspondiente al credito concedido por esa institucion, lo que hara con sujecion a las instrucciones que se le imparte del modo siguiente:'),

      h(Text, { style: styles.legalText, key: 'p1' }, '1.- Un numero que lo identifique, de conformidad con el procedimiento que fije Comfamiliar.'),
      h(Text, { style: styles.legalText, key: 'p2' }, '2.- La fecha en que se otorga, que correspondera a la de la suscripcion del pagare.'),
      h(Text, { style: styles.legalText, key: 'p3' }, '3.- El monto exigible sera igual al valor de todas las cuotas insolutas o no canceladas en su oportunidad a cargo nuestro, y en favor de Comfamiliar que existan al momento de ser llenados los espacios en blanco.'),
      h(Text, { style: styles.legalText, key: 'p4' }, '4.- La tasa de intereses sera la que certifique la Superintendencia Financiera de Colombia, a la fecha del incumplimiento de las obligaciones a que da lugar la aplicacion de la clausula aceleratoria.'),
      h(Text, { style: styles.legalText, key: 'p5' }, '5.- Los espacios en blanco se llenaran cuando ocurra cualquiera de los eventos contenidos en la clausula aceleratoria.'),
      h(Text, { style: styles.legalText, key: 'p6' }, '6.- La fecha de vencimiento sera aquella en que se llenen los espacios dejados en blanco, para su exigibilidad ejecutiva.'),

      h(Text, { style: { ...styles.legalText, marginTop: 12 }, key: 'constancia' }, 'Para constancia, firmo (firmamos) en Cartagena de Indias, __________________'),

      SignatureRow(rpdf, styles, [
        SignatureField(rpdf, styles, {
          title: 'Deudor',
          fields: [
            { label: 'Nombre', value: name },
            { label: 'C.C.', value: doc },
          ],
          showSignatureLine: false,
        }),
        SignatureField(rpdf, styles, {
          title: 'Codeudor',
          fields: [
            { label: 'Nombre' },
            { label: 'C.C.' },
          ],
          showSignatureLine: false,
        }),
      ]),
    ],
  });
};
