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
import { useCreditFunds, useDeleteCreditFund } from '@/hooks/queries/use-credit-fund-queries';
import { CreditFund, CreditFundInclude, CreditFundSortField } from '@/schemas/credit-fund';
import { RowData, TableMeta } from '@tanstack/react-table';
import { creditFundColumns } from './credit-fund-columns';
import { CreditFundForm } from './credit-fund-form';
import { CreditFundInfo } from './credit-fund-info';
import { CreditFundsToolbar } from './credit-fund-toolbar';

declare module '@tanstack/table-core' {
  interface TableMeta<TData extends RowData> {
    onRowView?: (row: TData) => void;
    onRowEdit?: (row: TData) => void;
    onRowDelete?: (row: TData) => void;
  }
}

export function CreditFunds() {
  const [creditFund, setCreditFund] = React.useState<CreditFund>();

  const {
    pageIndex,
    pageSize,
    sorting,
    searchValue,
    queryParams,
    handlePaginationChange,
    handleSortingChange,
    handleSearchChange,
  } = useDataTable<CreditFundSortField, CreditFundInclude>({
    defaultPageSize: 20,
    defaultIncludes: ['creditFundBudgets'],
    defaultSorting: [{ field: 'createdAt', order: 'desc' }],
  });

  const { data, isLoading, isFetching, refetch } = useCreditFunds(queryParams);

  const { mutateAsync: deleteCreditFund, isPending: isDeleting } = useDeleteCreditFund();

  // ---- Handlers ----
  const [openedInfoSheet, setOpenedInfoSheet] = React.useState(false);
  const handleInfoSheetChange = React.useCallback(
    (open: boolean) => {
      if (open === false) {
        setCreditFund(undefined);
      }
      setOpenedInfoSheet(open);
    },
    [setCreditFund, setOpenedInfoSheet]
  );

  const [openedFormSheet, setOpenedFormSheet] = React.useState(false);
  const handleFormSheetChange = React.useCallback(
    (open: boolean) => {
      if (open === false) {
        setCreditFund(undefined);
      }
      setOpenedFormSheet(open);
    },
    [setCreditFund, setOpenedFormSheet]
  );

  const [openedDeleteDialog, setOpenedDeleteDialog] = React.useState(false);
  const handleDelete = React.useCallback(async () => {
    if (!creditFund?.id) return;
    await deleteCreditFund({ params: { id: creditFund.id } });
    setCreditFund(undefined);
    setOpenedDeleteDialog(false);
  }, [creditFund, setCreditFund, setOpenedDeleteDialog, deleteCreditFund]);

  const handleCreate = () => {
    handleFormSheetChange(true);
  };
  const handleRowOpen = React.useCallback((row: CreditFund) => {
    setCreditFund(row);
    setOpenedInfoSheet(true);
  }, []);
  const handleRowEdit = React.useCallback((row: CreditFund) => {
    setCreditFund(row);
    setOpenedFormSheet(true);
  }, []);
  const handleRowDelete = React.useCallback((row: CreditFund) => {
    setCreditFund(row);
    setOpenedDeleteDialog(true);
  }, []);

  const tableMeta = React.useMemo<TableMeta<CreditFund>>(
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
        title="Fondos de Creditos"
        description="Administre los fondos de creditos y sus presupuestos."
      />
      <PageContent>
        <DataTable
          columns={creditFundColumns}
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
            <CreditFundsToolbar
              searchValue={searchValue}
              onSearchChange={handleSearchChange}
              onCreate={handleCreate}
              onRefresh={() => refetch()}
              isRefreshing={isFetching && !isLoading}
            />
          }
          emptyMessage="No hay informacion. Intente ajustar los filtros."
          meta={tableMeta}
        />
      </PageContent>

      <CreditFundInfo creditFund={creditFund} opened={openedInfoSheet} onOpened={handleInfoSheetChange} />
      <CreditFundForm creditFund={creditFund} opened={openedFormSheet} onOpened={handleFormSheetChange} />

      <AlertDialog open={openedDeleteDialog} onOpenChange={setOpenedDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Estas seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. Esto eliminara permanentemente el fondo de credito
              &quot;{creditFund?.name}&quot; y todos sus presupuestos.
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
