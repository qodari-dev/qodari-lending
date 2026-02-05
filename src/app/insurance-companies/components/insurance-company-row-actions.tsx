'use client';

import { DataTableRowActions, type RowAction, type RowActionGroup } from '@/components/data-table';
import { InsuranceCompany } from '@/schemas/insurance-company';
import { useHasPermission } from '@/stores/auth-store-provider';
import { Row, Table } from '@tanstack/react-table';
import { Eye, Pencil, Trash } from 'lucide-react';

// ============================================================================
// Props Interface
// ============================================================================

interface InsuranceCompanyRowActionsProps {
  row: Row<InsuranceCompany>;
  table: Table<InsuranceCompany>;
}

// ============================================================================
// Main Component
// ============================================================================

export function InsuranceCompanyRowActions({ row, table }: InsuranceCompanyRowActionsProps) {
  const company = row.original;
  const meta = table.options.meta;
  const canUpdate = useHasPermission('insurance-companies:update');
  const canDelete = useHasPermission('insurance-companies:delete');

  // ---- Build Actions ----

  const actions: (RowAction<InsuranceCompany> | RowActionGroup<InsuranceCompany>)[] = [
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

  return <DataTableRowActions row={company} actions={actions} />;
}
