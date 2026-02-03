'use client';

import { DataTable, useDataTable } from '@/components/data-table';
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
import * as React from 'react';

import { PageContent, PageHeader } from '@/components/layout';
import { Spinner } from '@/components/ui/spinner';
import {
  useDeletePaymentFrequency,
  usePaymentFrequencies,
} from '@/hooks/queries/use-payment-frequency-queries';
import {
  PaymentFrequency,
  PaymentFrequencyInclude,
  PaymentFrequencySortField,
} from '@/schemas/payment-frequency';
import { RowData, TableMeta } from '@tanstack/react-table';
import { paymentFrequencyColumns } from './payment-frequency-columns';
import { PaymentFrequencyForm } from './payment-frequency-form';
import { PaymentFrequencyInfo } from './payment-frequency-info';
import { PaymentFrequenciesToolbar } from './payment-frequency-toolbar';

declare module '@tanstack/table-core' {
  interface TableMeta<TData extends RowData> {
    onRowView?: (row: TData) => void;
    onRowEdit?: (row: TData) => void;
    onRowDelete?: (row: TData) => void;
  }
}

export function PaymentFrequencies() {
  const [paymentFrequency, setPaymentFrequency] = React.useState<PaymentFrequency>();

  const {
    pageIndex,
    pageSize,
    sorting,
    searchValue,
    queryParams,
    handlePaginationChange,
    handleSortingChange,
    handleSearchChange,
  } = useDataTable<PaymentFrequencySortField, PaymentFrequencyInclude>({
    defaultPageSize: 20,
    defaultIncludes: [],
    defaultSorting: [{ field: 'createdAt', order: 'desc' }],
  });

  const { data, isLoading, isFetching, refetch } = usePaymentFrequencies(queryParams);

  const { mutateAsync: deletePaymentFrequency, isPending: isDeleting } =
    useDeletePaymentFrequency();

  // ---- Handlers ----
  const [openedInfoSheet, setOpenedInfoSheet] = React.useState(false);
  const handleInfoSheetChange = React.useCallback(
    (open: boolean) => {
      if (open === false) {
        setPaymentFrequency(undefined);
      }
      setOpenedInfoSheet(open);
    },
    [setPaymentFrequency, setOpenedInfoSheet]
  );

  const [openedFormSheet, setOpenedFormSheet] = React.useState(false);
  const handleFormSheetChange = React.useCallback(
    (open: boolean) => {
      if (open === false) {
        setPaymentFrequency(undefined);
      }
      setOpenedFormSheet(open);
    },
    [setPaymentFrequency, setOpenedFormSheet]
  );

  const [openedDeleteDialog, setOpenedDeleteDialog] = React.useState(false);
  const handleDelete = React.useCallback(async () => {
    if (!paymentFrequency?.id) return;
    await deletePaymentFrequency({ params: { id: paymentFrequency.id } });
    setPaymentFrequency(undefined);
    setOpenedDeleteDialog(false);
  }, [paymentFrequency, setPaymentFrequency, setOpenedDeleteDialog, deletePaymentFrequency]);

  const handleCreate = () => {
    handleFormSheetChange(true);
  };
  const handleRowOpen = React.useCallback((row: PaymentFrequency) => {
    setPaymentFrequency(row);
    setOpenedInfoSheet(true);
  }, []);
  const handleRowEdit = React.useCallback((row: PaymentFrequency) => {
    setPaymentFrequency(row);
    setOpenedFormSheet(true);
  }, []);
  const handleRowDelete = React.useCallback((row: PaymentFrequency) => {
    setPaymentFrequency(row);
    setOpenedDeleteDialog(true);
  }, []);

  const tableMeta = React.useMemo<TableMeta<PaymentFrequency>>(
    () => ({
      onRowView: handleRowOpen,
      onRowDelete: handleRowDelete,
      onRowEdit: handleRowEdit,
    }),
    [handleRowOpen, handleRowDelete, handleRowEdit]
  );

  return (
    <>
      <PageHeader
        title="Periodicidad de Pagos"
        description="Administre las frecuencias de pago de los créditos."
      />
      <PageContent>
        <DataTable
          columns={paymentFrequencyColumns}
          data={data?.body?.data ?? []}
          pageCount={data?.body?.meta.totalPages ?? 0}
          pageIndex={pageIndex}
          pageSize={pageSize}
          totalCount={data?.body?.meta.total}
          onPaginationChange={handlePaginationChange}
          sorting={sorting}
          onSortingChange={handleSortingChange}
          isLoading={isLoading}
          enableRowSelection
          pageSizeOptions={[10, 20, 30, 50]}
          toolbar={
            <PaymentFrequenciesToolbar
              searchValue={searchValue}
              onSearchChange={handleSearchChange}
              onCreate={handleCreate}
              onRefresh={() => refetch()}
              isRefreshing={isFetching && !isLoading}
            />
          }
          emptyMessage="No hay información. Intente ajustar los filtros."
          meta={tableMeta}
        />
      </PageContent>

      <PaymentFrequencyInfo
        paymentFrequency={paymentFrequency}
        opened={openedInfoSheet}
        onOpened={handleInfoSheetChange}
      />
      <PaymentFrequencyForm
        paymentFrequency={paymentFrequency}
        opened={openedFormSheet}
        onOpened={handleFormSheetChange}
      />

      <AlertDialog open={openedDeleteDialog} onOpenChange={setOpenedDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente la periodicidad
              &quot;{paymentFrequency?.name}&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOpenedDeleteDialog(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction disabled={isDeleting} onClick={handleDelete}>
              {isDeleting && <Spinner />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
