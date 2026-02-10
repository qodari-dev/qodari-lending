import React from 'react';
import { PdfTemplateBuilder } from '../types';
import { createBaseStyles } from '../theme';
import { PageShell } from '../components';
import { LoanDocumentData } from './loan-document-types';
import { getBorrowerFullName, getBorrowerDocument } from './loan-document-helpers';

const h = React.createElement;

export const cartaInstruccionesTemplate: PdfTemplateBuilder<LoanDocumentData> = (data, rpdf) => {
  const { Text, View } = rpdf;
  const styles = createBaseStyles(rpdf);
  const { loan } = data;

  const name = getBorrowerFullName(loan);
  const doc = getBorrowerDocument(loan);
  const bodyStyle = { marginBottom: 6, lineHeight: 1.5, fontSize: 9, textAlign: 'justify' as const };
  const labelStyle = { ...styles.metaLine, fontSize: 10 };

  return PageShell(rpdf, {
    children: [
      h(Text, { style: { ...styles.title, textAlign: 'right' }, key: 'title' }, 'Instrucciones para Llenar Pagare con Espacios en Blanco'),

      h(Text, { style: { ...labelStyle, marginTop: 12 }, key: 'pagare-num' }, `PAGARE No. ${loan.creditNumber}`),

      h(Text, { style: { ...bodyStyle, marginTop: 8 }, key: 'senores' }, 'Senores:\nCaja de Compensacion Familiar de Cartagena - Comfamiliar.\nLa Ciudad.'),

      h(Text, { style: bodyStyle, key: 'suscrito' }, 'El (los) suscrito (s):'),
      h(Text, { style: labelStyle, key: 'deudor' }, `Deudor Principal: ${name}`),
      h(Text, { style: { ...labelStyle, marginBottom: 8 }, key: 'codeudor' }, 'Primer Codeudor:'),

      h(Text, { style: bodyStyle, key: 'intro' }, 'Estoy (estamos) autorizando expresamente a Ustedes, tenedores legitimos del titulo valor expedido de acuerdo con la ley su circulacion, para que haciendo uso de las facultades conferidas por el articulo 622 del Codigo de Comercio, llene los espacios que se han dejado en blanco en el pagare correspondiente al credito concedido por esa institucion, lo que hara con sujecion a las instrucciones que se le imparte del modo siguiente:'),

      h(Text, { style: bodyStyle, key: 'p1' }, '1.- Un numero que lo identifique, de conformidad con el procedimiento que fije Comfamiliar.'),
      h(Text, { style: bodyStyle, key: 'p2' }, '2.- La fecha en que se otorga, que correspondera a la de la suscripcion del pagare.'),
      h(Text, { style: bodyStyle, key: 'p3' }, '3.- El monto exigible sera igual al valor de todas las cuotas insolutas o no canceladas en su oportunidad a cargo nuestro, y en favor de Comfamiliar que existan al momento de ser llenados los espacios en blanco.'),
      h(Text, { style: bodyStyle, key: 'p4' }, '4.- La tasa de intereses sera la que certifique la Superintendencia Financiera de Colombia, a la fecha del incumplimiento de las obligaciones a que da lugar la aplicacion de la clausula aceleratoria.'),
      h(Text, { style: bodyStyle, key: 'p5' }, '5.- Los espacios en blanco se llenaran cuando ocurra cualquiera de los eventos contenidos en la clausula aceleratoria.'),
      h(Text, { style: bodyStyle, key: 'p6' }, '6.- La fecha de vencimiento sera aquella en que se llenen los espacios dejados en blanco, para su exigibilidad ejecutiva.'),

      h(Text, { style: { ...bodyStyle, marginTop: 12 }, key: 'constancia' }, 'Para constancia, firmo (firmamos) en Cartagena de Indias, __________________'),

      h(View, { style: { flexDirection: 'row', marginTop: 30, gap: 40 }, key: 'firma-row' },
        h(View, { style: { width: '45%' }, key: 'firma-deudor' },
          h(Text, { style: { fontSize: 10, marginBottom: 4 } }, 'Deudor'),
          h(View, { style: { borderBottomWidth: 1, borderBottomColor: '#111827', width: '100%', marginBottom: 4, marginTop: 20 } }),
          h(Text, { style: { fontSize: 9 } }, name),
          h(Text, { style: { fontSize: 9 } }, `C.C. ${doc}`),
        ),
        h(View, { style: { width: '45%' }, key: 'firma-codeudor' },
          h(Text, { style: { fontSize: 10, marginBottom: 4 } }, 'Codeudor'),
          h(View, { style: { borderBottomWidth: 1, borderBottomColor: '#111827', width: '100%', marginBottom: 4, marginTop: 20 } }),
          h(Text, { style: { fontSize: 9 } }, ''),
          h(Text, { style: { fontSize: 9 } }, 'C.C.'),
        ),
      ),
    ],
  });
};
