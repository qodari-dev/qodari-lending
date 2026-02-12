import { ExportConfig } from '@/components/data-table/export';
import { LoanPayment } from '@/schemas/loan-payment';
import { formatCurrency, formatDate } from '@/utils/formatters';

export const loanPaymentExportConfig: ExportConfig<LoanPayment> = {
  title: 'Pagos de Credito',
  filename: 'pagos-credito',
  columns: [
    { header: 'No. Pago', accessorKey: 'paymentNumber' },
    { header: 'Tipo Movimiento', accessorKey: 'movementType' },
    {
      header: 'Monto',
      accessorKey: 'amount',
      getValue: (row) => formatCurrency(row.amount),
    },
    { header: 'Estado', accessorKey: 'status' },
    {
      header: 'Fecha Pago',
      accessorKey: 'paymentDate',
      getValue: (row) => formatDate(row.paymentDate),
    },
    {
      header: 'Creado',
      accessorKey: 'createdAt',
      getValue: (row) => formatDate(row.createdAt),
    },
  ],
};
