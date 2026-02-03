'use client';

import { DataTableRowActions, type RowAction, type RowActionGroup } from '@/components/data-table';
import { IdentificationType } from '@/schemas/identification-type';
import { useHasPermission } from '@/stores/auth-store-provider';
import { Row, Table } from '@tanstack/react-table';
import { Eye, Pencil, Trash } from 'lucide-react';

// ============================================================================
// Props Interface
// ============================================================================

interface IdentificationTypeRowActionsProps {
  row: Row<IdentificationType>;
  table: Table<IdentificationType>;
}

// ============================================================================
// Main Component
// ============================================================================

export function IdentificationTypeRowActions({ row, table }: IdentificationTypeRowActionsProps) {
  const identificationType = row.original;
  const meta = table.options.meta;
  const canUpdate = useHasPermission('identification-types:update');
  const canDelete = useHasPermission('identification-types:delete');

  // ---- Build Actions ----

  const actions: (RowAction<IdentificationType> | RowActionGroup<IdentificationType>)[] = [
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

  return <DataTableRowActions row={identificationType} actions={actions} />;
}
