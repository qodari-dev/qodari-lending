import { ExportConfig } from '@/components/data-table/export';
import { AgingProfile } from '@/schemas/aging-profile';
import { formatDate } from '@/utils/formatters';

export const agingProfileExportConfig: ExportConfig<AgingProfile> = {
  title: 'Perfiles de Edad de Cartera',
  filename: 'perfiles-edad-cartera',
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
