import { ExportConfig } from '@/components/data-table/export';
import { RejectionReason } from '@/schemas/rejection-reason';
import { formatDate } from '@/utils/formatters';

export const rejectionReasonExportConfig: ExportConfig<RejectionReason> = {
  title: 'Razones de Rechazo',
  filename: 'razones-rechazo',
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
