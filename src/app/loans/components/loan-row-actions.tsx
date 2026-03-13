'use client';

import { DataTableRowActions, type RowAction, type RowActionGroup } from '@/components/data-table';
import { Loan } from '@/schemas/loan';
import { useHasPermission } from '@/stores/auth-store-provider';
import { Row, Table } from '@tanstack/react-table';
import {
  Ban,
  Building2,
  CheckCircle2,
  Eye,
  FileSignature,
  Handshake,
  Landmark,
  Scale,
} from 'lucide-react';

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

  const isVoidOrPaid = loan.status === 'VOID' || loan.status === 'PAID';
  const isOperationalLoan =
    loan.status === 'ACCOUNTED' && loan.disbursementStatus === 'DISBURSED';

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
      label: 'Enviar a firma digital',
      icon: FileSignature,
      onClick: meta?.onRowSendSignature,
      hidden: !(canLiquidate && loan.status === 'GENERATED'),
    },
    {
      label: 'Anular credito',
      icon: Ban,
      onClick: meta?.onRowVoid,
      hidden: !(canVoid && !isVoidOrPaid && loan.disbursementStatus !== 'DISBURSED'),
    },
    {
      label: 'Proceso juridico',
      icon: Scale,
      onClick: meta?.onRowLegalProcess,
      hidden: !(canUpdate && isOperationalLoan),
    },
    {
      label: 'Acuerdo de pago',
      icon: Handshake,
      onClick: meta?.onRowPaymentAgreement,
      hidden: !(canUpdate && isOperationalLoan),
    },
    {
      label: 'Cambiar convenio',
      icon: Building2,
      onClick: meta?.onRowAgreement,
      hidden: !(canUpdate && !isVoidOrPaid),
    },
    {
      label: 'Datos bancarios',
      icon: Landmark,
      onClick: meta?.onRowBankInfo,
      hidden: !(canUpdateBankInfo && !isVoidOrPaid),
    },
  ];

  return <DataTableRowActions row={loan} actions={actions} />;
}
