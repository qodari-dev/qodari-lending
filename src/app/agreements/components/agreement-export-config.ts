import { ExportConfig } from '@/components/data-table/export';
import { Agreement } from '@/schemas/agreement';
import { formatDate } from '@/utils/formatters';

export const agreementExportConfig: ExportConfig<Agreement> = {
  title: 'Convenios',
  filename: 'convenios',
  columns: [
    { header: 'Codigo', accessorKey: 'agreementCode' },
    { header: 'NIT', accessorKey: 'documentNumber' },
    { header: 'Razon Social', accessorKey: 'businessName' },
    {
      header: 'Fecha Inicio',
      accessorKey: 'startDate',
      getValue: (row) => formatDate(row.startDate),
    },
    {
      header: 'Fecha Fin',
      accessorKey: 'endDate',
      getValue: (row) => (row.endDate ? formatDate(row.endDate) : 'Vigente'),
    },
    {
      header: 'Estado',
      accessorKey: 'isActive',
      getValue: (row) => (row.isActive ? 'Activo' : 'Inactivo'),
    },
  ],
};
