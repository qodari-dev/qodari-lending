import { ExportConfig } from '@/components/data-table/export';
import { GlAccount } from '@/schemas/gl-account';
import { formatDate } from '@/utils/formatters';

export const glAccountExportConfig: ExportConfig<GlAccount> = {
  title: 'Cuentas Contables',
  filename: 'cuentas-contables',
  columns: [
    { header: 'Codigo', accessorKey: 'code' },
    { header: 'Nombre', accessorKey: 'name' },
    { header: 'Config. Tercero', accessorKey: 'thirdPartySetting' },
    { header: 'Tipo Detalle', accessorKey: 'detailType' },
    {
      header: 'Requiere Centro Costo',
      accessorKey: 'requiresCostCenter',
      getValue: (row) => (row.requiresCostCenter ? 'Si' : 'No'),
    },
    {
      header: 'Es Banco',
      accessorKey: 'isBank',
      getValue: (row) => (row.isBank ? 'Si' : 'No'),
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
