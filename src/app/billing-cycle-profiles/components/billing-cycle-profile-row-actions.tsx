'use client';

import { DataTableRowActions, type RowAction, type RowActionGroup } from '@/components/data-table';
import { BillingCycleProfile } from '@/schemas/billing-cycle-profile';
import { useHasPermission } from '@/stores/auth-store-provider';
import { Row, Table } from '@tanstack/react-table';
import { Eye, Pencil, Trash } from 'lucide-react';

interface BillingCycleProfileRowActionsProps {
  row: Row<BillingCycleProfile>;
  table: Table<BillingCycleProfile>;
}

export function BillingCycleProfileRowActions({ row, table }: BillingCycleProfileRowActionsProps) {
  const billingCycleProfile = row.original;
  const meta = table.options.meta;
  const canUpdate = useHasPermission('billing-cycle-profiles:update');
  const canDelete = useHasPermission('billing-cycle-profiles:delete');

  const actions: (RowAction<BillingCycleProfile> | RowActionGroup<BillingCycleProfile>)[] = [
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

  return <DataTableRowActions row={billingCycleProfile} actions={actions} />;
}
