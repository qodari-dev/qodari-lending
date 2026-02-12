import { ExportConfig } from '@/components/data-table/export';
import { IdentificationType } from '@/schemas/identification-type';
import { formatDate } from '@/utils/formatters';

export const identificationTypeExportConfig: ExportConfig<IdentificationType> = {
  title: 'Tipos de Identificacion',
  filename: 'tipos-identificacion',
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
