'use client';

import { DataTableColumnHeader } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import {
  loanPaymentStatusLabels,
  LoanPayment,
  paymentReceiptMovementTypeLabels,
} from '@/schemas/loan-payment';
import { formatCurrency, formatDate } from '@/utils/formatters';
import type { ColumnDef } from '@tanstack/react-table';
import { LoanPaymentRowActions } from './loan-payment-row-actions';

function getBorrowerLabel(loanPayment: LoanPayment): string {
  const borrower = loanPayment.loan?.borrower;
  if (!borrower) return loanPayment.loan?.creditNumber ?? String(loanPayment.loanId);

  if (borrower.personType === 'LEGAL') {
    return borrower.businessName ?? borrower.documentNumber;
  }

  const fullName = [
    borrower.firstName,
    borrower.secondName,
    borrower.firstLastName,
    borrower.secondLastName,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return fullName || borrower.documentNumber;
}

export const loanPaymentColumns: ColumnDef<LoanPayment>[] = [
  {
    accessorKey: 'paymentNumber',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Recibo" />,
    cell: ({ row }) => <span className="font-medium">{row.original.paymentNumber}</span>,
  },
  {
    id: 'loan',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Credito" />,
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="text-sm font-medium">
          {row.original.loan?.creditNumber ?? `#${row.original.loanId}`}
        </span>
        <span className="text-muted-foreground text-xs">{getBorrowerLabel(row.original)}</span>
      </div>
    ),
  },
  {
    id: 'receiptType',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo recibo" />,
    cell: ({ row }) => <span>{row.original.paymentReceiptType?.name ?? row.original.receiptTypeId}</span>,
  },
  {
    accessorKey: 'movementType',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Movimiento" />,
    cell: ({ row }) => (
      <span>
        {row.original.movementType
          ? paymentReceiptMovementTypeLabels[row.original.movementType]
          : '-'}
      </span>
    ),
  },
  {
    accessorKey: 'amount',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Valor" />,
    cell: ({ row }) => <span className="font-mono text-xs">{formatCurrency(row.original.amount)}</span>,
  },
  {
    accessorKey: 'status',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => (
      <Badge variant={row.original.status === 'VOID' ? 'destructive' : 'outline'}>
        {loanPaymentStatusLabels[row.original.status]}
      </Badge>
    ),
  },
  {
    accessorKey: 'paymentDate',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha pago" />,
    cell: ({ row }) => <span>{formatDate(row.original.paymentDate)}</span>,
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Creado" />,
    cell: ({ row }) => <span>{formatDate(row.original.createdAt)}</span>,
  },
  {
    id: 'actions',
    cell: ({ table, row }) => <LoanPaymentRowActions row={row} table={table} />,
  },
];
