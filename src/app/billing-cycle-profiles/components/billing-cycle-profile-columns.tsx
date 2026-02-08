'use client';

import { DataTableColumnHeader } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import {
  BillingCycleProfile,
  weekendPolicyLabels,
  WeekendPolicy,
} from '@/schemas/billing-cycle-profile';
import { formatDate } from '@/utils/formatters';
import type { ColumnDef } from '@tanstack/react-table';
import { CheckCircle, XCircle } from 'lucide-react';
import { BillingCycleProfileRowActions } from './billing-cycle-profile-row-actions';

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

export const billingCycleProfileColumns: ColumnDef<BillingCycleProfile>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: 'creditProductId',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo credito" />,
    cell: ({ row }) => row.original.creditProduct?.name ?? '—',
  },
  {
    accessorKey: 'agreementId',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Convenio" />,
    cell: ({ row }) => row.original.agreement?.businessName ?? 'Default producto',
  },
  {
    accessorKey: 'cyclesPerMonth',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Ciclos/mes" />,
    cell: ({ row }) => <Badge variant="outline">{row.original.cyclesPerMonth}</Badge>,
  },
  {
    accessorKey: 'weekendPolicy',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Politica fin semana" />,
    cell: ({ row }) => weekendPolicyLabels[row.original.weekendPolicy as WeekendPolicy] ?? '—',
  },
  {
    id: 'cyclesCount',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Ciclos" />,
    cell: ({ row }) => <Badge variant="outline">{row.original.billingCycleProfileCycles?.length ?? 0}</Badge>,
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
    cell: ({ table, row }) => <BillingCycleProfileRowActions row={row} table={table} />,
  },
];
