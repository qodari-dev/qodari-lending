import { LoanDocumentData } from './loan-document-types';
import {
  getAgreementAddress,
  getAgreementName,
  getAgreementNit,
  getBorrowerAddress,
  getBorrowerDocument,
  getBorrowerEmail,
  getBorrowerFullName,
  getBorrowerPhone,
  getCategoryCode,
  getCreditLineName,
  getFinancingRatePercent,
  getInstallmentTotalCuota,
} from './loan-document-helpers';

function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed);
}

function formatCurrency(value: string | number | null | undefined) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return '$ 0';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(numeric);
}

export type LoanDocumentHbsContext = Record<string, string>;

export function buildLoanDocumentHbsContext(args: LoanDocumentData): LoanDocumentHbsContext {
  const { loan, printDate } = args;
  const installments = (loan.loanInstallments ?? []).filter((item) => item.status !== 'VOID');
  const firstInstallment = installments[0];
  const firstInstallmentValue = firstInstallment
    ? getInstallmentTotalCuota(firstInstallment)
    : 0;

  return {
    credit_number: loan.creditNumber,
    monto_credito: formatCurrency(loan.principalAmount),
    monto_total_credito: formatCurrency(loan.initialTotalAmount),
    valor_seguro: formatCurrency(loan.insuranceValue ?? 0),
    valor_cuota: formatCurrency(firstInstallmentValue),
    numero_cuotas: String(loan.installments),
    fecha_credito: formatDate(loan.creditStartDate),
    fecha_primer_pago: formatDate(loan.firstCollectionDate),
    fecha_vencimiento_final: formatDate(loan.maturityDate),
    estado_credito: loan.status,
    estado_desembolso: loan.disbursementStatus,
    fecha_impresion: formatDate(printDate),
    titular_nombre: getBorrowerFullName(loan),
    titular_documento: getBorrowerDocument(loan),
    titular_direccion: getBorrowerAddress(loan),
    titular_telefono: getBorrowerPhone(loan),
    titular_email: getBorrowerEmail(loan),
    convenio_nombre: getAgreementName(loan),
    convenio_nit: getAgreementNit(loan),
    convenio_direccion: getAgreementAddress(loan),
    convenio_telefono: loan.agreement?.phone ?? '-',
    linea_credito_id: loan.loanApplication?.creditProduct?.id
      ? String(loan.loanApplication.creditProduct.id)
      : '-',
    linea_credito: getCreditLineName(loan),
    tasa_financiacion: getFinancingRatePercent(loan),
    salario_base: loan.loanApplication?.salary ?? '0',
    categoria_trabajador: getCategoryCode(loan),
  };
}
