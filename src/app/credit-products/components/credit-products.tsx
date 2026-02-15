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
import {
  useCreditProducts,
  useDeleteCreditProduct,
} from '@/hooks/queries/use-credit-product-queries';
import { CreditProduct, CreditProductInclude, CreditProductSortField } from '@/schemas/credit-product';
import { RowData, TableMeta } from '@tanstack/react-table';
import * as React from 'react';
import { creditProductColumns } from './credit-product-columns';
import { CreditProductForm } from './credit-product-form';
import { CreditProductInfo } from './credit-product-info';
import { creditProductExportConfig } from './credit-product-export-config';
import { CreditProductsToolbar } from './credit-product-toolbar';

declare module '@tanstack/table-core' {
  interface TableMeta<TData extends RowData> {
    onRowView?: (row: TData) => void;
    onRowEdit?: (row: TData) => void;
    onRowDelete?: (row: TData) => void;
  }
}

export function CreditProducts() {
  const [creditProduct, setCreditProduct] = React.useState<CreditProduct>();

  const {
    pageIndex,
    pageSize,
    sorting,
    searchValue,
    queryParams,
    handlePaginationChange,
    handleSortingChange,
    handleSearchChange,
  } = useDataTable<CreditProductSortField, CreditProductInclude>({
    defaultPageSize: 20,
    defaultIncludes: [
      'creditFund',
      'paymentAllocationPolicy',
      'capitalDistribution',
      'interestDistribution',
      'lateInterestDistribution',
      'costCenter',
      'creditProductRefinancePolicy',
      'creditProductChargeOffPolicy',
      'creditProductCategories',
      'creditProductLateInterestRules',
      'creditProductRequiredDocuments',
      'creditProductAccounts',
      'creditProductBillingConcepts',
    ],
    defaultSorting: [{ field: 'createdAt', order: 'desc' }],
  });

  const { data, isLoading, isFetching, refetch } = useCreditProducts(queryParams);

  const { mutateAsync: deleteCreditProduct, isPending: isDeleting } = useDeleteCreditProduct();

  const [openedInfoSheet, setOpenedInfoSheet] = React.useState(false);
  const handleInfoSheetChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        setCreditProduct(undefined);
      }
      setOpenedInfoSheet(open);
    },
    [setCreditProduct, setOpenedInfoSheet]
  );

  const [openedFormSheet, setOpenedFormSheet] = React.useState(false);
  const handleFormSheetChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        setCreditProduct(undefined);
      }
      setOpenedFormSheet(open);
    },
    [setCreditProduct, setOpenedFormSheet]
  );

  const [openedDeleteDialog, setOpenedDeleteDialog] = React.useState(false);
  const handleDelete = React.useCallback(async () => {
    if (!creditProduct?.id) return;
    await deleteCreditProduct({ params: { id: creditProduct.id } });
    setCreditProduct(undefined);
    setOpenedDeleteDialog(false);
  }, [creditProduct, setCreditProduct, setOpenedDeleteDialog, deleteCreditProduct]);

  const handleCreate = () => {
    handleFormSheetChange(true);
  };

  const handleRowOpen = React.useCallback((row: CreditProduct) => {
    setCreditProduct(row);
    setOpenedInfoSheet(true);
  }, []);

  const handleRowEdit = React.useCallback((row: CreditProduct) => {
    setCreditProduct(row);
    setOpenedFormSheet(true);
  }, []);

  const handleRowDelete = React.useCallback((row: CreditProduct) => {
    setCreditProduct(row);
    setOpenedDeleteDialog(true);
  }, []);
  const fetchAllData = React.useCallback(async () => {
    const res = await api.creditProduct.list.query({
      query: { ...queryParams, page: 1, limit: 10000 },
    });
    return (res.body as { data: CreditProduct[] })?.data ?? [];
  }, [queryParams]);



  const tableMeta = React.useMemo<TableMeta<CreditProduct>>(
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
        title="Tipos de Creditos"
        description="Administre lineas de credito, categorias, reglas de mora, documentos y cuentas."
      />
      <PageContent>
        <DataTable
          columns={creditProductColumns}
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
            <CreditProductsToolbar
              searchValue={searchValue}
              onSearchChange={handleSearchChange}
              onCreate={handleCreate}
              onRefresh={() => refetch()}
              isRefreshing={isFetching && !isLoading}
              exportActions={
                <ExportDropdown
                  config={creditProductExportConfig}
                  fetchAllData={fetchAllData}
                />
              }
            />
          }
          emptyMessage="No hay informacion. Intente ajustar los filtros."
          meta={tableMeta}
        />
      </PageContent>

      <CreditProductInfo
        creditProduct={creditProduct}
        opened={openedInfoSheet}
        onOpened={handleInfoSheetChange}
      />
      <CreditProductForm
        creditProduct={creditProduct}
        opened={openedFormSheet}
        onOpened={handleFormSheetChange}
      />

      <AlertDialog open={openedDeleteDialog} onOpenChange={setOpenedDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Estas seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. Esto eliminara permanentemente el tipo de credito
              &quot;{creditProduct?.name}&quot; y su configuracion asociada.
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
