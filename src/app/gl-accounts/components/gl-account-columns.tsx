'use client';

import { DataTableColumnHeader } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import {
  GlAccount,
  thirdPartySettingLabels,
  accountDetailTypeLabels,
  ThirdPartySetting,
  AccountDetailType,
} from '@/schemas/gl-account';
import { formatDate } from '@/utils/formatters';
import type { ColumnDef } from '@tanstack/react-table';
import { CheckCircle, XCircle } from 'lucide-react';
import { GlAccountRowActions } from './gl-account-row-actions';

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

function BooleanBadge({ value }: { value: boolean }) {
  if (value) {
    return (
      <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
        Si
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-muted-foreground gap-1">
      No
    </Badge>
  );
}

// ============================================================================
// Column Definitions
// ============================================================================
export const glAccountColumns: ColumnDef<GlAccount>[] = [
  {
    accessorKey: 'code',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Codigo" />,
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
  {
    accessorKey: 'thirdPartySetting',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tercero" />,
    cell: ({ row }) => {
      const value = row.original.thirdPartySetting as ThirdPartySetting;
      return (
        <Badge variant="outline">
          {thirdPartySettingLabels[value] || value}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'detailType',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo Detalle" />,
    cell: ({ row }) => {
      const value = row.original.detailType as AccountDetailType;
      return (
        <Badge variant="outline">
          {accountDetailTypeLabels[value] || value}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'requiresCostCenter',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Centro Costo" />,
    cell: ({ row }) => <BooleanBadge value={row.getValue('requiresCostCenter')} />,
  },
  {
    accessorKey: 'isBank',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Es Banco" />,
    cell: ({ row }) => <BooleanBadge value={row.getValue('isBank')} />,
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

  // Actions Column
  {
    id: 'actions',
    cell: ({ table, row }) => <GlAccountRowActions row={row} table={table} />,
  },
];
