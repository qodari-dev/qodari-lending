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
  useAccountingDistributions,
  useDeleteAccountingDistribution,
} from '@/hooks/queries/use-accounting-distribution-queries';
import {
  AccountingDistribution,
  AccountingDistributionInclude,
  AccountingDistributionSortField,
} from '@/schemas/accounting-distribution';
import { RowData, TableMeta } from '@tanstack/react-table';
import { accountingDistributionColumns } from './accounting-distribution-columns';
import { AccountingDistributionForm } from './accounting-distribution-form';
import { AccountingDistributionInfo } from './accounting-distribution-info';
import { AccountingDistributionsToolbar } from './accounting-distribution-toolbar';

declare module '@tanstack/table-core' {
  interface TableMeta<TData extends RowData> {
    onRowView?: (row: TData) => void;
    onRowEdit?: (row: TData) => void;
    onRowDelete?: (row: TData) => void;
  }
}

export function AccountingDistributions() {
  const [accountingDistribution, setAccountingDistribution] =
    React.useState<AccountingDistribution>();

  const {
    pageIndex,
    pageSize,
    sorting,
    searchValue,
    queryParams,
    handlePaginationChange,
    handleSortingChange,
    handleSearchChange,
  } = useDataTable<AccountingDistributionSortField, AccountingDistributionInclude>({
    defaultPageSize: 20,
    defaultIncludes: ['accountingDistributionLines'],
    defaultSorting: [{ field: 'createdAt', order: 'desc' }],
  });

  const { data, isLoading, isFetching, refetch } = useAccountingDistributions(queryParams);

  const { mutateAsync: deleteAccountingDistribution, isPending: isDeleting } =
    useDeleteAccountingDistribution();

  // ---- Handlers ----
  const [openedInfoSheet, setOpenedInfoSheet] = React.useState(false);
  const handleInfoSheetChange = React.useCallback(
    (open: boolean) => {
      if (open === false) {
        setAccountingDistribution(undefined);
      }
      setOpenedInfoSheet(open);
    },
    [setAccountingDistribution, setOpenedInfoSheet]
  );

  const [openedFormSheet, setOpenedFormSheet] = React.useState(false);
  const handleFormSheetChange = React.useCallback(
    (open: boolean) => {
      if (open === false) {
        setAccountingDistribution(undefined);
      }
      setOpenedFormSheet(open);
    },
    [setAccountingDistribution, setOpenedFormSheet]
  );

  const [openedDeleteDialog, setOpenedDeleteDialog] = React.useState(false);
  const handleDelete = React.useCallback(async () => {
    if (!accountingDistribution?.id) return;
    await deleteAccountingDistribution({ params: { id: accountingDistribution.id } });
    setAccountingDistribution(undefined);
    setOpenedDeleteDialog(false);
  }, [
    accountingDistribution,
    setAccountingDistribution,
    setOpenedDeleteDialog,
    deleteAccountingDistribution,
  ]);

  const handleCreate = () => {
    handleFormSheetChange(true);
  };
  const handleRowOpen = React.useCallback((row: AccountingDistribution) => {
    setAccountingDistribution(row);
    setOpenedInfoSheet(true);
  }, []);
  const handleRowEdit = React.useCallback((row: AccountingDistribution) => {
    setAccountingDistribution(row);
    setOpenedFormSheet(true);
  }, []);
  const handleRowDelete = React.useCallback((row: AccountingDistribution) => {
    setAccountingDistribution(row);
    setOpenedDeleteDialog(true);
  }, []);

  const tableMeta = React.useMemo<TableMeta<AccountingDistribution>>(
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
        title="Distribuciones Contables"
        description="Administre los tipos de distribucion contable y sus lineas."
      />
      <PageContent>
        <DataTable
          columns={accountingDistributionColumns}
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
            <AccountingDistributionsToolbar
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

      <AccountingDistributionInfo
        accountingDistribution={accountingDistribution}
        opened={openedInfoSheet}
        onOpened={handleInfoSheetChange}
      />
      <AccountingDistributionForm
        accountingDistribution={accountingDistribution}
        opened={openedFormSheet}
        onOpened={handleFormSheetChange}
      />

      <AlertDialog open={openedDeleteDialog} onOpenChange={setOpenedDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Estas seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. Esto eliminara permanentemente la distribucion
              contable &quot;{accountingDistribution?.name}&quot; y todas sus lineas.
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
