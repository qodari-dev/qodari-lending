import { ExportConfig } from '@/components/data-table/export';
import { PaymentTenderType } from '@/schemas/payment-tender-type';
import { formatDate } from '@/utils/formatters';

export const paymentTenderTypeExportConfig: ExportConfig<PaymentTenderType> = {
  title: 'Tipos de Medio de Pago',
  filename: 'tipos-medio-pago',
  columns: [
    { header: 'Nombre', accessorKey: 'name' },
    { header: 'Tipo', accessorKey: 'type' },
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
    {
      header: 'Actualizado',
      accessorKey: 'updatedAt',
      getValue: (row) => formatDate(row.updatedAt),
    },
  ],
};
