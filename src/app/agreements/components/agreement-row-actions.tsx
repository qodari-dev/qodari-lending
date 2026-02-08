'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Agreement } from '@/schemas/agreement';
import { useHasPermission } from '@/stores/auth-store-provider';
import { Row, Table } from '@tanstack/react-table';
import { Edit, Eye, MoreHorizontal, Trash } from 'lucide-react';

interface RowActionsProps {
  row: Row<Agreement>;
  table: Table<Agreement>;
}

export function AgreementRowActions({ row, table }: RowActionsProps) {
  const canUpdate = useHasPermission('agreements:update');
  const canDelete = useHasPermission('agreements:delete');

  const { onRowView, onRowEdit, onRowDelete } = table.options.meta ?? {};

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Abrir menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {onRowView && (
          <DropdownMenuItem onClick={() => onRowView(row.original)}>
            <Eye className="mr-2 h-4 w-4" />
            Ver detalles
          </DropdownMenuItem>
        )}
        {onRowEdit && canUpdate && (
          <DropdownMenuItem onClick={() => onRowEdit(row.original)}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </DropdownMenuItem>
        )}
        {onRowDelete && canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onRowDelete(row.original)}
              className="text-destructive focus:text-destructive"
            >
              <Trash className="mr-2 h-4 w-4" />
              Eliminar
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
