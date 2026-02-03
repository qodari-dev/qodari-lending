'use client';

import { DataTableRowActions, type RowAction, type RowActionGroup } from '@/components/data-table';
import { PaymentFrequency } from '@/schemas/payment-frequency';
import { useHasPermission } from '@/stores/auth-store-provider';
import { Row, Table } from '@tanstack/react-table';
import { Eye, Pencil, Trash } from 'lucide-react';

// ============================================================================
// Props Interface
// ============================================================================

interface PaymentFrequencyRowActionsProps {
  row: Row<PaymentFrequency>;
  table: Table<PaymentFrequency>;
}

// ============================================================================
// Main Component
// ============================================================================

export function PaymentFrequencyRowActions({ row, table }: PaymentFrequencyRowActionsProps) {
  const paymentFrequency = row.original;
  const meta = table.options.meta;
  const canUpdate = useHasPermission('payment-frequencies:update');
  const canDelete = useHasPermission('payment-frequencies:delete');

  // ---- Build Actions ----

  const actions: (RowAction<PaymentFrequency> | RowActionGroup<PaymentFrequency>)[] = [
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

  return <DataTableRowActions row={paymentFrequency} actions={actions} />;
}
