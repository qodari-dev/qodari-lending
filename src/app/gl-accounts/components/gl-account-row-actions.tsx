'use client';

import { DataTableRowActions, type RowAction, type RowActionGroup } from '@/components/data-table';
import { GlAccount } from '@/schemas/gl-account';
import { useHasPermission } from '@/stores/auth-store-provider';
import { Row, Table } from '@tanstack/react-table';
import { Eye, Pencil, Trash } from 'lucide-react';

// ============================================================================
// Props Interface
// ============================================================================

interface GlAccountRowActionsProps {
  row: Row<GlAccount>;
  table: Table<GlAccount>;
}

// ============================================================================
// Main Component
// ============================================================================

export function GlAccountRowActions({ row, table }: GlAccountRowActionsProps) {
  const glAccount = row.original;
  const meta = table.options.meta;
  const canUpdate = useHasPermission('gl-accounts:update');
  const canDelete = useHasPermission('gl-accounts:delete');

  // ---- Build Actions ----

  const actions: (RowAction<GlAccount> | RowActionGroup<GlAccount>)[] = [
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

  return <DataTableRowActions row={glAccount} actions={actions} />;
}
