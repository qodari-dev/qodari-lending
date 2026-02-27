'use client';

import { DataTableColumnHeader } from '@/components/data-table';
import { LoanApplication } from '@/schemas/loan-application';
import { formatCurrency, formatDate } from '@/utils/formatters';
import type { ColumnDef } from '@tanstack/react-table';
import { LoanApplicationApprovalRowActions } from './loan-application-approval-row-actions';

function getApplicantLabel(application: LoanApplication): string {
  const person = application.thirdParty;
  if (!person) return String(application.thirdPartyId);

  if (person.personType === 'LEGAL') {
    return person.businessName ?? person.documentNumber;
  }

  const fullName = [person.firstName, person.secondName, person.firstLastName, person.secondLastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  return fullName || person.documentNumber;
}

export const LoanApplicationApprovalColumns: ColumnDef<LoanApplication>[] = [
  {
    accessorKey: 'creditNumber',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Solicitud" />,
    cell: ({ row }) => <span className="font-medium">{row.original.creditNumber}</span>,
  },
  {
    id: 'thirdParty',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Solicitante" />,
    cell: ({ row }) => <span>{getApplicantLabel(row.original)}</span>,
  },
  {
    id: 'creditProduct',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Linea de credito" />,
    cell: ({ row }) => (
      <span>{row.original.creditProduct?.name ?? row.original.creditProductId}</span>
    ),
  },
  {
    accessorKey: 'requestedAmount',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Valor solicitado" />,
    cell: ({ row }) => (
      <span className="font-mono text-xs">{formatCurrency(row.original.requestedAmount)}</span>
    ),
  },
  {
    id: 'currentApprovalLevel',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nivel actual" />,
    cell: ({ row }) => (
      <span>
        {row.original.currentApprovalLevel?.name ?? row.original.currentApprovalLevelId ?? '-'}
      </span>
    ),
  },
  {
    id: 'targetApprovalLevel',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nivel objetivo" />,
    cell: ({ row }) => (
      <span>{row.original.targetApprovalLevel?.name ?? row.original.targetApprovalLevelId ?? '-'}</span>
    ),
  },
  {
    id: 'assignedApprovalUserName',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Asignado" />,
    cell: ({ row }) => (
      <span>{row.original.assignedApprovalUserName ?? row.original.assignedApprovalUserId ?? '-'}</span>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Creada" />,
    cell: ({ row }) => <span>{formatDate(row.original.createdAt)}</span>,
  },
  {
    id: 'actions',
    cell: ({ table, row }) => <LoanApplicationApprovalRowActions row={row} table={table} />,
  },
];
