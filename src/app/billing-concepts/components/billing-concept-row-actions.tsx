'use client';

import { DataTableRowActions, type RowAction, type RowActionGroup } from '@/components/data-table';
import { BillingConcept } from '@/schemas/billing-concept';
import { useHasPermission } from '@/stores/auth-store-provider';
import { Row, Table } from '@tanstack/react-table';
import { Eye, Pencil, Trash } from 'lucide-react';

interface BillingConceptRowActionsProps {
  row: Row<BillingConcept>;
  table: Table<BillingConcept>;
}

export function BillingConceptRowActions({ row, table }: BillingConceptRowActionsProps) {
  const billingConcept = row.original;
  const meta = table.options.meta;
  const canUpdate = useHasPermission('billing-concepts:update');
  const canDelete = useHasPermission('billing-concepts:delete');

  const actions: (RowAction<BillingConcept> | RowActionGroup<BillingConcept>)[] = [
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

  return <DataTableRowActions row={billingConcept} actions={actions} />;
}
