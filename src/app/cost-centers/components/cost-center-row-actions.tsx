'use client';

import { DataTableRowActions, type RowAction, type RowActionGroup } from '@/components/data-table';
import { CostCenter } from '@/schemas/cost-center';
import { useHasPermission } from '@/stores/auth-store-provider';
import { Row, Table } from '@tanstack/react-table';
import { Eye, Pencil, Trash } from 'lucide-react';

// ============================================================================
// Props Interface
// ============================================================================

interface CostCenterRowActionsProps {
  row: Row<CostCenter>;
  table: Table<CostCenter>;
}

// ============================================================================
// Main Component
// ============================================================================

export function CostCenterRowActions({ row, table }: CostCenterRowActionsProps) {
  const costCenter = row.original;
  const meta = table.options.meta;
  const canUpdate = useHasPermission('cost-centers:update');
  const canDelete = useHasPermission('cost-centers:delete');

  // ---- Build Actions ----

  const actions: (RowAction<CostCenter> | RowActionGroup<CostCenter>)[] = [
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

  return <DataTableRowActions row={costCenter} actions={actions} />;
}
