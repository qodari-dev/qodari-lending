'use client';

import { DataTableColumnHeader } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import {
  overpaymentHandlingLabels,
  OverpaymentHandling,
  PaymentAllocationPolicy,
} from '@/schemas/payment-allocation-policy';
import { formatDate } from '@/utils/formatters';
import type { ColumnDef } from '@tanstack/react-table';
import { CheckCircle, XCircle } from 'lucide-react';
import { PaymentAllocationPolicyRowActions } from './payment-allocation-policy-row-actions';

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

export const PaymentAllocationPolicyColumns: ColumnDef<PaymentAllocationPolicy>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: 'overpaymentHandling',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Excedente" />,
    cell: ({ row }) =>
      overpaymentHandlingLabels[row.original.overpaymentHandling as OverpaymentHandling] ??
      row.original.overpaymentHandling,
  },
  {
    id: 'rulesCount',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Reglas" />,
    cell: ({ row }) => (
      <Badge variant="outline">{row.original.paymentAllocationPolicyRules?.length ?? 0}</Badge>
    ),
  },
  {
    accessorKey: 'isActive',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => <StatusBadge isActive={row.original.isActive} />,
  },
  {
    accessorKey: 'updatedAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Actualizado" />,
    cell: ({ row }) => formatDate(row.original.updatedAt),
  },
  {
    id: 'actions',
    cell: ({ table, row }) => <PaymentAllocationPolicyRowActions row={row} table={table} />,
  },
];
