'use client';

import { DataTableRowActions, type RowAction, type RowActionGroup } from '@/components/data-table';
import { Loan } from '@/schemas/loan';
import { useHasPermission } from '@/stores/auth-store-provider';
import { Row, Table } from '@tanstack/react-table';
import { CheckCircle2, Eye } from 'lucide-react';

interface LoanRowActionsProps {
  row: Row<Loan>;
  table: Table<Loan>;
}

export function LoanRowActions({ row, table }: LoanRowActionsProps) {
  const loan = row.original;
  const meta = table.options.meta;
  const canLiquidate = useHasPermission('loans:liquidate');

  const actions: (RowAction<Loan> | RowActionGroup<Loan>)[] = [
    {
      label: 'Ver detalles',
      icon: Eye,
      onClick: meta?.onRowView,
    },
    {
      label: 'Liquidar',
      icon: CheckCircle2,
      onClick: meta?.onRowLiquidate,
      hidden: !(canLiquidate && loan.status === 'GENERATED'),
    },
  ];

  return <DataTableRowActions row={loan} actions={actions} />;
}
