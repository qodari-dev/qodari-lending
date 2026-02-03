'use client';

import { DataTableColumnHeader } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { PaymentTenderType, PaymentTenderTypeLabels, PaymentTenderTypeValue } from '@/schemas/payment-tender-type';
import { formatDate } from '@/utils/formatters';
import type { ColumnDef } from '@tanstack/react-table';
import { CheckCircle, XCircle } from 'lucide-react';
import { PaymentTenderTypeRowActions } from './payment-tender-type-row-actions';

// ============================================================================
// Status Badge
// ============================================================================

function StatusBadge({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return (
      <Badge variant="default" className="gap-1 bg-amber-600 hover:bg-amber-700">
        <CheckCircle className="h-3 w-3" />
        Activo
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-muted-foreground gap-1">
      <XCircle className="h-3 w-3" />
      Inactivo
    </Badge>
  );
}

// ============================================================================
// Type Badge
// ============================================================================

function TypeBadge({ type }: { type: PaymentTenderTypeValue }) {
  const colorMap: Record<PaymentTenderTypeValue, string> = {
    TRANSFER: 'bg-blue-600 hover:bg-blue-700',
    CHECK: 'bg-purple-600 hover:bg-purple-700',
    CASH: 'bg-green-600 hover:bg-green-700',
  };

  return (
    <Badge variant="default" className={colorMap[type]}>
      {PaymentTenderTypeLabels[type]}
    </Badge>
  );
}

// ============================================================================
// Column Definitions
// ============================================================================
export const paymentTenderTypeColumns: ColumnDef<PaymentTenderType>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
    cell: ({ row }) => {
      return (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.name}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'type',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
    cell: ({ row }) => <TypeBadge type={row.original.type as PaymentTenderTypeValue} />,
    filterFn: (row, id, value: string[]) => {
      return value.includes(row.getValue(id));
    },
  },

  // Is Active Column
  {
    accessorKey: 'isActive',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => <StatusBadge isActive={row.getValue('isActive')} />,
    filterFn: (row, id, value: boolean) => {
      return row.getValue(id) === value;
    },
  },
  // Created At Column
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Creado" />,
    cell: ({ row }) => {
      return (
        <div className="flex flex-col">
          <span>{formatDate(row.original.createdAt)}</span>
        </div>
      );
    },
  },
  // Updated At Column
  {
    accessorKey: 'updatedAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Actualizado" />,
    cell: ({ row }) => {
      return (
        <div className="flex flex-col">
          <span>{formatDate(row.original.updatedAt)}</span>
        </div>
      );
    },
  },

  // Actions Column
  {
    id: 'actions',
    cell: ({ table, row }) => <PaymentTenderTypeRowActions row={row} table={table} />,
  },
];
