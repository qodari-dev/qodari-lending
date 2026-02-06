'use client';

import { DataTableRowActions, type RowAction, type RowActionGroup } from '@/components/data-table';
import { AgingProfile } from '@/schemas/aging-profile';
import { useHasPermission } from '@/stores/auth-store-provider';
import { Row, Table } from '@tanstack/react-table';
import { Eye, Pencil, Trash } from 'lucide-react';

// ============================================================================
// Props Interface
// ============================================================================

interface AgingProfileRowActionsProps {
  row: Row<AgingProfile>;
  table: Table<AgingProfile>;
}

// ============================================================================
// Main Component
// ============================================================================

export function AgingProfileRowActions({ row, table }: AgingProfileRowActionsProps) {
  const agingProfile = row.original;
  const meta = table.options.meta;
  const canUpdate = useHasPermission('aging-profiles:update');
  const canDelete = useHasPermission('aging-profiles:delete');

  const actions: (RowAction<AgingProfile> | RowActionGroup<AgingProfile>)[] = [
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

  return <DataTableRowActions row={agingProfile} actions={actions} />;
}
