'use client';

import { api } from '@/clients/api';
import { DataTable, useDataTable, ExportDropdown } from '@/components/data-table';
import { PageContent, PageHeader } from '@/components/layout';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useLiquidateLoan, useLoans, useVoidLoan } from '@/hooks/queries/use-loan-queries';
import { Loan, LoanInclude, LOAN_STATUS_OPTIONS, LoanSortField, LoanStatus } from '@/schemas/loan';
import { RowData, TableMeta } from '@tanstack/react-table';
import React from 'react';
import { loanColumns } from './loan-columns';
import { LoanAgreementDialog } from './loan-agreement-dialog';
import { LoanBankInfoDialog } from './loan-bank-info-dialog';
import { LoanInfo } from './loan-info';
import { loanExportConfig } from './loan-export-config';
import { LoanLegalProcessDialog } from './loan-legal-process-dialog';
import { LoanPaymentAgreementDialog } from './loan-payment-agreement-dialog';
import { LoansToolbar } from './loan-toolbar';

declare module '@tanstack/table-core' {
  interface TableMeta<TData extends RowData> {
    onRowView?: (row: TData) => void;
    onRowLiquidate?: (row: TData) => void;
    onRowVoid?: (row: TData) => void;
    onRowLegalProcess?: (row: TData) => void;
    onRowPaymentAgreement?: (row: TData) => void;
    onRowAgreement?: (row: TData) => void;
    onRowBankInfo?: (row: TData) => void;
  }
}

