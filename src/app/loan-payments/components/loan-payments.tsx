'use client';

import { DataTable, useDataTable } from '@/components/data-table';
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
import {
  useAvailableLoanPaymentReceiptTypes,
  useLoanPayments,
  useVoidLoanPayment,
} from '@/hooks/queries/use-loan-payment-queries';
import {
  LoanPayment,
  LoanPaymentInclude,
  LOAN_PAYMENT_STATUS_OPTIONS,
  LoanPaymentSortField,
  LoanPaymentStatus,
} from '@/schemas/loan-payment';
import { RowData, TableMeta } from '@tanstack/react-table';
import React from 'react';
import { toast } from 'sonner';
import { loanPaymentColumns } from './loan-payment-columns';
import { LoanPaymentForm } from './loan-payment-form';
import { LoanPaymentInfo } from './loan-payment-info';
import { LoanPaymentsToolbar } from './loan-payment-toolbar';

declare module '@tanstack/table-core' {
  interface TableMeta<TData extends RowData> {
    onRowView?: (row: TData) => void;
    onRowVoid?: (row: TData) => void;
  }
}

export function LoanPayments() {
  const [loanPayment, setLoanPayment] = React.useState<LoanPayment>();

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
  } = useDataTable<LoanPaymentSortField, LoanPaymentInclude>({
    defaultPageSize: 20,
    defaultIncludes: ['loan', 'paymentReceiptType', 'loanPaymentMethodAllocations'],
    defaultSorting: [{ field: 'createdAt', order: 'desc' }],
  });

  const { data, isLoading, isFetching, refetch } = useLoanPayments(queryParams);
  const { data: availableReceiptTypesData } = useAvailableLoanPaymentReceiptTypes();
  const availableReceiptTypes = availableReceiptTypesData?.body ?? [];

  const rangeDateFilter = React.useMemo(() => {
    const paymentDate = filters.paymentDate as { gte?: Date; lte?: Date } | undefined;
    if (!paymentDate) return undefined;
    const from = paymentDate.gte;
    const to = paymentDate.lte;
    if (!from && !to) return undefined;
    return { from, to };
  }, [filters.paymentDate]);

  const statusFilter = React.useMemo(() => {
    const status = filters.status;
    if (!status || typeof status !== 'string') return undefined;
    if (LOAN_PAYMENT_STATUS_OPTIONS.includes(status as LoanPaymentStatus)) {
      return status as LoanPaymentStatus;
    }
    return undefined;
  }, [filters.status]);

  const [openedInfoSheet, setOpenedInfoSheet] = React.useState(false);
  const handleInfoSheetChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        setLoanPayment(undefined);
      }
      setOpenedInfoSheet(open);
    },
    [setLoanPayment, setOpenedInfoSheet]
  );

  const [openedFormSheet, setOpenedFormSheet] = React.useState(false);
  const handleFormSheetChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        setLoanPayment(undefined);
      }
      setOpenedFormSheet(open);
    },
    [setLoanPayment, setOpenedFormSheet]
  );

  const { mutateAsync: voidLoanPayment, isPending: isVoiding } = useVoidLoanPayment();
  const [openedVoidDialog, setOpenedVoidDialog] = React.useState(false);
  const [voidNote, setVoidNote] = React.useState('');

  const handleCreate = React.useCallback(() => {
    if (!availableReceiptTypes.length) {
      toast.error('No tiene tipos de recibo habilitados para registrar abonos');
      return;
    }

    setLoanPayment(undefined);
    setOpenedFormSheet(true);
  }, [availableReceiptTypes.length]);

  const handleRowOpen = React.useCallback((row: LoanPayment) => {
    setLoanPayment(row);
    setOpenedInfoSheet(true);
  }, []);

  const handleRowVoid = React.useCallback((row: LoanPayment) => {
    setLoanPayment(row);
    setVoidNote('');
    setOpenedVoidDialog(true);
  }, []);

  const submitVoid = React.useCallback(async () => {
    if (!loanPayment?.id || !voidNote.trim()) return;

    await voidLoanPayment({
      params: { id: loanPayment.id },
      body: { noteStatus: voidNote.trim() },
    });

    setOpenedVoidDialog(false);
    setVoidNote('');
    setLoanPayment(undefined);
  }, [loanPayment, voidLoanPayment, voidNote]);

  const tableMeta = React.useMemo<TableMeta<LoanPayment>>(
    () => ({
      onRowView: handleRowOpen,
      onRowVoid: handleRowVoid,
    }),
    [handleRowOpen, handleRowVoid]
  );

  return (
    <>
      <PageHeader
        title="Abonos"
        description="Registre pagos a creditos y distribuya los valores por forma de recaudo."
      />
      <PageContent>
        <DataTable
          columns={loanPaymentColumns}
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
            <LoanPaymentsToolbar
              searchValue={searchValue}
              onSearchChange={handleSearchChange}
              statusFilter={statusFilter}
              onStatusFilterChange={(value) => handleFilterChange('status', value)}
              rangeDateFilter={rangeDateFilter}
              onRangeDateFilterChange={(value) => {
                if (value?.from && value?.to) {
                  handleFilterChange('paymentDate', { gte: value.from, lte: value.to });
                } else if (value?.from) {
                  handleFilterChange('paymentDate', { gte: value.from });
                } else if (value?.to) {
                  handleFilterChange('paymentDate', { lte: value.to });
                } else {
                  handleFilterChange('paymentDate', undefined);
                }
              }}
              onReset={resetFilters}
              onRefresh={() => refetch()}
              onCreate={handleCreate}
              isRefreshing={isFetching && !isLoading}
            />
          }
          emptyMessage="No hay informacion. Intente ajustar los filtros."
          meta={tableMeta}
        />
      </PageContent>

      <LoanPaymentInfo
        loanPayment={loanPayment}
        opened={openedInfoSheet}
        onOpened={handleInfoSheetChange}
      />
      <LoanPaymentForm
        opened={openedFormSheet}
        onOpened={handleFormSheetChange}
        availableReceiptTypes={availableReceiptTypes}
      />

      <AlertDialog open={openedVoidDialog} onOpenChange={setOpenedVoidDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anular abono</AlertDialogTitle>
            <AlertDialogDescription>
              El abono quedara en estado anulado y debe registrar la nota de anulacion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={voidNote}
            onChange={(event) => setVoidNote(event.target.value)}
            placeholder="Digite la nota de anulacion..."
            rows={4}
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOpenedVoidDialog(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={isVoiding || !voidNote.trim()} onClick={submitVoid}>
              {isVoiding && <Spinner />}
              Anular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
