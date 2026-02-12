import { ExportConfig } from '@/components/data-table/export';
import { AffiliationOffice } from '@/schemas/affiliation-office';
import { formatDate } from '@/utils/formatters';

export const affiliationOfficeExportConfig: ExportConfig<AffiliationOffice> = {
  title: 'Oficinas de Afiliacion',
  filename: 'oficinas-afiliacion',
  columns: [
    { header: 'Codigo', accessorKey: 'code' },
    { header: 'Nombre', accessorKey: 'name' },
    { header: 'Representante', accessorKey: 'representativeName' },
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
  ],
};
