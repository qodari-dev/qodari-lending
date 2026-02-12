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
  useDeleteRepaymentMethod,
  useRepaymentMethods,
} from '@/hooks/queries/use-repayment-method-queries';
import {
  RepaymentMethod,
  RepaymentMethodInclude,
  RepaymentMethodSortField,
} from '@/schemas/repayment-method';
import { RowData, TableMeta } from '@tanstack/react-table';
import { repaymentMethodColumns } from './repayment-method-columns';
import { RepaymentMethodForm } from './repayment-method-form';
import { RepaymentMethodInfo } from './repayment-method-info';
import { repaymentMethodExportConfig } from './repayment-method-export-config';
import { RepaymentMethodsToolbar } from './repayment-method-toolbar';

declare module '@tanstack/table-core' {
  interface TableMeta<TData extends RowData> {
    onRowView?: (row: TData) => void;
    onRowEdit?: (row: TData) => void;
    onRowDelete?: (row: TData) => void;
  }
}

export function RepaymentMethods() {
  const [repaymentMethod, setRepaymentMethod] = React.useState<RepaymentMethod>();

  const {
    pageIndex,
    pageSize,
    sorting,
    searchValue,
    queryParams,
    handlePaginationChange,
    handleSortingChange,
    handleSearchChange,
  } = useDataTable<RepaymentMethodSortField, RepaymentMethodInclude>({
    defaultPageSize: 20,
    defaultIncludes: [],
    defaultSorting: [{ field: 'createdAt', order: 'desc' }],
  });

  const { data, isLoading, isFetching, refetch } = useRepaymentMethods(queryParams);

  const { mutateAsync: deleteRepaymentMethod, isPending: isDeleting } = useDeleteRepaymentMethod();

  // ---- Handlers ----
  const [openedInfoSheet, setOpenedInfoSheet] = React.useState(false);
  const handleInfoSheetChange = React.useCallback(
    (open: boolean) => {
      if (open === false) {
        setRepaymentMethod(undefined);
      }
      setOpenedInfoSheet(open);
    },
    [setRepaymentMethod, setOpenedInfoSheet]
  );

  const [openedFormSheet, setOpenedFormSheet] = React.useState(false);
  const handleFormSheetChange = React.useCallback(
    (open: boolean) => {
      if (open === false) {
        setRepaymentMethod(undefined);
      }
      setOpenedFormSheet(open);
    },
    [setRepaymentMethod, setOpenedFormSheet]
  );

  const [openedDeleteDialog, setOpenedDeleteDialog] = React.useState(false);
  const handleDelete = React.useCallback(async () => {
    if (!repaymentMethod?.id) return;
    await deleteRepaymentMethod({ params: { id: repaymentMethod.id } });
    setRepaymentMethod(undefined);
    setOpenedDeleteDialog(false);
  }, [repaymentMethod, setRepaymentMethod, setOpenedDeleteDialog, deleteRepaymentMethod]);

  const handleCreate = () => {
    handleFormSheetChange(true);
  };
  const handleRowOpen = React.useCallback((row: RepaymentMethod) => {
    setRepaymentMethod(row);
    setOpenedInfoSheet(true);
  }, []);
  const handleRowEdit = React.useCallback((row: RepaymentMethod) => {
    setRepaymentMethod(row);
    setOpenedFormSheet(true);
  }, []);
  const handleRowDelete = React.useCallback((row: RepaymentMethod) => {
    setRepaymentMethod(row);
    setOpenedDeleteDialog(true);
  }, []);
  const fetchAllData = React.useCallback(async () => {
    const res = await api.repaymentMethod.list.query({
      query: { ...queryParams, page: 1, limit: 10000 },
    });
    return (res.body as { data: RepaymentMethod[] })?.data ?? [];
  }, [queryParams]);



  const tableMeta = React.useMemo<TableMeta<RepaymentMethod>>(
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
        title="Formas de Pago"
        description="Administre los mecanismos de recaudo de créditos."
      />
      <PageContent>
        <DataTable
          columns={repaymentMethodColumns}
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
            <RepaymentMethodsToolbar
              searchValue={searchValue}
              onSearchChange={handleSearchChange}
              onCreate={handleCreate}
              onRefresh={() => refetch()}
              isRefreshing={isFetching && !isLoading}
              exportActions={
                <ExportDropdown
                  config={repaymentMethodExportConfig}
                  fetchAllData={fetchAllData}
                />
              }
            />
          }
          emptyMessage="No hay información. Intente ajustar los filtros."
          meta={tableMeta}
        />
      </PageContent>

      <RepaymentMethodInfo
        repaymentMethod={repaymentMethod}
        opened={openedInfoSheet}
        onOpened={handleInfoSheetChange}
      />
      <RepaymentMethodForm
        repaymentMethod={repaymentMethod}
        opened={openedFormSheet}
        onOpened={handleFormSheetChange}
      />

      <AlertDialog open={openedDeleteDialog} onOpenChange={setOpenedDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente la forma de pago
              &quot;{repaymentMethod?.name}&quot;.
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
