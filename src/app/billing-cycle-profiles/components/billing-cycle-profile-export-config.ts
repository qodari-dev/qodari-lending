import { ExportConfig } from '@/components/data-table/export';
import { BillingCycleProfile } from '@/schemas/billing-cycle-profile';
import { formatDate } from '@/utils/formatters';

export const billingCycleProfileExportConfig: ExportConfig<BillingCycleProfile> = {
  title: 'Perfiles de Ciclo de Facturacion',
  filename: 'perfiles-ciclo-facturacion',
  columns: [
    { header: 'Nombre', accessorKey: 'name' },
    {
      header: 'Ciclos por Mes',
      accessorKey: 'cyclesPerMonth',
      getValue: (row) => String(row.cyclesPerMonth),
    },
    { header: 'Politica Fin de Semana', accessorKey: 'weekendPolicy' },
    {
      header: 'Estado',
      accessorKey: 'isActive',
      getValue: (row) => (row.isActive ? 'Activo' : 'Inactivo'),
    },
    {
      header: 'Actualizado',
      accessorKey: 'updatedAt',
      getValue: (row) => formatDate(row.updatedAt),
    },
  ],
};
