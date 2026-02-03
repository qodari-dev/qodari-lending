'use client';

import { DataTableColumnHeader } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { City } from '@/schemas/city';
import { formatDate } from '@/utils/formatters';
import type { ColumnDef } from '@tanstack/react-table';
import { CheckCircle, XCircle } from 'lucide-react';
import { CityRowActions } from './city-row-actions';

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
export const cityColumns: ColumnDef<City>[] = [
  {
    accessorKey: 'code',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Código" />,
    cell: ({ row }) => {
      return (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.code}</span>
        </div>
      );
    },
  },
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
    cell: ({ table, row }) => <CityRowActions row={row} table={table} />,
  },
];
