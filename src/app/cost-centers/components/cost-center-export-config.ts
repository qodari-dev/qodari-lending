import { ExportConfig } from '@/components/data-table/export';
import { CostCenter } from '@/schemas/cost-center';
import { formatDate } from '@/utils/formatters';

export const costCenterExportConfig: ExportConfig<CostCenter> = {
  title: 'Centros de Costo',
  filename: 'centros-costo',
  columns: [
    { header: 'Codigo', accessorKey: 'code' },
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
