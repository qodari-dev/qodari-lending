'use client';

import { DataTableRowActions, type RowAction, type RowActionGroup } from '@/components/data-table';
import { LoanApprovalLevel } from '@/schemas/loan-approval-level';
import { useHasPermission } from '@/stores/auth-store-provider';
import { Row, Table } from '@tanstack/react-table';
import { Eye, Pencil, Trash2 } from 'lucide-react';

interface LoanApprovalLevelRowActionsProps {
  row: Row<LoanApprovalLevel>;
  table: Table<LoanApprovalLevel>;
}

export function LoanApprovalLevelRowActions({ row, table }: LoanApprovalLevelRowActionsProps) {
  const level = row.original;
  const meta = table.options.meta;
  const canUpdate = useHasPermission('loan-approval-levels:update');
  const canDelete = useHasPermission('loan-approval-levels:delete');

  const actions: (RowAction<LoanApprovalLevel> | RowActionGroup<LoanApprovalLevel>)[] = [
    {
      label: 'Ver detalles',
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
      icon: Trash2,
      onClick: meta?.onRowDelete,
      hidden: !canDelete,
      variant: 'destructive',
    },
  ];

  return <DataTableRowActions row={level} actions={actions} />;
}
