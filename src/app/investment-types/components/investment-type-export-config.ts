import { ExportConfig } from '@/components/data-table/export';
import { InvestmentType } from '@/schemas/investment-type';
import { formatDate } from '@/utils/formatters';

export const investmentTypeExportConfig: ExportConfig<InvestmentType> = {
  title: 'Tipos de Inversion',
  filename: 'tipos-inversion',
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
