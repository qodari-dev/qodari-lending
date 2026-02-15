import React from 'react';
import { PdfTemplateBuilder } from '../types';
import { createBaseStyles } from '../theme';
import { LetterBody, PageShell, SignatureBlock } from '../components';
import { formatDate } from '../format';

const h = React.createElement;

export type CollectionLetterData = {
  title: string;
  subject: string;
  creditNumber: string;
  recipientName: string;
  city: string;
  generatedAt: string;
  paragraphs: string[];
  senderName: string;
  senderRole: string;
};

export const collectionLetterTemplate: PdfTemplateBuilder<CollectionLetterData> = (data, rpdf) => {
  const { Text } = rpdf;
  const styles = createBaseStyles(rpdf);

  return PageShell(rpdf, {
    children: [
      ...LetterBody(rpdf, {
        title: data.title,
        city: data.city,
        date: formatDate(data.generatedAt),
        paragraphs: [
          `Asunto: ${data.subject}`,
          `Credito No. ${data.creditNumber}`,
          `Deudor: ${data.recipientName}`,
          ...data.paragraphs,
        ],
      }),
      h(Text, { style: { ...styles.small, marginTop: 10 }, key: 'disclaimer' },
        'Documento de demostracion. Contenido sujeto a validacion del area juridica y de cartera.'
      ),
      SignatureBlock(rpdf, {
        name: data.senderName,
        title: data.senderRole,
      }),
    ],
  });
};

export function buildAdministrativeCollectionLetterData(creditNumber: string): CollectionLetterData {
  return {
    title: 'Carta de cobro administrativo',
    subject: 'Requerimiento de pago - Cobro administrativo',
    creditNumber,
    recipientName: 'Titular del credito',
    city: 'Cartagena',
    generatedAt: new Date().toISOString(),
    paragraphs: [
      'Respetado(a) cliente,',
      'Le informamos que su obligacion presenta saldo pendiente y requiere normalizacion inmediata.',
      'Agradecemos realizar el pago o comunicarse con el area de cartera para acordar una alternativa de normalizacion.',
      'Este requerimiento se emite como gestion previa dentro de la etapa administrativa.',
    ],
    senderName: 'Area de Cartera',
    senderRole: 'Cobro Administrativo',
  };
}

export function buildPreLegalCollectionLetterData(creditNumber: string): CollectionLetterData {
  return {
    title: 'Carta de cobro prejuridico',
    subject: 'Aviso de cobro prejuridico',
    creditNumber,
    recipientName: 'Titular del credito',
    city: 'Cartagena',
    generatedAt: new Date().toISOString(),
    paragraphs: [
      'Respetado(a) cliente,',
      'Le notificamos que la obligacion se encuentra en etapa prejuridica por mora en el pago.',
      'Solicitamos el pago inmediato del saldo exigible o la formalizacion de un acuerdo de pago dentro del plazo definido por cartera.',
      'En caso de no atender este requerimiento, podran iniciarse acciones de cobro juridico conforme a la normatividad aplicable.',
    ],
    senderName: 'Area de Cartera',
    senderRole: 'Cobro Prejuridico',
  };
}
