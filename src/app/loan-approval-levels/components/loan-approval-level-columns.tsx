'use client';

import { DataTableColumnHeader } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { LoanApprovalLevel } from '@/schemas/loan-approval-level';
import { formatCurrency, formatDate } from '@/utils/formatters';
import type { ColumnDef } from '@tanstack/react-table';
import { CheckCircle, XCircle } from 'lucide-react';
import { LoanApprovalLevelRowActions } from './loan-approval-level-row-actions';

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

export const loanApprovalLevelColumns: ColumnDef<LoanApprovalLevel>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: 'levelOrder',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Orden" />,
    cell: ({ row }) => <span>{row.original.levelOrder}</span>,
  },
  {
    accessorKey: 'maxApprovalAmount',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tope monto" />,
    cell: ({ row }) =>
      row.original.maxApprovalAmount === null ? 'Sin tope' : formatCurrency(row.original.maxApprovalAmount),
  },
  {
    id: 'usersCount',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Usuarios" />,
    cell: ({ row }) => row.original.users?.length ?? 0,
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
    cell: ({ table, row }) => <LoanApprovalLevelRowActions row={row} table={table} />,
  },
];
