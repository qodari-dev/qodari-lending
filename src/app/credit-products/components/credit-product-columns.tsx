'use client';

import { DataTableColumnHeader } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import {
  CreditProduct,
  financingTypeLabels,
  FinancingType,
} from '@/schemas/credit-product';
import { formatDate } from '@/utils/formatters';
import type { ColumnDef } from '@tanstack/react-table';
import { CheckCircle, XCircle } from 'lucide-react';
import { CreditProductRowActions } from './credit-product-row-actions';

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
  return <Badge variant={value ? 'default' : 'outline'}>{value ? 'Si' : 'No'}</Badge>;
}

export const creditProductColumns: ColumnDef<CreditProduct>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: 'creditFundId',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fondo" />,
    cell: ({ row }) => <span>{row.original.creditFund?.name ?? row.original.creditFundId}</span>,
  },
  {
    accessorKey: 'financingType',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Financiacion" />,
    cell: ({ row }) => {
      const value = row.original.financingType as FinancingType;
      return <Badge variant="outline">{financingTypeLabels[value] ?? value}</Badge>;
    },
  },
  {
    accessorKey: 'paysInsurance',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Paga seguro" />,
    cell: ({ row }) => <BooleanBadge value={row.getValue('paysInsurance')} />,
  },
  {
    accessorKey: 'reportsToCreditBureau',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Reporta" />,
    cell: ({ row }) => <BooleanBadge value={row.getValue('reportsToCreditBureau')} />,
  },
  {
    id: 'categoriesCount',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Categorias" />,
    cell: ({ row }) => <Badge variant="outline">{row.original.creditProductCategories?.length ?? 0}</Badge>,
  },
  {
    id: 'requiredDocumentsCount',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Docs" />,
    cell: ({ row }) => {
      const documents = (row.original as CreditProduct & { creditProductDocuments?: unknown[] })
        .creditProductDocuments;
      return <Badge variant="outline">{documents?.length ?? 0}</Badge>;
    },
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
    cell: ({ table, row }) => <CreditProductRowActions row={row} table={table} />,
  },
];
