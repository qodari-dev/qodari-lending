import { ExportConfig } from '@/components/data-table/export';
import { CoDebtor } from '@/schemas/co-debtor';
import { formatDate } from '@/utils/formatters';

export const coDebtorExportConfig: ExportConfig<CoDebtor> = {
  title: 'Codeudores',
  filename: 'codeudores',
  columns: [
    { header: 'Documento', accessorKey: 'documentNumber' },
    { header: 'Nombre', accessorKey: 'companyName' },
    { header: 'Telefono Casa', accessorKey: 'homePhone' },
    { header: 'Telefono Trabajo', accessorKey: 'workPhone' },
    {
      header: 'Creado',
      accessorKey: 'createdAt',
      getValue: (row) => formatDate(row.createdAt),
    },
  ],
};
