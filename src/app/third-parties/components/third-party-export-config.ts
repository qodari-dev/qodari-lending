import { ExportConfig } from '@/components/data-table/export';
import { ThirdParty, personTypeLabels } from '@/schemas/third-party';
import { formatDate } from '@/utils/formatters';

export const thirdPartyExportConfig: ExportConfig<ThirdParty> = {
  title: 'Terceros',
  filename: 'terceros',
  columns: [
    { header: 'Documento', accessorKey: 'documentNumber' },
    {
      header: 'Tipo Persona',
      accessorKey: 'personType',
      getValue: (row) => personTypeLabels[row.personType] ?? row.personType,
    },
    {
      header: 'Nombre',
      getValue: (row) => {
        if (row.personType === 'NATURAL') {
          return `${row.firstName ?? ''} ${row.firstLastName ?? ''}`.trim() || '-';
        }
        return row.businessName ?? '-';
      },
    },
    { header: 'Telefono', accessorKey: 'phone' },
    {
      header: 'Creado',
      accessorKey: 'createdAt',
      getValue: (row) => formatDate(row.createdAt),
    },
  ],
};
