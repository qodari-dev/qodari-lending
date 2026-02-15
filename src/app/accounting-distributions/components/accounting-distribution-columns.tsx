'use client';

import { DataTableColumnHeader } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { AccountingDistribution } from '@/schemas/accounting-distribution';
import { formatDate, formatPercent } from '@/utils/formatters';
import type { ColumnDef } from '@tanstack/react-table';
import { CheckCircle, XCircle } from 'lucide-react';
import { AccountingDistributionRowActions } from './accounting-distribution-row-actions';

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
// Column Definitions
// ============================================================================
export const accountingDistributionColumns: ColumnDef<AccountingDistribution>[] = [
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
    id: 'linesCount',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Lineas" />,
    cell: ({ row }) => {
      const count = row.original.accountingDistributionLines?.length ?? 0;
      return <Badge variant="outline">{count}</Badge>;
    },
  },
  {
    id: 'distributionBalance',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Cuadre" />,
    cell: ({ row }) => {
      const lines = row.original.accountingDistributionLines ?? [];
      const totals = lines.reduce(
        (acc, line) => {
          const value = Number(line.percentage) || 0;
          if (line.nature === 'DEBIT') acc.debit += value;
          if (line.nature === 'CREDIT') acc.credit += value;
          return acc;
        },
        { debit: 0, credit: 0 }
      );
      const epsilon = 0.01;
      const debitOk = Math.abs(totals.debit - 100) <= epsilon;
      const creditOk = Math.abs(totals.credit - 100) <= epsilon;
      const balanced = debitOk && creditOk;

      return (
        <div className="flex flex-col gap-1">
          <Badge variant={balanced ? 'default' : 'outline'}>
            {balanced ? 'Cuadrado' : 'Descuadrado'}
          </Badge>
          <span className="text-muted-foreground text-xs font-mono">
            D {formatPercent(totals.debit, 2)} | C {formatPercent(totals.credit, 2)}
          </span>
        </div>
      );
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
    cell: ({ table, row }) => <AccountingDistributionRowActions row={row} table={table} />,
  },
];
