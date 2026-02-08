'use client';

import { DataTableRowActions, type RowAction, type RowActionGroup } from '@/components/data-table';
import { LoanPayment } from '@/schemas/loan-payment';
import { useHasPermission } from '@/stores/auth-store-provider';
import { Row, Table } from '@tanstack/react-table';
import { Ban, Eye } from 'lucide-react';

interface LoanPaymentRowActionsProps {
  row: Row<LoanPayment>;
  table: Table<LoanPayment>;
}

export function LoanPaymentRowActions({ row, table }: LoanPaymentRowActionsProps) {
  const loanPayment = row.original;
  const meta = table.options.meta;
  const canVoid = useHasPermission('loan-payments:void');

  const actions: (RowAction<LoanPayment> | RowActionGroup<LoanPayment>)[] = [
    {
      label: 'Ver detalles',
      icon: Eye,
      onClick: meta?.onRowView,
    },
    {
      label: 'Anular',
      icon: Ban,
      onClick: meta?.onRowVoid,
      hidden: !canVoid || loanPayment.status === 'VOID',
      variant: 'destructive',
    },
  ];

  return <DataTableRowActions row={loanPayment} actions={actions} />;
}
