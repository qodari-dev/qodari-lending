import { ExportConfig } from '@/components/data-table/export';
import { PaymentAllocationPolicy } from '@/schemas/payment-allocation-policy';
import { formatDate } from '@/utils/formatters';

export const paymentAllocationPolicyExportConfig: ExportConfig<PaymentAllocationPolicy> = {
  title: 'Politicas de Asignacion de Pago',
  filename: 'politicas-asignacion-pago',
  columns: [
    { header: 'Nombre', accessorKey: 'name' },
    { header: 'Manejo Sobrepago', accessorKey: 'overpaymentHandling' },
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
