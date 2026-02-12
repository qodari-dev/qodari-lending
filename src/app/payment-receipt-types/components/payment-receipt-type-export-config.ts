import { ExportConfig } from '@/components/data-table/export';
import { PaymentReceiptType } from '@/schemas/payment-receipt-type';
import { formatDate } from '@/utils/formatters';

export const paymentReceiptTypeExportConfig: ExportConfig<PaymentReceiptType> = {
  title: 'Tipos de Recibo de Pago',
  filename: 'tipos-recibo-pago',
  columns: [
    { header: 'Codigo', accessorKey: 'code' },
    { header: 'Nombre', accessorKey: 'name' },
    { header: 'Tipo Movimiento', accessorKey: 'movementType' },
    {
      header: 'Estado',
      accessorKey: 'isActive',
      getValue: (row) => (row.isActive ? 'Activo' : 'Inactivo'),
    },
    {
      header: 'Creado',
      accessorKey: 'createdAt',
      getValue: (row) => formatDate(row.createdAt),
    },
  ],
};
