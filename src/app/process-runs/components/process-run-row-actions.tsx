'use client';

import { DataTableRowActions, type RowAction, type RowActionGroup } from '@/components/data-table';
import { ProcessRun } from '@/schemas/process-run';
import { Row, Table } from '@tanstack/react-table';
import { Eye } from 'lucide-react';

interface ProcessRunRowActionsProps {
  row: Row<ProcessRun>;
  table: Table<ProcessRun>;
}

export function ProcessRunRowActions({ row, table }: ProcessRunRowActionsProps) {
  const processRun = row.original;
  const meta = table.options.meta;

  const actions: (RowAction<ProcessRun> | RowActionGroup<ProcessRun>)[] = [
    {
      label: 'Ver detalles',
      icon: Eye,
      onClick: meta?.onRowView,
    },
  ];

  return <DataTableRowActions row={processRun} actions={actions} />;
}
