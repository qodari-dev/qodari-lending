import { ExportConfig } from '@/components/data-table/export';
import { AccountingDistribution } from '@/schemas/accounting-distribution';
import { formatDate } from '@/utils/formatters';

export const accountingDistributionExportConfig: ExportConfig<AccountingDistribution> = {
  title: 'Distribuciones Contables',
  filename: 'distribuciones-contables',
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
