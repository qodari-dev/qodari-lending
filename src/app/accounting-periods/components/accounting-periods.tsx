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
  useDeleteAccountingPeriod,
  useAccountingPeriods,
} from '@/hooks/queries/use-accounting-period-queries';
import { AccountingPeriod, AccountingPeriodSortField, MONTH_LABELS } from '@/schemas/accounting-period';
import { RowData, TableMeta } from '@tanstack/react-table';
import { accountingPeriodColumns } from './accounting-period-columns';
import { AccountingPeriodForm } from './accounting-period-form';
import { AccountingPeriodInfo } from './accounting-period-info';
import { AccountingPeriodsToolbar } from './accounting-period-toolbar';

declare module '@tanstack/table-core' {
  interface TableMeta<TData extends RowData> {
    onRowView?: (row: TData) => void;
    onRowEdit?: (row: TData) => void;
    onRowDelete?: (row: TData) => void;
  }
}

export function AccountingPeriods() {
  const [accountingPeriod, setAccountingPeriod] = React.useState<AccountingPeriod>();

  const {
    pageIndex,
    pageSize,
    sorting,
    searchValue,
    queryParams,
    handlePaginationChange,
    handleSortingChange,
    handleSearchChange,
  } = useDataTable<AccountingPeriodSortField, never>({
    defaultPageSize: 20,
    defaultIncludes: [],
    defaultSorting: [
      { field: 'year', order: 'desc' },
      { field: 'month', order: 'desc' },
    ],
  });

  const { data, isLoading, isFetching, refetch } = useAccountingPeriods(queryParams);

  const { mutateAsync: deleteAccountingPeriod, isPending: isDeleting } = useDeleteAccountingPeriod();

  // ---- Handlers ----
  const [openedInfoSheet, setOpenedInfoSheet] = React.useState(false);
  const handleInfoSheetChange = React.useCallback(
    (open: boolean) => {
      if (open === false) {
        setAccountingPeriod(undefined);
      }
      setOpenedInfoSheet(open);
    },
    [setAccountingPeriod, setOpenedInfoSheet]
  );

  const [openedFormSheet, setOpenedFormSheet] = React.useState(false);
  const handleFormSheetChange = React.useCallback(
    (open: boolean) => {
      if (open === false) {
        setAccountingPeriod(undefined);
      }
      setOpenedFormSheet(open);
    },
    [setAccountingPeriod, setOpenedFormSheet]
  );

  const [openedDeleteDialog, setOpenedDeleteDialog] = React.useState(false);
  const handleDelete = React.useCallback(async () => {
    if (!accountingPeriod?.id) return;
    await deleteAccountingPeriod({ params: { id: accountingPeriod.id } });
    setAccountingPeriod(undefined);
    setOpenedDeleteDialog(false);
  }, [accountingPeriod, setAccountingPeriod, setOpenedDeleteDialog, deleteAccountingPeriod]);

  const handleCreate = () => {
    handleFormSheetChange(true);
  };
  const handleRowOpen = React.useCallback((row: AccountingPeriod) => {
    setAccountingPeriod(row);
    setOpenedInfoSheet(true);
  }, []);
  const handleRowEdit = React.useCallback((row: AccountingPeriod) => {
    // No se puede editar si está cerrado
    if (row.isClosed) return;
    setAccountingPeriod(row);
    setOpenedFormSheet(true);
  }, []);
  const handleRowDelete = React.useCallback((row: AccountingPeriod) => {
    // No se puede eliminar si está cerrado
    if (row.isClosed) return;
    setAccountingPeriod(row);
    setOpenedDeleteDialog(true);
  }, []);

  const tableMeta = React.useMemo<TableMeta<AccountingPeriod>>(
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
        title="Periodos Contables"
        description="Administre los periodos contables (año/mes) para controlar operaciones."
      />
      <PageContent>
        <DataTable
          columns={accountingPeriodColumns}
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
            <AccountingPeriodsToolbar
              searchValue={searchValue}
              onSearchChange={handleSearchChange}
              onCreate={handleCreate}
              onRefresh={() => refetch()}
              isRefreshing={isFetching && !isLoading}
            />
          }
          emptyMessage="No hay periodos contables. Cree uno nuevo."
          meta={tableMeta}
        />
      </PageContent>

      <AccountingPeriodInfo
        accountingPeriod={accountingPeriod}
        opened={openedInfoSheet}
        onOpened={handleInfoSheetChange}
      />
      <AccountingPeriodForm
        accountingPeriod={accountingPeriod}
        opened={openedFormSheet}
        onOpened={handleFormSheetChange}
      />

      <AlertDialog open={openedDeleteDialog} onOpenChange={setOpenedDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el periodo contable
              &quot;{accountingPeriod?.year}-{MONTH_LABELS[accountingPeriod?.month ?? 1]}&quot;.
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
