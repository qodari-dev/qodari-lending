'use client';

import { DataTableRowActions, type RowAction, type RowActionGroup } from '@/components/data-table';
import { City } from '@/schemas/city';
import { useHasPermission } from '@/stores/auth-store-provider';
import { Row, Table } from '@tanstack/react-table';
import { Eye, Pencil, Trash } from 'lucide-react';

// ============================================================================
// Props Interface
// ============================================================================

interface CityRowActionsProps {
  row: Row<City>;
  table: Table<City>;
}

// ============================================================================
// Main Component
// ============================================================================

export function CityRowActions({ row, table }: CityRowActionsProps) {
  const city = row.original;
  const meta = table.options.meta;
  const canUpdate = useHasPermission('cities:update');
  const canDelete = useHasPermission('cities:delete');

  // ---- Build Actions ----

  const actions: (RowAction<City> | RowActionGroup<City>)[] = [
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

  return <DataTableRowActions row={city} actions={actions} />;
}
