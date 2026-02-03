'use client';

import { DataTableRowActions, type RowAction, type RowActionGroup } from '@/components/data-table';
import { RejectionReason } from '@/schemas/rejection-reason';
import { useHasPermission } from '@/stores/auth-store-provider';
import { Row, Table } from '@tanstack/react-table';
import { Eye, Pencil, Trash } from 'lucide-react';

// ============================================================================
// Props Interface
// ============================================================================

interface RejectionReasonRowActionsProps {
  row: Row<RejectionReason>;
  table: Table<RejectionReason>;
}

// ============================================================================
// Main Component
// ============================================================================

export function RejectionReasonRowActions({ row, table }: RejectionReasonRowActionsProps) {
  const rejectionReason = row.original;
  const meta = table.options.meta;
  const canUpdate = useHasPermission('rejection-reasons:update');
  const canDelete = useHasPermission('rejection-reasons:delete');

  // ---- Build Actions ----

  const actions: (RowAction<RejectionReason> | RowActionGroup<RejectionReason>)[] = [
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

  return <DataTableRowActions row={rejectionReason} actions={actions} />;
}
