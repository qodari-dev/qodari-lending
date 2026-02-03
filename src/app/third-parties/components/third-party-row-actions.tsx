'use client';

import { DataTableRowActions, type RowAction, type RowActionGroup } from '@/components/data-table';
import { ThirdParty } from '@/schemas/third-party';
import { useHasPermission } from '@/stores/auth-store-provider';
import { Row, Table } from '@tanstack/react-table';
import { Eye, Pencil, Trash } from 'lucide-react';

// ============================================================================
// Props Interface
// ============================================================================

interface ThirdPartyRowActionsProps {
  row: Row<ThirdParty>;
  table: Table<ThirdParty>;
}

// ============================================================================
// Main Component
// ============================================================================

export function ThirdPartyRowActions({ row, table }: ThirdPartyRowActionsProps) {
  const thirdParty = row.original;
  const meta = table.options.meta;
  const canUpdate = useHasPermission('third-parties:update');
  const canDelete = useHasPermission('third-parties:delete');

  // ---- Build Actions ----

  const actions: (RowAction<ThirdParty> | RowActionGroup<ThirdParty>)[] = [
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

  return <DataTableRowActions row={thirdParty} actions={actions} />;
}
