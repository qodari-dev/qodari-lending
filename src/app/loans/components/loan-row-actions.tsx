'use client';

import { DataTableRowActions, type RowAction, type RowActionGroup } from '@/components/data-table';
import { Loan } from '@/schemas/loan';
import { useHasPermission } from '@/stores/auth-store-provider';
import { Row, Table } from '@tanstack/react-table';
import { Ban, CheckCircle2, Eye, Handshake, Landmark, Scale } from 'lucide-react';

interface LoanRowActionsProps {
  row: Row<Loan>;
  table: Table<Loan>;
}

export function LoanRowActions({ row, table }: LoanRowActionsProps) {
  const loan = row.original;
  const meta = table.options.meta;
  const canLiquidate = useHasPermission('loans:liquidate');
  const canUpdate = useHasPermission('loans:update');
  const canUpdateBankInfo = useHasPermission('loans:update-bank-info');
  const canVoid = useHasPermission('loans:void');

  const actions: (RowAction<Loan> | RowActionGroup<Loan>)[] = [
    {
      label: 'Ver detalles',
      icon: Eye,
      onClick: meta?.onRowView,
    },
    {
      label: 'Liquidar',
      icon: CheckCircle2,
      onClick: meta?.onRowLiquidate,
      hidden: !(canLiquidate && loan.status === 'GENERATED'),
    },
    {
      label: 'Anular credito',
      icon: Ban,
      onClick: meta?.onRowVoid,
      hidden: !(canVoid && loan.status !== 'VOID'),
    },
    {
      label: 'Proceso juridico',
      icon: Scale,
      onClick: meta?.onRowLegalProcess,
      hidden: !canUpdate,
    },
    {
      label: 'Acuerdo de pago',
      icon: Handshake,
      onClick: meta?.onRowPaymentAgreement,
      hidden: !canUpdate,
    },
    {
      label: 'Datos bancarios',
      icon: Landmark,
      onClick: meta?.onRowBankInfo,
      hidden: !canUpdateBankInfo,
    },
  ];

  return <DataTableRowActions row={loan} actions={actions} />;
}
