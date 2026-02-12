import { ExportConfig } from '@/components/data-table/export';
import { InsuranceCompany } from '@/schemas/insurance-company';
import { formatDate } from '@/utils/formatters';

export const insuranceCompanyExportConfig: ExportConfig<InsuranceCompany> = {
  title: 'Aseguradoras',
  filename: 'aseguradoras',
  columns: [
    { header: 'Razon Social', accessorKey: 'businessName' },
    { header: 'NIT', accessorKey: 'documentNumber' },
    { header: 'Factor', accessorKey: 'factor' },
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
