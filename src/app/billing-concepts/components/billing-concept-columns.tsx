'use client';

import { DataTableColumnHeader } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import {
  BillingConcept,
  BillingConceptType,
  billingConceptTypeLabels,
  billingConceptFrequencyLabels,
  BillingConceptFrequency,
} from '@/schemas/billing-concept';
import { formatDate } from '@/utils/formatters';
import type { ColumnDef } from '@tanstack/react-table';
import { CheckCircle, XCircle } from 'lucide-react';
import { BillingConceptRowActions } from './billing-concept-row-actions';

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

export const billingConceptColumns: ColumnDef<BillingConcept>[] = [
  {
    accessorKey: 'code',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Codigo" />,
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.code}</span>,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: 'conceptType',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
    cell: ({ row }) =>
      billingConceptTypeLabels[row.original.conceptType as BillingConceptType] ??
      row.original.conceptType,
  },
  {
    accessorKey: 'defaultFrequency',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Frecuencia" />,
    cell: ({ row }) =>
      billingConceptFrequencyLabels[row.original.defaultFrequency as BillingConceptFrequency] ??
      row.original.defaultFrequency,
  },
  {
    accessorKey: 'isSystem',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Sistema" />,
    cell: ({ row }) => (
      <Badge variant={row.original.isSystem ? 'secondary' : 'outline'}>
        {row.original.isSystem ? 'Si' : 'No'}
      </Badge>
    ),
    filterFn: (row, id, value: boolean) => row.getValue(id) === value,
  },
  {
    id: 'rulesCount',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Reglas" />,
    cell: ({ row }) => <Badge variant="outline">{row.original.billingConceptRules?.length ?? 0}</Badge>,
  },
  {
    accessorKey: 'isActive',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => <StatusBadge isActive={row.getValue('isActive')} />,
    filterFn: (row, id, value: boolean) => row.getValue(id) === value,
  },
  {
    accessorKey: 'updatedAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Actualizado" />,
    cell: ({ row }) => formatDate(row.original.updatedAt),
  },
  {
    id: 'actions',
    cell: ({ table, row }) => <BillingConceptRowActions row={row} table={table} />,
  },
];
