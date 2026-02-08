'use client';

import { DataTableRowActions, type RowAction, type RowActionGroup } from '@/components/data-table';
import { Loan } from '@/schemas/loan';
import { Row, Table } from '@tanstack/react-table';
import { Eye } from 'lucide-react';

interface LoanRowActionsProps {
  row: Row<Loan>;
  table: Table<Loan>;
}

export function LoanRowActions({ row, table }: LoanRowActionsProps) {
  const loan = row.original;
  const meta = table.options.meta;

  const actions: (RowAction<Loan> | RowActionGroup<Loan>)[] = [
    {
      label: 'Ver detalles',
      icon: Eye,
      onClick: meta?.onRowView,
    },
  ];

  return <DataTableRowActions row={loan} actions={actions} />;
}
