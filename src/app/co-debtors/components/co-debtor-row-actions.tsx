'use client';

import { DataTableRowActions, type RowAction, type RowActionGroup } from '@/components/data-table';
import { CoDebtor } from '@/schemas/co-debtor';
import { useHasPermission } from '@/stores/auth-store-provider';
import { Row, Table } from '@tanstack/react-table';
import { Eye, Pencil, Trash } from 'lucide-react';

// ============================================================================
// Props Interface
// ============================================================================

interface CoDebtorRowActionsProps {
  row: Row<CoDebtor>;
  table: Table<CoDebtor>;
}

// ============================================================================
// Main Component
// ============================================================================

export function CoDebtorRowActions({ row, table }: CoDebtorRowActionsProps) {
  const coDebtor = row.original;
  const meta = table.options.meta;
  const canUpdate = useHasPermission('co-debtors:update');
  const canDelete = useHasPermission('co-debtors:delete');

  // ---- Build Actions ----

  const actions: (RowAction<CoDebtor> | RowActionGroup<CoDebtor>)[] = [
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

  return <DataTableRowActions row={coDebtor} actions={actions} />;
}
