import { ExportConfig } from '@/components/data-table/export';
import { Channel } from '@/schemas/channel';
import { formatDate } from '@/utils/formatters';

export const channelExportConfig: ExportConfig<Channel> = {
  title: 'Canales',
  filename: 'canales',
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
