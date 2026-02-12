import { ExportConfig } from '@/components/data-table/export';
import { CreditFund } from '@/schemas/credit-fund';
import { formatDate } from '@/utils/formatters';

export const creditFundExportConfig: ExportConfig<CreditFund> = {
  title: 'Fondos de Credito',
  filename: 'fondos-credito',
  columns: [
    { header: 'Nombre', accessorKey: 'name' },
    {
      header: 'Controlado',
      accessorKey: 'isControlled',
      getValue: (row) => (row.isControlled ? 'Si' : 'No'),
    },
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
