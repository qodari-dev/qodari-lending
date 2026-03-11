'use client';

import { DataTableColumnHeader } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import {
  agreementBillingEmailDispatchStatusLabels,
  AGREEMENT_BILLING_EMAIL_DISPATCH_STATUS_OPTIONS,
} from '@/schemas/agreement';
import type { BillingDispatch } from '@/schemas/billing-dispatch';
import { formatCurrency, formatDate } from '@/utils/formatters';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

type DispatchStatus = (typeof AGREEMENT_BILLING_EMAIL_DISPATCH_STATUS_OPTIONS)[number];

const statusVariant: Record<DispatchStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  QUEUED: 'outline',
  RUNNING: 'secondary',
  SENT: 'default',
  FAILED: 'destructive',
};

export const billingDispatchColumns: ColumnDef<BillingDispatch>[] = [
  {
    accessorKey: 'dispatchNumber',
    header: ({ column }) => <DataTableColumnHeader column={column} title="#" />,
    cell: ({ row }) => (
      <span className="font-mono text-sm">#{row.original.dispatchNumber}</span>
    ),
  },
  {
    accessorKey: 'agreementId',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Convenio" />,
    cell: ({ row }) => {
      const agreement = row.original.agreement;
      if (!agreement) return row.original.agreementId;
      return (
        <div className="max-w-[220px] truncate" title={`${agreement.agreementCode} - ${agreement.businessName}`}>
          <span className="font-medium">{agreement.agreementCode}</span>
          <span className="text-muted-foreground"> — {agreement.businessName}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'period',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Período" />,
    cell: ({ row }) => <span className="font-mono">{row.original.period}</span>,
  },
  {
    accessorKey: 'scheduledDate',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha corte" />,
    cell: ({ row }) => formatDate(row.original.scheduledDate),
  },
  {
    accessorKey: 'status',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => {
      const status = row.original.status as DispatchStatus;
      return (
        <Badge variant={statusVariant[status] ?? 'outline'}>
          {agreementBillingEmailDispatchStatusLabels[status] ?? status}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'totalCredits',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Créditos" />,
    cell: ({ row }) => row.original.totalCredits ?? '—',
  },
  {
    accessorKey: 'totalBilledAmount',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Total cobrado" />,
    cell: ({ row }) => {
      const amount = row.original.totalBilledAmount;
      return amount ? formatCurrency(Number(amount)) : '—';
    },
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Creado" />,
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
  {
    id: 'actions',
    cell: ({ table, row }) => {
      const meta = table.options.meta;
      return (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => meta?.onRowView?.(row.original)}
        >
          <Eye className="h-4 w-4" />
        </Button>
      );
    },
  },
];
