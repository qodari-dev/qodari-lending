'use client';

import { api } from '@/clients/api';
import { DataTable, useDataTable, ExportDropdown } from '@/components/data-table';
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
  useDeletePaymentReceiptType,
  usePaymentReceiptTypes,
} from '@/hooks/queries/use-payment-receipt-type-queries';
import {
  PaymentReceiptType,
  PaymentReceiptTypeInclude,
  PaymentReceiptTypeSortField,
} from '@/schemas/payment-receipt-type';
import { RowData, TableMeta } from '@tanstack/react-table';
import { paymentReceiptTypeColumns } from './payment-receipt-type-columns';
import { PaymentReceiptTypeForm } from './payment-receipt-type-form';
import { PaymentReceiptTypeInfo } from './payment-receipt-type-info';
import { paymentReceiptTypeExportConfig } from './payment-receipt-type-export-config';
import { PaymentReceiptTypesToolbar } from './payment-receipt-type-toolbar';

declare module '@tanstack/table-core' {
  interface TableMeta<TData extends RowData> {
    onRowView?: (row: TData) => void;
    onRowEdit?: (row: TData) => void;
    onRowDelete?: (row: TData) => void;
  }
}

export function PaymentReceiptTypes() {
  const [paymentReceiptType, setPaymentReceiptType] = React.useState<PaymentReceiptType>();

  const {
    pageIndex,
    pageSize,
    sorting,
    searchValue,
    queryParams,
    handlePaginationChange,
    handleSortingChange,
    handleSearchChange,
  } = useDataTable<PaymentReceiptTypeSortField, PaymentReceiptTypeInclude>({
    defaultPageSize: 20,
    defaultIncludes: ['glAccount', 'userPaymentReceiptTypes'],
    defaultSorting: [{ field: 'createdAt', order: 'desc' }],
  });

  const { data, isLoading, isFetching, refetch } = usePaymentReceiptTypes(queryParams);

  const { mutateAsync: deletePaymentReceiptType, isPending: isDeleting } =
    useDeletePaymentReceiptType();

  const [openedInfoSheet, setOpenedInfoSheet] = React.useState(false);
  const handleInfoSheetChange = React.useCallback(
    (open: boolean) => {
      if (open === false) {
        setPaymentReceiptType(undefined);
      }
      setOpenedInfoSheet(open);
    },
    [setPaymentReceiptType, setOpenedInfoSheet]
  );

  const [openedFormSheet, setOpenedFormSheet] = React.useState(false);
  const handleFormSheetChange = React.useCallback(
    (open: boolean) => {
      if (open === false) {
        setPaymentReceiptType(undefined);
      }
      setOpenedFormSheet(open);
    },
    [setPaymentReceiptType, setOpenedFormSheet]
  );

  const [openedDeleteDialog, setOpenedDeleteDialog] = React.useState(false);
  const handleDelete = React.useCallback(async () => {
    if (!paymentReceiptType?.id) return;
    await deletePaymentReceiptType({ params: { id: paymentReceiptType.id } });
    setPaymentReceiptType(undefined);
    setOpenedDeleteDialog(false);
  }, [paymentReceiptType, setPaymentReceiptType, setOpenedDeleteDialog, deletePaymentReceiptType]);

  const handleCreate = () => {
    handleFormSheetChange(true);
  };
  const handleRowOpen = React.useCallback((row: PaymentReceiptType) => {
    setPaymentReceiptType(row);
    setOpenedInfoSheet(true);
  }, []);
  const handleRowEdit = React.useCallback((row: PaymentReceiptType) => {
    setPaymentReceiptType(row);
    setOpenedFormSheet(true);
  }, []);
  const handleRowDelete = React.useCallback((row: PaymentReceiptType) => {
    setPaymentReceiptType(row);
    setOpenedDeleteDialog(true);
  }, []);
  const fetchAllData = React.useCallback(async () => {
    const res = await api.paymentReceiptType.list.query({
      query: { ...queryParams, page: 1, limit: 10000 },
    });
    return (res.body as { data: PaymentReceiptType[] })?.data ?? [];
  }, [queryParams]);



  const tableMeta = React.useMemo<TableMeta<PaymentReceiptType>>(
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
        title="Tipos de Recibos de Abonos"
        description="Administre tipos de recibos y usuarios habilitados."
      />
      <PageContent>
        <DataTable
          columns={paymentReceiptTypeColumns}
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
            <PaymentReceiptTypesToolbar
              searchValue={searchValue}
              onSearchChange={handleSearchChange}
              onCreate={handleCreate}
              onRefresh={() => refetch()}
              isRefreshing={isFetching && !isLoading}
              exportActions={
                <ExportDropdown
                  config={paymentReceiptTypeExportConfig}
                  fetchAllData={fetchAllData}
                />
              }
            />
          }
          emptyMessage="No hay informacion. Intente ajustar los filtros."
          meta={tableMeta}
        />
      </PageContent>

      <PaymentReceiptTypeInfo
        paymentReceiptType={paymentReceiptType}
        opened={openedInfoSheet}
        onOpened={handleInfoSheetChange}
      />
      <PaymentReceiptTypeForm
        paymentReceiptType={paymentReceiptType}
        opened={openedFormSheet}
        onOpened={handleFormSheetChange}
      />

      <AlertDialog open={openedDeleteDialog} onOpenChange={setOpenedDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Estas seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. Esto eliminara permanentemente el tipo de recibo
              &quot;{paymentReceiptType?.name}&quot; y su configuracion de usuarios.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOpenedDeleteDialog(false)}>Cancelar</AlertDialogCancel>
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
