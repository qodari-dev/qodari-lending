'use client';

import { DataTableRowActions, type RowAction, type RowActionGroup } from '@/components/data-table';
import { DocumentTemplate } from '@/schemas/document-template';
import { useHasPermission } from '@/stores/auth-store-provider';
import { Row, Table } from '@tanstack/react-table';
import { Eye, Pencil, Trash } from 'lucide-react';

interface DocumentTemplateRowActionsProps {
  row: Row<DocumentTemplate>;
  table: Table<DocumentTemplate>;
}

export function DocumentTemplateRowActions({ row, table }: DocumentTemplateRowActionsProps) {
  const documentTemplate = row.original;
  const meta = table.options.meta;
  const canUpdate = useHasPermission('document-templates:update');
  const canDelete = useHasPermission('document-templates:delete');

  const actions: (RowAction<DocumentTemplate> | RowActionGroup<DocumentTemplate>)[] = [
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

  return <DataTableRowActions row={documentTemplate} actions={actions} />;
}
