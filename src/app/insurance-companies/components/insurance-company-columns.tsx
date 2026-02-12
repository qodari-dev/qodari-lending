'use client';

import { DataTableColumnHeader } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { InsuranceCompany } from '@/schemas/insurance-company';
import { formatDate } from '@/utils/formatters';
import type { ColumnDef } from '@tanstack/react-table';
import { CheckCircle, XCircle } from 'lucide-react';
import { InsuranceCompanyRowActions } from './insurance-company-row-actions';

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

// ============================================================================
// Column Definitions
// ============================================================================
export const insuranceCompanyColumns: ColumnDef<InsuranceCompany>[] = [
  {
    accessorKey: 'businessName',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Razón Social" />,
    cell: ({ row }) => {
      return (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.businessName}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'documentNumber',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Documento" />,
    cell: ({ row }) => {
      const digit = row.original.verificationDigit;
      return (
        <span>
          {row.original.documentNumber}
          {digit ? `-${digit}` : ''}
        </span>
      );
    },
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
    cell: ({ table, row }) => <InsuranceCompanyRowActions row={row} table={table} />,
  },
];
