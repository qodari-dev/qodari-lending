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
import { useDeleteGlAccount, useGlAccounts } from '@/hooks/queries/use-gl-account-queries';
import { GlAccount, GlAccountInclude, GlAccountSortField } from '@/schemas/gl-account';
import { RowData, TableMeta } from '@tanstack/react-table';
import { glAccountColumns } from './gl-account-columns';
import { GlAccountForm } from './gl-account-form';
import { GlAccountInfo } from './gl-account-info';
import { glAccountExportConfig } from './gl-account-export-config';
import { GlAccountsToolbar } from './gl-account-toolbar';

declare module '@tanstack/table-core' {
  interface TableMeta<TData extends RowData> {
    onRowView?: (row: TData) => void;
    onRowEdit?: (row: TData) => void;
    onRowDelete?: (row: TData) => void;
  }
}

export function GlAccounts() {
  const [glAccount, setGlAccount] = React.useState<GlAccount>();

  const {
    pageIndex,
    pageSize,
    sorting,
    searchValue,
    queryParams,
    handlePaginationChange,
    handleSortingChange,
    handleSearchChange,
  } = useDataTable<GlAccountSortField, GlAccountInclude>({
    defaultPageSize: 20,
    defaultIncludes: [],
    defaultSorting: [{ field: 'createdAt', order: 'desc' }],
  });

  const { data, isLoading, isFetching, refetch } = useGlAccounts(queryParams);

  const { mutateAsync: deleteGlAccount, isPending: isDeleting } = useDeleteGlAccount();

  // ---- Handlers ----
  const [openedInfoSheet, setOpenedInfoSheet] = React.useState(false);
  const handleInfoSheetChange = React.useCallback(
    (open: boolean) => {
      if (open === false) {
        setGlAccount(undefined);
      }
      setOpenedInfoSheet(open);
    },
    [setGlAccount, setOpenedInfoSheet]
  );

  const [openedFormSheet, setOpenedFormSheet] = React.useState(false);
  const handleFormSheetChange = React.useCallback(
    (open: boolean) => {
      if (open === false) {
        setGlAccount(undefined);
      }
      setOpenedFormSheet(open);
    },
    [setGlAccount, setOpenedFormSheet]
  );

  const [openedDeleteDialog, setOpenedDeleteDialog] = React.useState(false);
  const handleDelete = React.useCallback(async () => {
    if (!glAccount?.id) return;
    await deleteGlAccount({ params: { id: glAccount.id } });
    setGlAccount(undefined);
    setOpenedDeleteDialog(false);
  }, [glAccount, setGlAccount, setOpenedDeleteDialog, deleteGlAccount]);

  const handleCreate = () => {
    handleFormSheetChange(true);
  };
  const handleRowOpen = React.useCallback((row: GlAccount) => {
    setGlAccount(row);
    setOpenedInfoSheet(true);
  }, []);
  const handleRowEdit = React.useCallback((row: GlAccount) => {
    setGlAccount(row);
    setOpenedFormSheet(true);
  }, []);
  const handleRowDelete = React.useCallback((row: GlAccount) => {
    setGlAccount(row);
    setOpenedDeleteDialog(true);
  }, []);
  const fetchAllData = React.useCallback(async () => {
    const res = await api.glAccount.list.query({
      query: { ...queryParams, page: 1, limit: 10000 },
    });
    return (res.body as { data: GlAccount[] })?.data ?? [];
  }, [queryParams]);



  const tableMeta = React.useMemo<TableMeta<GlAccount>>(
    () => ({
      onRowView: handleRowOpen,
      onRowDelete: handleRowDelete,
      onRowEdit: handleRowEdit,
    }),
    [handleRowOpen, handleRowDelete, handleRowEdit]
  );

  return (
    <>
      <PageHeader title="Plan Unico de Cuentas" description="Administre las cuentas contables." />
      <PageContent>
        <DataTable
          columns={glAccountColumns}
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
            <GlAccountsToolbar
              searchValue={searchValue}
              onSearchChange={handleSearchChange}
              onCreate={handleCreate}
              onRefresh={() => refetch()}
              isRefreshing={isFetching && !isLoading}
              exportActions={
                <ExportDropdown
                  config={glAccountExportConfig}
                  fetchAllData={fetchAllData}
                />
              }
            />
          }
          emptyMessage="No hay informacion. Intente ajustar los filtros."
          meta={tableMeta}
        />
      </PageContent>

      <GlAccountInfo
        glAccount={glAccount}
        opened={openedInfoSheet}
        onOpened={handleInfoSheetChange}
      />
      <GlAccountForm
        glAccount={glAccount}
        opened={openedFormSheet}
        onOpened={handleFormSheetChange}
      />

      <AlertDialog open={openedDeleteDialog} onOpenChange={setOpenedDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estas seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. Esto eliminara permanentemente la cuenta contable
              &quot;{glAccount?.code} - {glAccount?.name}&quot;.
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
