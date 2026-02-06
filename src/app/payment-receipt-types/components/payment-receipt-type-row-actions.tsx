'use client';

import { DataTableRowActions, type RowAction, type RowActionGroup } from '@/components/data-table';
import { PaymentReceiptType } from '@/schemas/payment-receipt-type';
import { useHasPermission } from '@/stores/auth-store-provider';
import { Row, Table } from '@tanstack/react-table';
import { Eye, Pencil, Trash } from 'lucide-react';

interface PaymentReceiptTypeRowActionsProps {
  row: Row<PaymentReceiptType>;
  table: Table<PaymentReceiptType>;
}

export function PaymentReceiptTypeRowActions({ row, table }: PaymentReceiptTypeRowActionsProps) {
  const paymentReceiptType = row.original;
  const meta = table.options.meta;
  const canUpdate = useHasPermission('payment-receipt-types:update');
  const canDelete = useHasPermission('payment-receipt-types:delete');

  const actions: (RowAction<PaymentReceiptType> | RowActionGroup<PaymentReceiptType>)[] = [
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

  return <DataTableRowActions row={paymentReceiptType} actions={actions} />;
}
