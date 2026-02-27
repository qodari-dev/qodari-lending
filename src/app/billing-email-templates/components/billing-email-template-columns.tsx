'use client';

import { DataTableColumnHeader } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { BillingEmailTemplate } from '@/schemas/billing-email-template';
import { formatDate } from '@/utils/formatters';
import type { ColumnDef } from '@tanstack/react-table';
import { CheckCircle, XCircle } from 'lucide-react';
import { BillingEmailTemplateRowActions } from './billing-email-template-row-actions';

function StatusBadge({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return (
      <Badge variant="default" className="gap-1 bg-amber-600 hover:bg-amber-700">
        <CheckCircle className="h-3 w-3" />
        Activa
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-muted-foreground gap-1">
      <XCircle className="h-3 w-3" />
      Inactiva
    </Badge>
  );
}

export const billingEmailTemplateColumns: ColumnDef<BillingEmailTemplate>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
    cell: ({ row }) => (
      <div className="max-w-[240px] truncate font-medium" title={row.original.name}>
        {row.original.name}
      </div>
    ),
  },
  {
    accessorKey: 'fromEmail',
    header: ({ column }) => <DataTableColumnHeader column={column} title="From" />,
    cell: ({ row }) => (
      <div className="max-w-[280px] truncate font-mono text-xs" title={row.original.fromEmail}>
        {row.original.fromEmail}
      </div>
    ),
  },
  {
    accessorKey: 'subject',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Asunto" />,
    cell: ({ row }) => (
      <div className="max-w-[340px] truncate" title={row.original.subject}>
        {row.original.subject}
      </div>
    ),
  },
  {
    accessorKey: 'isActive',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => <StatusBadge isActive={row.original.isActive} />,
    filterFn: (row, id, value: boolean) => row.getValue(id) === value,
  },
  {
    accessorKey: 'updatedAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Actualizado" />,
    cell: ({ row }) => formatDate(row.original.updatedAt),
  },
  {
    id: 'actions',
    cell: ({ table, row }) => <BillingEmailTemplateRowActions row={row} table={table} />,
  },
];
