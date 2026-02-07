'use client';

import { DataTableRowActions, type RowAction, type RowActionGroup } from '@/components/data-table';
import { AffiliationOffice } from '@/schemas/affiliation-office';
import { useHasPermission } from '@/stores/auth-store-provider';
import { Row, Table } from '@tanstack/react-table';
import { Eye, Pencil, Trash } from 'lucide-react';

interface AffiliationOfficeRowActionsProps {
  row: Row<AffiliationOffice>;
  table: Table<AffiliationOffice>;
}

export function AffiliationOfficeRowActions({ row, table }: AffiliationOfficeRowActionsProps) {
  const affiliationOffice = row.original;
  const meta = table.options.meta;
  const canUpdate = useHasPermission('affiliation-offices:update');
  const canDelete = useHasPermission('affiliation-offices:delete');

  const actions: (RowAction<AffiliationOffice> | RowActionGroup<AffiliationOffice>)[] = [
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

  return <DataTableRowActions row={affiliationOffice} actions={actions} />;
}
