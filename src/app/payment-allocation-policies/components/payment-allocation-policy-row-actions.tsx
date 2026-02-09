'use client';

import { DataTableRowActions, type RowAction, type RowActionGroup } from '@/components/data-table';
import { PaymentAllocationPolicy } from '@/schemas/payment-allocation-policy';
import { useHasPermission } from '@/stores/auth-store-provider';
import { Row, Table } from '@tanstack/react-table';
import { Eye, Pencil, Trash } from 'lucide-react';

interface PaymentAllocationPolicyRowActionsProps {
  row: Row<PaymentAllocationPolicy>;
  table: Table<PaymentAllocationPolicy>;
}

export function PaymentAllocationPolicyRowActions({
  row,
  table,
}: PaymentAllocationPolicyRowActionsProps) {
  const paymentAllocationPolicy = row.original;
  const meta = table.options.meta;
  const canUpdate = useHasPermission('payment-allocation-policies:update');
  const canDelete = useHasPermission('payment-allocation-policies:delete');

  const actions: (
    | RowAction<PaymentAllocationPolicy>
    | RowActionGroup<PaymentAllocationPolicy>
  )[] = [
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
      icon: Trash,
      onClick: meta?.onRowDelete,
      variant: 'destructive',
      hidden: !canDelete,
    },
  ];

  return <DataTableRowActions row={paymentAllocationPolicy} actions={actions} />;
}
