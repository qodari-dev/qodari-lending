import { Loans } from '@/server/db/types';
import { PdfTemplateBuilder } from '../types';

export type LoanDocumentData = {
  loan: Loans;
  printDate: string;
};

export const LOAN_DOCUMENT_TYPES = [
  'plan-de-pagos',
  'pignoracion',
  'pagare',
  'carta-instrucciones',
  'liquidacion',
  'aceptacion',
  'libranza',
] as const;

export type LoanDocumentType = (typeof LOAN_DOCUMENT_TYPES)[number];

export const loanDocumentLabels: Record<LoanDocumentType, string> = {
  'plan-de-pagos': 'Plan de pagos',
  pignoracion: 'Pignoración',
  pagare: 'Pagaré',
  'carta-instrucciones': 'Carta de instrucciones',
  liquidacion: 'Liquidación del crédito',
  aceptacion: 'Aceptación del crédito',
  libranza: 'Libranza',
};

export async function getLoanDocumentTemplate(
  type: LoanDocumentType,
): Promise<PdfTemplateBuilder<LoanDocumentData>> {
  switch (type) {
    case 'plan-de-pagos':
      return (await import('./plan-de-pagos')).planDePagosTemplate;
    case 'pignoracion':
      return (await import('./pignoracion')).pignoracionTemplate;
    case 'pagare':
      return (await import('./pagare')).pagareTemplate;
    case 'carta-instrucciones':
      return (await import('./carta-instrucciones')).cartaInstruccionesTemplate;
    case 'liquidacion':
      return (await import('./liquidacion')).liquidacionTemplate;
    case 'aceptacion':
      return (await import('./aceptacion')).aceptacionTemplate;
    case 'libranza':
      return (await import('./libranza')).libranzaTemplate;
  }
}