export function Loans() {
  const [loan, setLoan] = React.useState<Loan>();
  const [loanToLiquidate, setLoanToLiquidate] = React.useState<Loan>();
  const [loanToVoid, setLoanToVoid] = React.useState<Loan>();
  const [loanToUpdateLegalProcess, setLoanToUpdateLegalProcess] = React.useState<Loan>();
  const [loanToUpdatePaymentAgreement, setLoanToUpdatePaymentAgreement] = React.useState<Loan>();
  const [loanToUpdateAgreement, setLoanToUpdateAgreement] = React.useState<Loan>();
  const [loanToUpdateBankInfo, setLoanToUpdateBankInfo] = React.useState<Loan>();

  const {
    pageIndex,
    pageSize,
    sorting,
    searchValue,
    filters,
    queryParams,
    handlePaginationChange,
    handleSortingChange,
    handleSearchChange,
    handleFilterChange,
    resetFilters,
  } = useDataTable<LoanSortField, LoanInclude>({
    defaultPageSize: 20,
    defaultIncludes: [
      'borrower',
      'disbursementParty',
      'affiliationOffice',
      'paymentFrequency',
      'loanApplication',
    ],
    defaultSorting: [{ field: 'createdAt', order: 'desc' }],
  });

  const { data, isLoading, isFetching, refetch } = useLoans(queryParams);

  const rangeDateFilter = React.useMemo(() => {
    const recordDate = filters.recordDate as { gte?: Date; lte?: Date } | undefined;
    if (!recordDate) return undefined;
    const from = recordDate.gte;
    const to = recordDate.lte;
    if (!from && !to) return undefined;
    return { from, to };
  }, [filters.recordDate]);

  const statusFilter = React.useMemo(() => {
    const status = filters.status;
    if (!status || typeof status !== 'string') return undefined;
    if (LOAN_STATUS_OPTIONS.includes(status as LoanStatus)) {
      return status as LoanStatus;
    }
    return undefined;
  }, [filters.status]);

  const legalProcessFilter = React.useMemo(() => {
    const value = filters.hasLegalProcess;
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  }, [filters.hasLegalProcess]);
  const paymentAgreementFilter = React.useMemo(() => {
    const value = filters.hasPaymentAgreement;
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  }, [filters.hasPaymentAgreement]);

  const [openedInfoSheet, setOpenedInfoSheet] = React.useState(false);
  const handleInfoSheetChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        setLoan(undefined);
      }
      setOpenedInfoSheet(open);
    },
    [setLoan, setOpenedInfoSheet]
  );

  const handleRowOpen = React.useCallback((row: Loan) => {
    setLoan(row);
    setOpenedInfoSheet(true);
  }, []);

  const { mutateAsync: liquidateLoan, isPending: isLiquidating } = useLiquidateLoan();
  const { mutateAsync: voidLoan, isPending: isVoiding } = useVoidLoan();
  const [openedLiquidateDialog, setOpenedLiquidateDialog] = React.useState(false);
  const [openedVoidDialog, setOpenedVoidDialog] = React.useState(false);
  const [voidNote, setVoidNote] = React.useState('');

  const handleRowLiquidate = React.useCallback((row: Loan) => {
    setLoanToLiquidate(row);
    setOpenedLiquidateDialog(true);
  }, []);
  const handleRowVoid = React.useCallback((row: Loan) => {
    setLoanToVoid(row);
    setVoidNote('');
    setOpenedVoidDialog(true);
  }, []);
  const [openedLegalProcessDialog, setOpenedLegalProcessDialog] = React.useState(false);

  const handleRowLegalProcess = React.useCallback((row: Loan) => {
    setLoanToUpdateLegalProcess(row);
    setOpenedLegalProcessDialog(true);
  }, []);
  const [openedPaymentAgreementDialog, setOpenedPaymentAgreementDialog] = React.useState(false);

  const handleRowPaymentAgreement = React.useCallback((row: Loan) => {
    setLoanToUpdatePaymentAgreement(row);
    setOpenedPaymentAgreementDialog(true);
  }, []);
  const [openedAgreementDialog, setOpenedAgreementDialog] = React.useState(false);

  const handleRowAgreement = React.useCallback((row: Loan) => {
    setLoanToUpdateAgreement(row);
    setOpenedAgreementDialog(true);
  }, []);
  const [openedBankInfoDialog, setOpenedBankInfoDialog] = React.useState(false);

  const handleRowBankInfo = React.useCallback((row: Loan) => {
    setLoanToUpdateBankInfo(row);
    setOpenedBankInfoDialog(true);
  }, []);

  const submitLiquidate = React.useCallback(async () => {
    if (!loanToLiquidate?.id) return;

    await liquidateLoan({
      params: { id: loanToLiquidate.id },
      body: {},
    });

    setOpenedLiquidateDialog(false);
    setLoanToLiquidate(undefined);
  }, [liquidateLoan, loanToLiquidate]);
  const submitVoid = React.useCallback(async () => {
    if (!loanToVoid?.id || !voidNote.trim()) return;

    await voidLoan({
      params: { id: loanToVoid.id },
      body: { note: voidNote.trim() },
    });

    setOpenedVoidDialog(false);
    setLoanToVoid(undefined);
    setVoidNote('');
  }, [loanToVoid, voidLoan, voidNote]);
  const fetchAllData = React.useCallback(async () => {
    const res = await api.loan.list.query({
      query: { ...queryParams, page: 1, limit: 10000 },
    });
    return (res.body as { data: Loan[] })?.data ?? [];
  }, [queryParams]);



  const tableMeta = React.useMemo<TableMeta<Loan>>(
    () => ({
      onRowView: handleRowOpen,
      onRowLiquidate: handleRowLiquidate,
      onRowVoid: handleRowVoid,
      onRowLegalProcess: handleRowLegalProcess,
      onRowPaymentAgreement: handleRowPaymentAgreement,
      onRowAgreement: handleRowAgreement,
      onRowBankInfo: handleRowBankInfo,
    }),
    [
      handleRowOpen,
      handleRowLiquidate,
      handleRowVoid,
      handleRowLegalProcess,
      handleRowPaymentAgreement,
      handleRowAgreement,
      handleRowBankInfo,
    ]
  );

  return (
    <>
      <PageHeader
        title="Creditos"
        description="Consulte creditos, cuotas y abonos asociados."
      />
      <PageContent>
        <DataTable
          columns={loanColumns}
          data={data?.body?.data ?? []}
          pageCount={data?.body?.meta.totalPages ?? 0}
          pageIndex={pageIndex}
          pageSize={pageSize}
          totalCount={data?.body?.meta.total}
          onPaginationChange={handlePaginationChange}
          sorting={sorting}
          onSortingChange={handleSortingChange}
          isLoading={isLoading}
          pageSizeOptions={[10, 20, 30, 50]}
          toolbar={
            <LoansToolbar
              searchValue={searchValue}
              onSearchChange={handleSearchChange}
              statusFilter={statusFilter}
              onStatusFilterChange={(value) => handleFilterChange('status', value)}
              legalProcessFilter={legalProcessFilter}
              onLegalProcessFilterChange={(value) => handleFilterChange('hasLegalProcess', value)}
              paymentAgreementFilter={paymentAgreementFilter}
              onPaymentAgreementFilterChange={(value) =>
                handleFilterChange('hasPaymentAgreement', value)
              }
              rangeDateFilter={rangeDateFilter}
              onRangeDateFilterChange={(value) => {
                if (value?.from && value?.to) {
                  handleFilterChange('recordDate', { gte: value.from, lte: value.to });
                } else if (value?.from) {
                  handleFilterChange('recordDate', { gte: value.from });
                } else if (value?.to) {
                  handleFilterChange('recordDate', { lte: value.to });
                } else {
                  handleFilterChange('recordDate', undefined);
                }
              }}
              onReset={resetFilters}
              onRefresh={() => refetch()}
              isRefreshing={isFetching && !isLoading}
              exportActions={
                <ExportDropdown
                  config={loanExportConfig}
                  fetchAllData={fetchAllData}
                />
              }
            />
          }
          emptyMessage="No hay informacion. Intente ajustar los filtros."
          meta={tableMeta}
        />
      </PageContent>

      <LoanInfo loan={loan} opened={openedInfoSheet} onOpened={handleInfoSheetChange} />
      <LoanLegalProcessDialog
        loan={loanToUpdateLegalProcess}
        opened={openedLegalProcessDialog}
        onOpened={(open) => {
          setOpenedLegalProcessDialog(open);
          if (!open) {
            setLoanToUpdateLegalProcess(undefined);
          }
        }}
      />
      <LoanPaymentAgreementDialog
        loan={loanToUpdatePaymentAgreement}
        opened={openedPaymentAgreementDialog}
        onOpened={(open) => {
          setOpenedPaymentAgreementDialog(open);
          if (!open) {
            setLoanToUpdatePaymentAgreement(undefined);
          }
        }}
      />
      <LoanBankInfoDialog
        loan={loanToUpdateBankInfo}
        opened={openedBankInfoDialog}
        onOpened={(open) => {
          setOpenedBankInfoDialog(open);
          if (!open) {
            setLoanToUpdateBankInfo(undefined);
          }
        }}
      />
      <LoanAgreementDialog
        loan={loanToUpdateAgreement}
        opened={openedAgreementDialog}
        onOpened={(open) => {
          setOpenedAgreementDialog(open);
          if (!open) {
            setLoanToUpdateAgreement(undefined);
          }
        }}
      />

      <AlertDialog
        open={openedLiquidateDialog}
        onOpenChange={(open) => {
          setOpenedLiquidateDialog(open);
          if (!open) {
            setLoanToLiquidate(undefined);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Liquidar credito</AlertDialogTitle>
            <AlertDialogDescription>
              Se generaran los movimientos contables y saldos iniciales del credito{' '}
              <strong>{loanToLiquidate?.creditNumber ?? ''}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={isLiquidating} onClick={submitLiquidate}>
              {isLiquidating && <Spinner />}
              Liquidar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={openedVoidDialog}
        onOpenChange={(open) => {
          setOpenedVoidDialog(open);
          if (!open) {
            setLoanToVoid(undefined);
            setVoidNote('');
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anular credito</AlertDialogTitle>
            <AlertDialogDescription>
              El credito <strong>{loanToVoid?.creditNumber ?? ''}</strong> quedara en estado anulado.
              Debe registrar el motivo de anulacion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={voidNote}
            onChange={(event) => setVoidNote(event.target.value)}
            placeholder="Digite el motivo de anulacion..."
            rows={4}
            maxLength={255}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={isVoiding || voidNote.trim().length < 5} onClick={submitVoid}>
              {isVoiding && <Spinner />}
              Anular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
