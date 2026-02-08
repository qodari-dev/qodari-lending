'use client';

import { DataTableColumnHeader } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Agreement } from '@/schemas/agreement';
import { formatDate } from '@/utils/formatters';
import type { ColumnDef } from '@tanstack/react-table';
import { CheckCircle, XCircle } from 'lucide-react';
import { AgreementRowActions } from './agreement-row-actions';

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

export const agreementColumns: ColumnDef<Agreement>[] = [
  {
    accessorKey: 'agreementCode',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Convenio" />,
    cell: ({ row }) => {
      return (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.agreementCode}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'documentNumber',
    header: ({ column }) => <DataTableColumnHeader column={column} title="NIT" />,
    cell: ({ row }) => <span className="font-mono">{row.original.documentNumber}</span>,
  },
  {
    accessorKey: 'businessName',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Empresa" />,
    cell: ({ row }) => (
      <div className="max-w-[280px] truncate" title={row.original.businessName}>
        {row.original.businessName}
      </div>
    ),
  },
  {
    accessorKey: 'cityId',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Ciudad" />,
    cell: ({ row }) => row.original.city?.name ?? '—',
  },
  {
    accessorKey: 'startDate',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Inicio" />,
    cell: ({ row }) => formatDate(row.original.startDate),
  },
  {
    accessorKey: 'endDate',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fin" />,
    cell: ({ row }) => (row.original.endDate ? formatDate(row.original.endDate) : 'Vigente'),
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
    id: 'actions',
    cell: ({ table, row }) => <AgreementRowActions row={row} table={table} />,
  },
];
