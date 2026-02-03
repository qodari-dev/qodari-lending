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
import { useDeletePaymentTenderType, usePaymentTenderTypes } from '@/hooks/queries/use-payment-tender-type-queries';
import { PaymentTenderType, PaymentTenderTypeInclude, PaymentTenderTypeSortField } from '@/schemas/payment-tender-type';
import { RowData, TableMeta } from '@tanstack/react-table';
import { paymentTenderTypeColumns } from './payment-tender-type-columns';
import { PaymentTenderTypeForm } from './payment-tender-type-form';
import { PaymentTenderTypeInfo } from './payment-tender-type-info';
import { PaymentTenderTypesToolbar } from './payment-tender-type-toolbar';

declare module '@tanstack/table-core' {
  interface TableMeta<TData extends RowData> {
    onRowView?: (row: TData) => void;
    onRowEdit?: (row: TData) => void;
    onRowDelete?: (row: TData) => void;
  }
}

export function PaymentTenderTypes() {
  const [paymentTenderType, setPaymentTenderType] = React.useState<PaymentTenderType>();

  const {
    pageIndex,
    pageSize,
    sorting,
    searchValue,
    queryParams,
    handlePaginationChange,
    handleSortingChange,
    handleSearchChange,
  } = useDataTable<PaymentTenderTypeSortField, PaymentTenderTypeInclude>({
    defaultPageSize: 20,
    defaultIncludes: [],
    defaultSorting: [{ field: 'createdAt', order: 'desc' }],
  });

  const { data, isLoading, isFetching, refetch } = usePaymentTenderTypes(queryParams);

  const { mutateAsync: deletePaymentTenderType, isPending: isDeleting } = useDeletePaymentTenderType();

  // ---- Handlers ----
  const [openedInfoSheet, setOpenedInfoSheet] = React.useState(false);
  const handleInfoSheetChange = React.useCallback(
    (open: boolean) => {
      if (open === false) {
        setPaymentTenderType(undefined);
      }
      setOpenedInfoSheet(open);
    },
    [setPaymentTenderType, setOpenedInfoSheet]
  );

  const [openedFormSheet, setOpenedFormSheet] = React.useState(false);
  const handleFormSheetChange = React.useCallback(
    (open: boolean) => {
      if (open === false) {
        setPaymentTenderType(undefined);
      }
      setOpenedFormSheet(open);
    },
    [setPaymentTenderType, setOpenedFormSheet]
  );

  const [openedDeleteDialog, setOpenedDeleteDialog] = React.useState(false);
  const handleDelete = React.useCallback(async () => {
    if (!paymentTenderType?.id) return;
    await deletePaymentTenderType({ params: { id: paymentTenderType.id } });
    setPaymentTenderType(undefined);
    setOpenedDeleteDialog(false);
  }, [paymentTenderType, setPaymentTenderType, setOpenedDeleteDialog, deletePaymentTenderType]);

  const handleCreate = () => {
    handleFormSheetChange(true);
  };
  const handleRowOpen = React.useCallback((row: PaymentTenderType) => {
    setPaymentTenderType(row);
    setOpenedInfoSheet(true);
  }, []);
  const handleRowEdit = React.useCallback((row: PaymentTenderType) => {
    setPaymentTenderType(row);
    setOpenedFormSheet(true);
  }, []);
  const handleRowDelete = React.useCallback((row: PaymentTenderType) => {
    setPaymentTenderType(row);
    setOpenedDeleteDialog(true);
  }, []);

  const tableMeta = React.useMemo<TableMeta<PaymentTenderType>>(
    () => ({
      onRowView: handleRowOpen,
      onRowDelete: handleRowDelete,
      onRowEdit: handleRowEdit,
    }),
    [handleRowOpen, handleRowDelete, handleRowEdit]
  );

  return (
    <>
      <PageHeader title="Medios de Pago" description="Administre los medios de pago para abonos en tesorería." />
      <PageContent>
        <DataTable
          columns={paymentTenderTypeColumns}
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
            <PaymentTenderTypesToolbar
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

      <PaymentTenderTypeInfo
        paymentTenderType={paymentTenderType}
        opened={openedInfoSheet}
        onOpened={handleInfoSheetChange}
      />
      <PaymentTenderTypeForm
        paymentTenderType={paymentTenderType}
        opened={openedFormSheet}
        onOpened={handleFormSheetChange}
      />

      <AlertDialog open={openedDeleteDialog} onOpenChange={setOpenedDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el medio de pago
              &quot;{paymentTenderType?.name}&quot;.
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
