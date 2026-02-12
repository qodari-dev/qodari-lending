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
import { useDeleteBank, useBanks } from '@/hooks/queries/use-bank-queries';
import { Bank, BankInclude, BankSortField } from '@/schemas/bank';
import { RowData, TableMeta } from '@tanstack/react-table';
import { bankColumns } from './bank-columns';
import { BankForm } from './bank-form';
import { BankInfo } from './bank-info';
import { bankExportConfig } from './bank-export-config';
import { BanksToolbar } from './bank-toolbar';

declare module '@tanstack/table-core' {
  interface TableMeta<TData extends RowData> {
    onRowView?: (row: TData) => void;
    onRowEdit?: (row: TData) => void;
    onRowDelete?: (row: TData) => void;
  }
}

export function Banks() {
  const [bank, setBank] = React.useState<Bank>();

  const {
    pageIndex,
    pageSize,
    sorting,
    searchValue,
    queryParams,
    handlePaginationChange,
    handleSortingChange,
    handleSearchChange,
  } = useDataTable<BankSortField, BankInclude>({
    defaultPageSize: 20,
    defaultIncludes: [],
    defaultSorting: [{ field: 'createdAt', order: 'desc' }],
  });

  const { data, isLoading, isFetching, refetch } = useBanks(queryParams);

  const { mutateAsync: deleteBank, isPending: isDeleting } = useDeleteBank();

  // ---- Handlers ----
  const [openedInfoSheet, setOpenedInfoSheet] = React.useState(false);
  const handleInfoSheetChange = React.useCallback(
    (open: boolean) => {
      if (open === false) {
        setBank(undefined);
      }
      setOpenedInfoSheet(open);
    },
    [setBank, setOpenedInfoSheet]
  );

  const [openedFormSheet, setOpenedFormSheet] = React.useState(false);
  const handleFormSheetChange = React.useCallback(
    (open: boolean) => {
      if (open === false) {
        setBank(undefined);
      }
      setOpenedFormSheet(open);
    },
    [setBank, setOpenedFormSheet]
  );

  const [openedDeleteDialog, setOpenedDeleteDialog] = React.useState(false);
  const handleDelete = React.useCallback(async () => {
    if (!bank?.id) return;
    await deleteBank({ params: { id: bank.id } });
    setBank(undefined);
    setOpenedDeleteDialog(false);
  }, [bank, setBank, setOpenedDeleteDialog, deleteBank]);

  const handleCreate = () => {
    handleFormSheetChange(true);
  };
  const handleRowOpen = React.useCallback((row: Bank) => {
    setBank(row);
    setOpenedInfoSheet(true);
  }, []);
  const handleRowEdit = React.useCallback((row: Bank) => {
    setBank(row);
    setOpenedFormSheet(true);
  }, []);
  const handleRowDelete = React.useCallback((row: Bank) => {
    setBank(row);
    setOpenedDeleteDialog(true);
  }, []);
  const fetchAllData = React.useCallback(async () => {
    const res = await api.bank.list.query({
      query: { ...queryParams, page: 1, limit: 10000 },
    });
    return (res.body as { data: Bank[] })?.data ?? [];
  }, [queryParams]);



  const tableMeta = React.useMemo<TableMeta<Bank>>(
    () => ({
      onRowView: handleRowOpen,
      onRowDelete: handleRowDelete,
      onRowEdit: handleRowEdit,
    }),
    [handleRowOpen, handleRowDelete, handleRowEdit]
  );

  return (
    <>
      <PageHeader title="Bancos" description="Administre los bancos para desembolso de créditos." />
      <PageContent>
        <DataTable
          columns={bankColumns}
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
            <BanksToolbar
              searchValue={searchValue}
              onSearchChange={handleSearchChange}
              onCreate={handleCreate}
              onRefresh={() => refetch()}
              isRefreshing={isFetching && !isLoading}
              exportActions={
                <ExportDropdown
                  config={bankExportConfig}
                  fetchAllData={fetchAllData}
                />
              }
            />
          }
          emptyMessage="No hay información. Intente ajustar los filtros."
          meta={tableMeta}
        />
      </PageContent>

      <BankInfo
        bank={bank}
        opened={openedInfoSheet}
        onOpened={handleInfoSheetChange}
      />
      <BankForm
        bank={bank}
        opened={openedFormSheet}
        onOpened={handleFormSheetChange}
      />

      <AlertDialog open={openedDeleteDialog} onOpenChange={setOpenedDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el banco
              &quot;{bank?.name}&quot;.
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
