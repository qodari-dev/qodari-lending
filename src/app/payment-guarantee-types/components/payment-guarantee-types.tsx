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
  useDeletePaymentGuaranteeType,
  usePaymentGuaranteeTypes,
} from '@/hooks/queries/use-payment-guarantee-type-queries';
import {
  PaymentGuaranteeType,
  PaymentGuaranteeTypeInclude,
  PaymentGuaranteeTypeSortField,
} from '@/schemas/payment-guarantee-type';
import { RowData, TableMeta } from '@tanstack/react-table';
import { paymentGuaranteeTypeColumns } from './payment-guarantee-type-columns';
import { PaymentGuaranteeTypeForm } from './payment-guarantee-type-form';
import { PaymentGuaranteeTypeInfo } from './payment-guarantee-type-info';
import { paymentGuaranteeTypeExportConfig } from './payment-guarantee-type-export-config';
import { PaymentGuaranteeTypesToolbar } from './payment-guarantee-type-toolbar';

declare module '@tanstack/table-core' {
  interface TableMeta<TData extends RowData> {
    onRowView?: (row: TData) => void;
    onRowEdit?: (row: TData) => void;
    onRowDelete?: (row: TData) => void;
  }
}

export function PaymentGuaranteeTypes() {
  const [paymentGuaranteeType, setPaymentGuaranteeType] = React.useState<PaymentGuaranteeType>();

  const {
    pageIndex,
    pageSize,
    sorting,
    searchValue,
    queryParams,
    handlePaginationChange,
    handleSortingChange,
    handleSearchChange,
  } = useDataTable<PaymentGuaranteeTypeSortField, PaymentGuaranteeTypeInclude>({
    defaultPageSize: 20,
    defaultIncludes: [],
    defaultSorting: [{ field: 'createdAt', order: 'desc' }],
  });

  const { data, isLoading, isFetching, refetch } = usePaymentGuaranteeTypes(queryParams);

  const { mutateAsync: deletePaymentGuaranteeType, isPending: isDeleting } =
    useDeletePaymentGuaranteeType();

  // ---- Handlers ----
  const [openedInfoSheet, setOpenedInfoSheet] = React.useState(false);
  const handleInfoSheetChange = React.useCallback(
    (open: boolean) => {
      if (open === false) {
        setPaymentGuaranteeType(undefined);
      }
      setOpenedInfoSheet(open);
    },
    [setPaymentGuaranteeType, setOpenedInfoSheet]
  );

  const [openedFormSheet, setOpenedFormSheet] = React.useState(false);
  const handleFormSheetChange = React.useCallback(
    (open: boolean) => {
      if (open === false) {
        setPaymentGuaranteeType(undefined);
      }
      setOpenedFormSheet(open);
    },
    [setPaymentGuaranteeType, setOpenedFormSheet]
  );

  const [openedDeleteDialog, setOpenedDeleteDialog] = React.useState(false);
  const handleDelete = React.useCallback(async () => {
    if (!paymentGuaranteeType?.id) return;
    await deletePaymentGuaranteeType({ params: { id: paymentGuaranteeType.id } });
    setPaymentGuaranteeType(undefined);
    setOpenedDeleteDialog(false);
  }, [
    paymentGuaranteeType,
    setPaymentGuaranteeType,
    setOpenedDeleteDialog,
    deletePaymentGuaranteeType,
  ]);

  const handleCreate = () => {
    handleFormSheetChange(true);
  };
  const handleRowOpen = React.useCallback((row: PaymentGuaranteeType) => {
    setPaymentGuaranteeType(row);
    setOpenedInfoSheet(true);
  }, []);
  const handleRowEdit = React.useCallback((row: PaymentGuaranteeType) => {
    setPaymentGuaranteeType(row);
    setOpenedFormSheet(true);
  }, []);
  const handleRowDelete = React.useCallback((row: PaymentGuaranteeType) => {
    setPaymentGuaranteeType(row);
    setOpenedDeleteDialog(true);
  }, []);
  const fetchAllData = React.useCallback(async () => {
    const res = await api.paymentGuaranteeType.list.query({
      query: { ...queryParams, page: 1, limit: 10000 },
    });
    return (res.body as { data: PaymentGuaranteeType[] })?.data ?? [];
  }, [queryParams]);



  const tableMeta = React.useMemo<TableMeta<PaymentGuaranteeType>>(
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
        title="Garantías de Pago"
        description="Administre las garantías o respaldos documentales de los créditos."
      />
      <PageContent>
        <DataTable
          columns={paymentGuaranteeTypeColumns}
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
            <PaymentGuaranteeTypesToolbar
              searchValue={searchValue}
              onSearchChange={handleSearchChange}
              onCreate={handleCreate}
              onRefresh={() => refetch()}
              isRefreshing={isFetching && !isLoading}
              exportActions={
                <ExportDropdown
                  config={paymentGuaranteeTypeExportConfig}
                  fetchAllData={fetchAllData}
                />
              }
            />
          }
          emptyMessage="No hay información. Intente ajustar los filtros."
          meta={tableMeta}
        />
      </PageContent>

      <PaymentGuaranteeTypeInfo
        paymentGuaranteeType={paymentGuaranteeType}
        opened={openedInfoSheet}
        onOpened={handleInfoSheetChange}
      />
      <PaymentGuaranteeTypeForm
        paymentGuaranteeType={paymentGuaranteeType}
        opened={openedFormSheet}
        onOpened={handleFormSheetChange}
      />

      <AlertDialog open={openedDeleteDialog} onOpenChange={setOpenedDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente la garantía de pago
              &quot;{paymentGuaranteeType?.name}&quot;.
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
