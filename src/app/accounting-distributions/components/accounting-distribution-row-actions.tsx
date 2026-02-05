'use client';

import { DataTableRowActions, type RowAction, type RowActionGroup } from '@/components/data-table';
import { AccountingDistribution } from '@/schemas/accounting-distribution';
import { useHasPermission } from '@/stores/auth-store-provider';
import { Row, Table } from '@tanstack/react-table';
import { Eye, Pencil, Trash } from 'lucide-react';

// ============================================================================
// Props Interface
// ============================================================================

interface AccountingDistributionRowActionsProps {
  row: Row<AccountingDistribution>;
  table: Table<AccountingDistribution>;
}

// ============================================================================
// Main Component
// ============================================================================

export function AccountingDistributionRowActions({
  row,
  table,
}: AccountingDistributionRowActionsProps) {
  const accountingDistribution = row.original;
  const meta = table.options.meta;
  const canUpdate = useHasPermission('accounting-distributions:update');
  const canDelete = useHasPermission('accounting-distributions:delete');

  const actions: (
    | RowAction<AccountingDistribution>
    | RowActionGroup<AccountingDistribution>
  )[] = [
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

  return <DataTableRowActions row={accountingDistribution} actions={actions} />;
}
