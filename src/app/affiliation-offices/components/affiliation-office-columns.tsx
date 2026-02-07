'use client';

import { DataTableColumnHeader } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { AffiliationOffice } from '@/schemas/affiliation-office';
import { formatDate } from '@/utils/formatters';
import type { ColumnDef } from '@tanstack/react-table';
import { CheckCircle, XCircle } from 'lucide-react';
import { AffiliationOfficeRowActions } from './affiliation-office-row-actions';

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

export const affiliationOfficeColumns: ColumnDef<AffiliationOffice>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    id: 'city',
    accessorKey: 'cityId',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Ciudad" />,
    cell: ({ row }) => <span>{row.original.city?.name ?? row.original.cityId}</span>,
  },
  {
    accessorKey: 'representativeName',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Representante" />,
    cell: ({ row }) => <span>{row.original.representativeName}</span>,
  },
  {
    id: 'costCenter',
    accessorKey: 'costCenterId',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Centro de costo" />,
    cell: ({ row }) => {
      const costCenter = row.original.costCenter;
      if (!costCenter) return <span>-</span>;
      return <span>{costCenter.code} - {costCenter.name}</span>;
    },
  },
  {
    id: 'usersCount',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Usuarios" />,
    cell: ({ row }) => <Badge variant="outline">{row.original.userAffiliationOffices?.length ?? 0}</Badge>,
  },
  {
    accessorKey: 'isActive',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => <StatusBadge isActive={row.getValue('isActive')} />,
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Creado" />,
    cell: ({ row }) => <span>{formatDate(row.original.createdAt)}</span>,
  },
  {
    id: 'actions',
    cell: ({ table, row }) => <AffiliationOfficeRowActions row={row} table={table} />,
  },
];
