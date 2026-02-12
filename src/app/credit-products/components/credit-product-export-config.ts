import { ExportConfig } from '@/components/data-table/export';
import { CreditProduct } from '@/schemas/credit-product';
import { formatDate } from '@/utils/formatters';

export const creditProductExportConfig: ExportConfig<CreditProduct> = {
  title: 'Productos de Credito',
  filename: 'productos-credito',
  columns: [
    { header: 'Nombre', accessorKey: 'name' },
    { header: 'Tipo Financiacion', accessorKey: 'financingType' },
    {
      header: 'Paga Seguro',
      accessorKey: 'paysInsurance',
      getValue: (row) => (row.paysInsurance ? 'Si' : 'No'),
    },
    {
      header: 'Reporta Central',
      accessorKey: 'reportsToCreditBureau',
      getValue: (row) => (row.reportsToCreditBureau ? 'Si' : 'No'),
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
  ],
};
