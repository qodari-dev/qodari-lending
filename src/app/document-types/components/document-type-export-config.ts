import { ExportConfig } from '@/components/data-table/export';
import { DocumentType } from '@/schemas/document-type';
import { formatDate } from '@/utils/formatters';

export const documentTypeExportConfig: ExportConfig<DocumentType> = {
  title: 'Tipos de Documento',
  filename: 'tipos-documento',
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
