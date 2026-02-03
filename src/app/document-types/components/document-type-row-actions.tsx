'use client';

import { DataTableRowActions, type RowAction, type RowActionGroup } from '@/components/data-table';
import { DocumentType } from '@/schemas/document-type';
import { useHasPermission } from '@/stores/auth-store-provider';
import { Row, Table } from '@tanstack/react-table';
import { Eye, Pencil, Trash } from 'lucide-react';

// ============================================================================
// Props Interface
// ============================================================================

interface DocumentTypeRowActionsProps {
  row: Row<DocumentType>;
  table: Table<DocumentType>;
}

// ============================================================================
// Main Component
// ============================================================================

export function DocumentTypeRowActions({ row, table }: DocumentTypeRowActionsProps) {
  const documentType = row.original;
  const meta = table.options.meta;
  const canUpdate = useHasPermission('document-types:update');
  const canDelete = useHasPermission('document-types:delete');

  // ---- Build Actions ----

  const actions: (RowAction<DocumentType> | RowActionGroup<DocumentType>)[] = [
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

  return <DataTableRowActions row={documentType} actions={actions} />;
}
