import { ExportConfig } from '@/components/data-table/export';
import { PaymentFrequency } from '@/schemas/payment-frequency';
import { formatDate } from '@/utils/formatters';

export const paymentFrequencyExportConfig: ExportConfig<PaymentFrequency> = {
  title: 'Frecuencias de Pago',
  filename: 'frecuencias-pago',
  columns: [
    { header: 'Nombre', accessorKey: 'name' },
    { header: 'Dias Intervalo', accessorKey: 'daysInterval' },
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
