'use client';

import { DataTableColumnHeader } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import {
  documentContentFormatLabels,
  documentTemplateStatusLabels,
  DocumentTemplate,
} from '@/schemas/document-template';
import { formatDate } from '@/utils/formatters';
import type { ColumnDef } from '@tanstack/react-table';
import { CheckCircle, XCircle } from 'lucide-react';
import { DocumentTemplateRowActions } from './document-template-row-actions';

function StatusBadge({ status }: { status: DocumentTemplate['status'] }) {
  if (status === 'ACTIVE') {
    return (
      <Badge variant="default" className="gap-1 bg-amber-600 hover:bg-amber-700">
        <CheckCircle className="h-3 w-3" />
        {documentTemplateStatusLabels[status]}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-muted-foreground gap-1">
      <XCircle className="h-3 w-3" />
      {documentTemplateStatusLabels[status]}
    </Badge>
  );
}

export const documentTemplateColumns: ColumnDef<DocumentTemplate>[] = [
  {
    accessorKey: 'code',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Codigo" />,
    cell: ({ row }) => <span className="font-medium">{row.original.code}</span>,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
    cell: ({ row }) => row.original.name,
  },
  {
    accessorKey: 'version',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Version" />,
    cell: ({ row }) => row.original.version,
  },
  {
    accessorKey: 'contentFormat',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Formato" />,
    cell: ({ row }) => documentContentFormatLabels[row.original.contentFormat],
  },
  {
    id: 'signersCount',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Firmantes" />,
    cell: ({ row }) => <Badge variant="outline">{row.original.templateSignerRules?.length ?? 0}</Badge>,
  },
  {
    accessorKey: 'status',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'updatedAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Actualizado" />,
    cell: ({ row }) => formatDate(row.original.updatedAt),
  },
  {
    id: 'actions',
    cell: ({ table, row }) => <DocumentTemplateRowActions row={row} table={table} />,
  },
];
