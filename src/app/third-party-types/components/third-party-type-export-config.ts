import { ExportConfig } from '@/components/data-table/export';
import { ThirdPartyType } from '@/schemas/third-party-type';
import { formatDate } from '@/utils/formatters';

export const thirdPartyTypeExportConfig: ExportConfig<ThirdPartyType> = {
  title: 'Tipos de Tercero',
  filename: 'tipos-tercero',
  columns: [
    { header: 'Nombre', accessorKey: 'name' },
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
