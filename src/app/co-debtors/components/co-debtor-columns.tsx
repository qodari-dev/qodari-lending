'use client';

import { DataTableColumnHeader } from '@/components/data-table';
import { CoDebtor } from '@/schemas/co-debtor';
import { formatDate } from '@/utils/formatters';
import type { ColumnDef } from '@tanstack/react-table';
import { CoDebtorRowActions } from './co-debtor-row-actions';

// ============================================================================
// Column Definitions
// ============================================================================
export const coDebtorColumns: ColumnDef<CoDebtor>[] = [
  {
    accessorKey: 'identificationTypeId',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo Doc." />,
    cell: ({ row }) => {
      return (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.identificationType?.name}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'documentNumber',
    header: ({ column }) => <DataTableColumnHeader column={column} title="No. Documento" />,
    cell: ({ row }) => {
      return (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.documentNumber}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'companyName',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Empresa" />,
    cell: ({ row }) => {
      return (
        <div className="flex flex-col">
          <span>{row.original.companyName}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'homePhone',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tel. Casa" />,
    cell: ({ row }) => {
      return (
        <div className="flex flex-col">
          <span>{row.original.homePhone}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'workPhone',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tel. Trabajo" />,
    cell: ({ row }) => {
      return (
        <div className="flex flex-col">
          <span>{row.original.workPhone}</span>
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

  // Actions Column
  {
    id: 'actions',
    cell: ({ table, row }) => <CoDebtorRowActions row={row} table={table} />,
  },
];
