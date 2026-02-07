'use client';

import { DataTableRowActions, type RowAction, type RowActionGroup } from '@/components/data-table';
import { CreditProduct } from '@/schemas/credit-product';
import { useHasPermission } from '@/stores/auth-store-provider';
import { Row, Table } from '@tanstack/react-table';
import { Eye, Pencil, Trash } from 'lucide-react';

interface CreditProductRowActionsProps {
  row: Row<CreditProduct>;
  table: Table<CreditProduct>;
}

export function CreditProductRowActions({ row, table }: CreditProductRowActionsProps) {
  const creditProduct = row.original;
  const meta = table.options.meta;
  const canUpdate = useHasPermission('credit-products:update');
  const canDelete = useHasPermission('credit-products:delete');

  const actions: (RowAction<CreditProduct> | RowActionGroup<CreditProduct>)[] = [
    {
      label: 'Ver detalles',
      icon: Eye,
      onClick: meta?.onRowView,
    },
    {
      label: 'Editar',
      icon: Pencil,
      onClick: meta?.onRowEdit,
      hidden: !canUpdate,
    },
    {
      label: 'Eliminar',
      icon: Trash,
      onClick: meta?.onRowDelete,
      variant: 'destructive',
      hidden: !canDelete,
    },
  ];

  return <DataTableRowActions row={creditProduct} actions={actions} />;
}
