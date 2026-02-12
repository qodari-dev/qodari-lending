import { ExportConfig } from '@/components/data-table/export';
import { AccountingPeriod } from '@/schemas/accounting-period';
import { formatDate } from '@/utils/formatters';

export const accountingPeriodExportConfig: ExportConfig<AccountingPeriod> = {
  title: 'Periodos Contables',
  filename: 'periodos-contables',
  columns: [
    { header: 'Ano', accessorKey: 'year' },
    {
      header: 'Mes',
      accessorKey: 'month',
      getValue: (row) => String(row.month),
    },
    {
      header: 'Estado',
      accessorKey: 'isClosed',
      getValue: (row) => (row.isClosed ? 'Cerrado' : 'Abierto'),
    },
    {
      header: 'Fecha Cierre',
      accessorKey: 'closedAt',
      getValue: (row) => formatDate(row.closedAt),
    },
    {
      header: 'Creado',
      accessorKey: 'createdAt',
      getValue: (row) => formatDate(row.createdAt),
    },
  ],
};
