import { ExportConfig } from '@/components/data-table/export';
import { RepaymentMethod } from '@/schemas/repayment-method';
import { formatDate } from '@/utils/formatters';

export const repaymentMethodExportConfig: ExportConfig<RepaymentMethod> = {
  title: 'Metodos de Pago',
  filename: 'metodos-pago',
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
