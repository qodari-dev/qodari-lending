'use client';

import { DataTableRowActions, type RowAction, type RowActionGroup } from '@/components/data-table';
import { AccountingPeriod } from '@/schemas/accounting-period';
import { useHasPermission } from '@/stores/auth-store-provider';
import { Row, Table } from '@tanstack/react-table';
import { Eye, Pencil, Trash } from 'lucide-react';

// ============================================================================
// Props Interface
// ============================================================================

interface AccountingPeriodRowActionsProps {
  row: Row<AccountingPeriod>;
  table: Table<AccountingPeriod>;
}

// ============================================================================
// Main Component
// ============================================================================

export function AccountingPeriodRowActions({ row, table }: AccountingPeriodRowActionsProps) {
  const accountingPeriod = row.original;
  const meta = table.options.meta;
  const canUpdate = useHasPermission('accounting-periods:update');
  const canDelete = useHasPermission('accounting-periods:delete');

  // Si está cerrado, no se puede editar ni eliminar
  const isClosed = accountingPeriod.isClosed;

  // ---- Build Actions ----

  const actions: (RowAction<AccountingPeriod> | RowActionGroup<AccountingPeriod>)[] = [
    {
      label: 'Ver Detalles',
      icon: Eye,
      onClick: meta?.onRowView,
    },
    {
      label: 'Editar',
      icon: Pencil,
      onClick: meta?.onRowEdit,
      hidden: !canUpdate || isClosed,
    },
    {
      label: 'Eliminar',
      icon: Trash,
      onClick: meta?.onRowDelete,
      variant: 'destructive',
      hidden: !canDelete || isClosed,
    },
  ];

  return <DataTableRowActions row={accountingPeriod} actions={actions} />;
}
