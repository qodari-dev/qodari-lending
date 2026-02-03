'use client';

import { DataTableColumnHeader } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { ThirdParty, personTypeLabels } from '@/schemas/third-party';
import { formatDate } from '@/utils/formatters';
import type { ColumnDef } from '@tanstack/react-table';
import { ThirdPartyRowActions } from './third-party-row-actions';

// ============================================================================
// Column Definitions
// ============================================================================
export const thirdPartyColumns: ColumnDef<ThirdParty>[] = [
  {
    accessorKey: 'documentType',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo Doc." />,
    cell: ({ row }) => {
      return (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.documentType}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'documentNumber',
    header: ({ column }) => <DataTableColumnHeader column={column} title="No. Documento" />,
    cell: ({ row }) => {
      return (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.documentNumber}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'personType',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo Persona" />,
    cell: ({ row }) => {
      const personType = row.original.personType;
      return (
        <Badge variant={personType === 'NATURAL' ? 'default' : 'secondary'}>
          {personTypeLabels[personType]}
        </Badge>
      );
    },
  },
  {
    id: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
    cell: ({ row }) => {
      const { personType, firstName, firstLastName, businessName } = row.original;
      const displayName = personType === 'NATURAL'
        ? `${firstName ?? ''} ${firstLastName ?? ''}`.trim()
        : businessName ?? '';
      return (
        <div className="flex flex-col">
          <span>{displayName || '-'}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'phone',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Telefono" />,
    cell: ({ row }) => {
      return (
        <div className="flex flex-col">
          <span>{row.original.phone}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'thirdPartyType',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo Tercero" />,
    cell: ({ row }) => {
      return (
        <div className="flex flex-col">
          <span>{row.original.thirdPartyType?.name ?? '-'}</span>
        </div>
      );
    },
  },
  // Created At Column
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Creado" />,
    cell: ({ row }) => {
      return (
        <div className="flex flex-col">
          <span>{formatDate(row.original.createdAt)}</span>
        </div>
      );
    },
  },

  // Actions Column
  {
    id: 'actions',
    cell: ({ table, row }) => <ThirdPartyRowActions row={row} table={table} />,
  },
];
