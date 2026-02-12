import { ExportConfig } from '@/components/data-table/export';
import { PaymentGuaranteeType } from '@/schemas/payment-guarantee-type';
import { formatDate } from '@/utils/formatters';

export const paymentGuaranteeTypeExportConfig: ExportConfig<PaymentGuaranteeType> = {
  title: 'Tipos de Garantia de Pago',
  filename: 'tipos-garantia-pago',
  columns: [
    { header: 'Nombre', accessorKey: 'name' },
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
