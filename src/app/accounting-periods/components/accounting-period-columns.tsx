'use client';

import { DataTableColumnHeader } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { AccountingPeriod, MONTH_LABELS } from '@/schemas/accounting-period';
import { formatDate } from '@/utils/formatters';
import type { ColumnDef } from '@tanstack/react-table';
import { Lock, LockOpen } from 'lucide-react';
import { AccountingPeriodRowActions } from './accounting-period-row-actions';

// ============================================================================
// Status Badge
// ============================================================================

function ClosedStatusBadge({ isClosed }: { isClosed: boolean }) {
  if (isClosed) {
    return (
      <Badge variant="destructive" className="gap-1">
        <Lock className="h-3 w-3" />
        Cerrado
      </Badge>
    );
  }

  return (
    <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
      <LockOpen className="h-3 w-3" />
      Abierto
    </Badge>
  );
}

// ============================================================================
// Column Definitions
// ============================================================================
export const accountingPeriodColumns: ColumnDef<AccountingPeriod>[] = [
  {
    accessorKey: 'year',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Año" />,
    cell: ({ row }) => {
      return (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.year}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'month',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Mes" />,
    cell: ({ row }) => {
      const month = row.original.month;
      return (
        <div className="flex flex-col">
          <span>{MONTH_LABELS[month] ?? month}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'isClosed',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => <ClosedStatusBadge isClosed={row.getValue('isClosed')} />,
    filterFn: (row, id, value: boolean) => {
      return row.getValue(id) === value;
    },
  },
  {
    accessorKey: 'closedAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha Cierre" />,
    cell: ({ row }) => {
      const closedAt = row.original.closedAt;
      return (
        <div className="flex flex-col">
          <span className="text-muted-foreground">{closedAt ? formatDate(closedAt) : '-'}</span>
        </div>
      );
    },
  },
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
  {
    id: 'actions',
    cell: ({ table, row }) => <AccountingPeriodRowActions row={row} table={table} />,
  },
];
