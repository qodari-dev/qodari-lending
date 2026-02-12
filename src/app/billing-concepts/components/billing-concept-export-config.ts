import { ExportConfig } from '@/components/data-table/export';
import { BillingConcept } from '@/schemas/billing-concept';
import { formatDate } from '@/utils/formatters';

export const billingConceptExportConfig: ExportConfig<BillingConcept> = {
  title: 'Conceptos de Facturacion',
  filename: 'conceptos-facturacion',
  columns: [
    { header: 'Codigo', accessorKey: 'code' },
    { header: 'Nombre', accessorKey: 'name' },
    { header: 'Tipo', accessorKey: 'conceptType' },
    { header: 'Frecuencia', accessorKey: 'defaultFrequency' },
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
