'use client';

import { DataTableColumnHeader } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import {
  LoanApplication,
  loanApplicationStatusLabels,
  LoanApplicationStatus,
} from '@/schemas/loan-application';
import { formatCurrency, formatDate } from '@/utils/formatters';
import type { ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { LoanApplicationRowActions } from './loan-application-row-actions';

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

function StatusBadge({ status }: { status: LoanApplicationStatus }) {
  if (status === 'PENDING') {
    return (
      <Badge variant="outline" className="gap-1">
        <Clock className="h-3 w-3" />
        {loanApplicationStatusLabels[status]}
      </Badge>
    );
  }

  if (status === 'APPROVED') {
    return (
      <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
        <CheckCircle className="h-3 w-3" />
        {loanApplicationStatusLabels[status]}
      </Badge>
    );
  }

  if (status === 'REJECTED') {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        {loanApplicationStatusLabels[status]}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-muted-foreground gap-1">
      <XCircle className="h-3 w-3" />
      {loanApplicationStatusLabels[status]}
    </Badge>
  );
}

export const loanApplicationColumns: ColumnDef<LoanApplication>[] = [
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
    accessorKey: 'installments',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Cuotas" />,
    cell: ({ row }) => <span>{row.original.installments}</span>,
  },
  {
    accessorKey: 'status',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'applicationDate',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha solicitud" />,
    cell: ({ row }) => <span>{formatDate(row.original.applicationDate)}</span>,
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Creado" />,
    cell: ({ row }) => <span>{formatDate(row.original.createdAt)}</span>,
  },
  {
    id: 'actions',
    cell: ({ table, row }) => <LoanApplicationRowActions row={row} table={table} />,
  },
];
