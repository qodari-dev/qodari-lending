import { ExportConfig } from '@/components/data-table/export';
import { LoanApplication } from '@/schemas/loan-application';
import { formatCurrency, formatDate } from '@/utils/formatters';

export const loanApplicationExportConfig: ExportConfig<LoanApplication> = {
  title: 'Solicitudes de Credito',
  filename: 'solicitudes-credito',
  columns: [
    { header: 'No. Credito', accessorKey: 'creditNumber' },
    {
      header: 'Monto Solicitado',
      accessorKey: 'requestedAmount',
      getValue: (row) => formatCurrency(row.requestedAmount),
    },
    {
      header: 'Cuotas',
      accessorKey: 'installments',
      getValue: (row) => String(row.installments),
    },
    { header: 'Estado', accessorKey: 'status' },
    {
      header: 'Fecha Solicitud',
      accessorKey: 'applicationDate',
      getValue: (row) => formatDate(row.applicationDate),
    },
    {
      header: 'Creado',
      accessorKey: 'createdAt',
      getValue: (row) => formatDate(row.createdAt),
    },
  ],
};
