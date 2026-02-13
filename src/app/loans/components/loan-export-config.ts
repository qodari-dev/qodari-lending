import { ExportConfig } from '@/components/data-table/export';
import { Loan } from '@/schemas/loan';
import { formatCurrency, formatDate } from '@/utils/formatters';

export const loanExportConfig: ExportConfig<Loan> = {
  title: 'Creditos',
  filename: 'creditos',
  columns: [
    { header: 'No. Credito', accessorKey: 'creditNumber' },
    {
      header: 'Monto',
      accessorKey: 'principalAmount',
      getValue: (row) => formatCurrency(row.principalAmount),
    },
    {
      header: 'Cuotas',
      accessorKey: 'installments',
      getValue: (row) => String(row.installments),
    },
    { header: 'Estado', accessorKey: 'status' },
    {
      header: 'En Juridica',
      accessorKey: 'hasLegalProcess',
      getValue: (row) => (row.hasLegalProcess ? 'Si' : 'No'),
    },
    {
      header: 'Fecha Juridica',
      accessorKey: 'legalProcessDate',
      getValue: (row) => formatDate(row.legalProcessDate),
    },
    {
      header: 'Tiene Acuerdo Pago',
      accessorKey: 'hasPaymentAgreement',
      getValue: (row) => (row.hasPaymentAgreement ? 'Si' : 'No'),
    },
    {
      header: 'Fecha Acuerdo Pago',
      accessorKey: 'paymentAgreementDate',
      getValue: (row) => formatDate(row.paymentAgreementDate),
    },
    {
      header: 'Fecha Registro',
      accessorKey: 'recordDate',
      getValue: (row) => formatDate(row.recordDate),
    },
    {
      header: 'Fecha Inicio',
      accessorKey: 'creditStartDate',
      getValue: (row) => formatDate(row.creditStartDate),
    },
  ],
};
