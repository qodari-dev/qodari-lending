import { ExportConfig } from '@/components/data-table/export';
import {
  paymentScheduleModeLabels,
  PaymentFrequency,
} from '@/schemas/payment-frequency';
import { formatDate } from '@/utils/formatters';
import { formatPaymentFrequencyRule } from '@/utils/payment-frequency';

export const paymentFrequencyExportConfig: ExportConfig<PaymentFrequency> = {
  title: 'Frecuencias de Pago',
  filename: 'frecuencias-pago',
  columns: [
    { header: 'Nombre', accessorKey: 'name' },
    {
      header: 'Modo',
      accessorKey: 'scheduleMode',
      getValue: (row) => paymentScheduleModeLabels[row.scheduleMode],
    },
    {
      header: 'Regla',
      accessorKey: 'scheduleMode',
      getValue: (row) =>
        formatPaymentFrequencyRule({
          scheduleMode: row.scheduleMode,
          intervalDays: row.intervalDays,
          dayOfMonth: row.dayOfMonth,
          semiMonthDay1: row.semiMonthDay1,
          semiMonthDay2: row.semiMonthDay2,
        }),
    },
    {
      header: 'Ajusta fin de mes',
      accessorKey: 'useEndOfMonthFallback',
      getValue: (row) => (row.useEndOfMonthFallback ? 'Sí' : 'No'),
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
