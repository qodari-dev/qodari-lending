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
