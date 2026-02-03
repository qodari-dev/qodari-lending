'use client';

import { DataTableColumnHeader } from '@/components/data-table';
import { ThirdPartyType } from '@/schemas/third-party-type';
import { formatDate } from '@/utils/formatters';
import type { ColumnDef } from '@tanstack/react-table';
import { ThirdPartyTypeRowActions } from './third-party-type-row-actions';

// ============================================================================
// Column Definitions
// ============================================================================
export const thirdPartyTypeColumns: ColumnDef<ThirdPartyType>[] = [
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
    cell: ({ table, row }) => <ThirdPartyTypeRowActions row={row} table={table} />,
  },
];
