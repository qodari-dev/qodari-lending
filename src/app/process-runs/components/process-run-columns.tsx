'use client';

import { DataTableColumnHeader } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { ProcessRun } from '@/schemas/process-run';
import { formatDate, formatDateTime } from '@/utils/formatters';
import type { ColumnDef } from '@tanstack/react-table';
import { ProcessRunRowActions } from './process-run-row-actions';

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === 'COMPLETED'
      ? 'default'
      : status === 'FAILED'
        ? 'destructive'
        : status === 'RUNNING'
          ? 'secondary'
          : 'outline';
  return <Badge variant={variant}>{status}</Badge>;
}

export const processRunColumns: ColumnDef<ProcessRun>[] = [
  {
    accessorKey: 'id',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Run" />,
    cell: ({ row }) => <span className="font-medium">#{row.original.id}</span>,
  },
  {
    accessorKey: 'processType',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
    cell: ({ row }) => row.original.processType,
  },
  {
    accessorKey: 'scopeType',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Alcance" />,
    cell: ({ row }) => `${row.original.scopeType} (${row.original.scopeId})`,
  },
  {
    accessorKey: 'processDate',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha proceso" />,
    cell: ({ row }) => formatDate(row.original.processDate),
  },
  {
    accessorKey: 'transactionDate',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha movimiento" />,
    cell: ({ row }) => formatDate(row.original.transactionDate),
  },
  {
    accessorKey: 'status',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'executedByUserName',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Ejecutado por" />,
    cell: ({ row }) => row.original.executedByUserName,
  },
  {
    accessorKey: 'executedAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Ejecucion" />,
    cell: ({ row }) => formatDateTime(row.original.executedAt),
  },
  {
    id: 'actions',
    cell: ({ table, row }) => <ProcessRunRowActions row={row} table={table} />,
  },
];
