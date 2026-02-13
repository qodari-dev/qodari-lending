'use client';

import { DataTableColumnHeader } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Loan, loanStatusLabels, LoanStatus } from '@/schemas/loan';
import { formatCurrency, formatDate } from '@/utils/formatters';
import type { ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { LoanRowActions } from './loan-row-actions';

function getBorrowerLabel(loan: Loan): string {
  const person = loan.borrower;
  if (!person) return String(loan.thirdPartyId);

  if (person.personType === 'LEGAL') {
    return person.businessName ?? person.documentNumber;
  }

  const fullName = [person.firstName, person.secondName, person.firstLastName, person.secondLastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  return fullName || person.documentNumber;
}

function StatusBadge({ status }: { status: LoanStatus }) {
  if (status === 'ACTIVE') {
    return (
      <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
        <CheckCircle className="h-3 w-3" />
        {loanStatusLabels[status]}
      </Badge>
    );
  }

  if (status === 'GENERATED') {
    return (
      <Badge variant="outline" className="gap-1">
        <Clock className="h-3 w-3" />
        {loanStatusLabels[status]}
      </Badge>
    );
  }

  if (status === 'VOID') {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" />
        {loanStatusLabels[status]}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-muted-foreground gap-1">
      <AlertTriangle className="h-3 w-3" />
      {loanStatusLabels[status]}
    </Badge>
  );
}

export const loanColumns: ColumnDef<Loan>[] = [
  {
    accessorKey: 'creditNumber',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Credito" />,
    cell: ({ row }) => <span className="font-medium">{row.original.creditNumber}</span>,
  },
  {
    id: 'borrower',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Titular" />,
    cell: ({ row }) => <span>{getBorrowerLabel(row.original)}</span>,
  },
  {
    accessorKey: 'principalAmount',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Capital" />,
    cell: ({ row }) => (
      <span className="font-mono text-xs">{formatCurrency(row.original.principalAmount)}</span>
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
    cell: ({ row }) => <StatusBadge status={row.original.status as LoanStatus} />,
  },
  {
    accessorKey: 'hasLegalProcess',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Juridica" />,
    cell: ({ row }) =>
      row.original.hasLegalProcess ? (
        <span className="text-destructive text-xs font-medium">En juridica</span>
      ) : (
        <span className="text-muted-foreground text-xs">No</span>
      ),
  },
  {
    accessorKey: 'hasPaymentAgreement',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Acuerdo" />,
    cell: ({ row }) =>
      row.original.hasPaymentAgreement ? (
        <span className="text-emerald-700 text-xs font-medium">Con acuerdo</span>
      ) : (
        <span className="text-muted-foreground text-xs">Sin acuerdo</span>
      ),
  },
  {
    accessorKey: 'recordDate',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha registro" />,
    cell: ({ row }) => <span>{formatDate(row.original.recordDate)}</span>,
  },
  {
    accessorKey: 'creditStartDate',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Inicio credito" />,
    cell: ({ row }) => <span>{formatDate(row.original.creditStartDate)}</span>,
  },
  {
    id: 'actions',
    cell: ({ table, row }) => <LoanRowActions row={row} table={table} />,
  },
];
