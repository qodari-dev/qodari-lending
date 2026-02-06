'use client';

import { DataTableColumnHeader } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import {
  paymentReceiptMovementTypeLabels,
  PaymentReceiptMovementType,
  PaymentReceiptType,
} from '@/schemas/payment-receipt-type';
import { formatDate } from '@/utils/formatters';
import type { ColumnDef } from '@tanstack/react-table';
import { CheckCircle, XCircle } from 'lucide-react';
import { PaymentReceiptTypeRowActions } from './payment-receipt-type-row-actions';

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

export const paymentReceiptTypeColumns: ColumnDef<PaymentReceiptType>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: 'movementType',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Movimiento" />,
    cell: ({ row }) => {
      const value = row.original.movementType as PaymentReceiptMovementType;
      return <Badge variant="outline">{paymentReceiptMovementTypeLabels[value] ?? value}</Badge>;
    },
  },
  {
    accessorKey: 'glAccountId',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Cuenta" />,
    cell: ({ row }) => {
      const account = row.original.glAccount;
      if (!account) return <span>{row.original.glAccountId}</span>;
      return <span>{account.code} - {account.name}</span>;
    },
  },
  {
    id: 'usersCount',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Usuarios" />,
    cell: ({ row }) => <Badge variant="outline">{row.original.userPaymentReceiptTypes?.length ?? 0}</Badge>,
  },
  {
    accessorKey: 'isActive',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => <StatusBadge isActive={row.getValue('isActive')} />,
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Creado" />,
    cell: ({ row }) => <span>{formatDate(row.original.createdAt)}</span>,
  },
  {
    id: 'actions',
    cell: ({ table, row }) => <PaymentReceiptTypeRowActions row={row} table={table} />,
  },
];
