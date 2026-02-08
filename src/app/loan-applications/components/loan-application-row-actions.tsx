'use client';

import { DataTableRowActions, type RowAction, type RowActionGroup } from '@/components/data-table';
import { LoanApplication } from '@/schemas/loan-application';
import { useHasPermission } from '@/stores/auth-store-provider';
import { Row, Table } from '@tanstack/react-table';
import { Ban, CheckCircle2, Eye, OctagonX, Pencil } from 'lucide-react';

interface LoanApplicationRowActionsProps {
  row: Row<LoanApplication>;
  table: Table<LoanApplication>;
}

export function LoanApplicationRowActions({ row, table }: LoanApplicationRowActionsProps) {
  const application = row.original;
  const meta = table.options.meta;
  const canUpdate = useHasPermission('loan-applications:update');
  const canApprove = useHasPermission('loan-applications:approve');
  const canCancel = useHasPermission('loan-applications:cancel');
  const canReject = useHasPermission('loan-applications:reject');
  const isPending = application.status === 'PENDING';

  const actions: (RowAction<LoanApplication> | RowActionGroup<LoanApplication>)[] = [
    {
      label: 'Ver detalles',
      icon: Eye,
      onClick: meta?.onRowView,
    },
    {
      label: 'Editar',
      icon: Pencil,
      onClick: meta?.onRowEdit,
      hidden: !(canUpdate && isPending),
    },
    {
      label: 'Aprobar',
      icon: CheckCircle2,
      onClick: meta?.onRowApprove,
      hidden: !(canApprove && isPending),
    },
    {
      label: 'Cancelar',
      icon: Ban,
      onClick: meta?.onRowCancel,
      hidden: !(canCancel && isPending),
    },
    {
      label: 'Rechazar',
      icon: OctagonX,
      onClick: meta?.onRowReject,
      hidden: !(canReject && isPending),
      variant: 'destructive',
    },
  ];

  return <DataTableRowActions row={application} actions={actions} />;
}
