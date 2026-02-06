'use client';

import { DataTableColumnHeader } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { CreditFund } from '@/schemas/credit-fund';
import { formatDate } from '@/utils/formatters';
import type { ColumnDef } from '@tanstack/react-table';
import { CheckCircle, XCircle } from 'lucide-react';
import { CreditFundRowActions } from './credit-fund-row-actions';

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

function BooleanBadge({ value }: { value: boolean }) {
  if (value) {
    return (
      <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
        Si
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-muted-foreground gap-1">
      No
    </Badge>
  );
}

// ============================================================================
// Column Definitions
// ============================================================================
export const creditFundColumns: ColumnDef<CreditFund>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.original.name}</span>
      </div>
    ),
  },
  {
    accessorKey: 'isControlled',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Controla" />,
    cell: ({ row }) => <BooleanBadge value={row.getValue('isControlled')} />,
  },
  {
    id: 'budgetsCount',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Presupuestos" />,
    cell: ({ row }) => {
      const count = row.original.creditFundBudgets?.length ?? 0;
      return <Badge variant="outline">{count}</Badge>;
    },
  },
  {
    accessorKey: 'isActive',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => <StatusBadge isActive={row.getValue('isActive')} />,
    filterFn: (row, id, value: boolean) => {
      return row.getValue(id) === value;
    },
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Creado" />,
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span>{formatDate(row.original.createdAt)}</span>
      </div>
    ),
  },
  {
    accessorKey: 'updatedAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Actualizado" />,
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span>{formatDate(row.original.updatedAt)}</span>
      </div>
    ),
  },

  // Actions Column
  {
    id: 'actions',
    cell: ({ table, row }) => <CreditFundRowActions row={row} table={table} />,
  },
];
