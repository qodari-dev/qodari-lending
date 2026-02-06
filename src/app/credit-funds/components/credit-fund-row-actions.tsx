'use client';

import { DataTableRowActions, type RowAction, type RowActionGroup } from '@/components/data-table';
import { CreditFund } from '@/schemas/credit-fund';
import { useHasPermission } from '@/stores/auth-store-provider';
import { Row, Table } from '@tanstack/react-table';
import { Eye, Pencil, Trash } from 'lucide-react';

// ============================================================================
// Props Interface
// ============================================================================

interface CreditFundRowActionsProps {
  row: Row<CreditFund>;
  table: Table<CreditFund>;
}

// ============================================================================
// Main Component
// ============================================================================

export function CreditFundRowActions({ row, table }: CreditFundRowActionsProps) {
  const creditFund = row.original;
  const meta = table.options.meta;
  const canUpdate = useHasPermission('credit-funds:update');
  const canDelete = useHasPermission('credit-funds:delete');

  const actions: (RowAction<CreditFund> | RowActionGroup<CreditFund>)[] = [
    {
      label: 'Ver Detalles',
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

  return <DataTableRowActions row={creditFund} actions={actions} />;
}
