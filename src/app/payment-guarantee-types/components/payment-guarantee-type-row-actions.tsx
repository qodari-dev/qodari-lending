'use client';

import { DataTableRowActions, type RowAction, type RowActionGroup } from '@/components/data-table';
import { PaymentGuaranteeType } from '@/schemas/payment-guarantee-type';
import { useHasPermission } from '@/stores/auth-store-provider';
import { Row, Table } from '@tanstack/react-table';
import { Eye, Pencil, Trash } from 'lucide-react';

// ============================================================================
// Props Interface
// ============================================================================

interface PaymentGuaranteeTypeRowActionsProps {
  row: Row<PaymentGuaranteeType>;
  table: Table<PaymentGuaranteeType>;
}

// ============================================================================
// Main Component
// ============================================================================

export function PaymentGuaranteeTypeRowActions({ row, table }: PaymentGuaranteeTypeRowActionsProps) {
  const paymentGuaranteeType = row.original;
  const meta = table.options.meta;
  const canUpdate = useHasPermission('payment-guarantee-types:update');
  const canDelete = useHasPermission('payment-guarantee-types:delete');

  // ---- Build Actions ----

  const actions: (RowAction<PaymentGuaranteeType> | RowActionGroup<PaymentGuaranteeType>)[] = [
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

  return <DataTableRowActions row={paymentGuaranteeType} actions={actions} />;
}
