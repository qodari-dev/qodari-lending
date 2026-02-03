'use client';

import { DataTableRowActions, type RowAction, type RowActionGroup } from '@/components/data-table';
import { ThirdPartyType } from '@/schemas/third-party-type';
import { useHasPermission } from '@/stores/auth-store-provider';
import { Row, Table } from '@tanstack/react-table';
import { Eye, Pencil, Trash } from 'lucide-react';

// ============================================================================
// Props Interface
// ============================================================================

interface ThirdPartyTypeRowActionsProps {
  row: Row<ThirdPartyType>;
  table: Table<ThirdPartyType>;
}

// ============================================================================
// Main Component
// ============================================================================

export function ThirdPartyTypeRowActions({ row, table }: ThirdPartyTypeRowActionsProps) {
  const thirdPartyType = row.original;
  const meta = table.options.meta;
  const canUpdate = useHasPermission('third-party-types:update');
  const canDelete = useHasPermission('third-party-types:delete');

  // ---- Build Actions ----

  const actions: (RowAction<ThirdPartyType> | RowActionGroup<ThirdPartyType>)[] = [
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

  return <DataTableRowActions row={thirdPartyType} actions={actions} />;
}
