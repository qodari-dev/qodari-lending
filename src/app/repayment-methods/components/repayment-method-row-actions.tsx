'use client';

import { DataTableRowActions, type RowAction, type RowActionGroup } from '@/components/data-table';
import { RepaymentMethod } from '@/schemas/repayment-method';
import { useHasPermission } from '@/stores/auth-store-provider';
import { Row, Table } from '@tanstack/react-table';
import { Eye, Pencil, Trash } from 'lucide-react';

// ============================================================================
// Props Interface
// ============================================================================

interface RepaymentMethodRowActionsProps {
  row: Row<RepaymentMethod>;
  table: Table<RepaymentMethod>;
}

// ============================================================================
// Main Component
// ============================================================================

export function RepaymentMethodRowActions({ row, table }: RepaymentMethodRowActionsProps) {
  const repaymentMethod = row.original;
  const meta = table.options.meta;
  const canUpdate = useHasPermission('repayment-methods:update');
  const canDelete = useHasPermission('repayment-methods:delete');

  // ---- Build Actions ----

  const actions: (RowAction<RepaymentMethod> | RowActionGroup<RepaymentMethod>)[] = [
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

  return <DataTableRowActions row={repaymentMethod} actions={actions} />;
}
