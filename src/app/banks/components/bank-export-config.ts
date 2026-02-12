import { ExportConfig } from '@/components/data-table/export';
import { Bank } from '@/schemas/bank';
import { formatDate } from '@/utils/formatters';

export const bankExportConfig: ExportConfig<Bank> = {
  title: 'Bancos',
  filename: 'bancos',
  columns: [
    { header: 'Nombre', accessorKey: 'name' },
    { header: 'Codigo Asobancaria', accessorKey: 'asobancariaCode' },
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
