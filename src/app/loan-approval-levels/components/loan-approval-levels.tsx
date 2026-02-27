'use client';

import { DataTable, useDataTable } from '@/components/data-table';
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
  useDeleteLoanApprovalLevel,
  useLoanApprovalLevels,
} from '@/hooks/queries/use-loan-approval-level-queries';
import {
  LoanApprovalLevel,
  LoanApprovalLevelInclude,
  LoanApprovalLevelSortField,
} from '@/schemas/loan-approval-level';
import { RowData, TableMeta } from '@tanstack/react-table';
import React from 'react';
import { loanApprovalLevelColumns } from './loan-approval-level-columns';
import { LoanApprovalLevelForm } from './loan-approval-level-form';
import { LoanApprovalLevelInfo } from './loan-approval-level-info';
import { LoanApprovalLevelToolbar } from './loan-approval-level-toolbar';

declare module '@tanstack/table-core' {
  interface TableMeta<TData extends RowData> {
    onRowView?: (row: TData) => void;
    onRowEdit?: (row: TData) => void;
    onRowDelete?: (row: TData) => void;
  }
}

export function LoanApprovalLevels() {
  const [loanApprovalLevel, setLoanApprovalLevel] = React.useState<LoanApprovalLevel>();

  const {
    pageIndex,
    pageSize,
    sorting,
    searchValue,
    queryParams,
    handlePaginationChange,
    handleSortingChange,
    handleSearchChange,
  } = useDataTable<LoanApprovalLevelSortField, LoanApprovalLevelInclude>({
    defaultPageSize: 20,
    defaultIncludes: ['users'],
    defaultSorting: [{ field: 'levelOrder', order: 'asc' }],
  });

  const { data, isLoading, isFetching, refetch } = useLoanApprovalLevels(queryParams);
  const { mutateAsync: deleteLoanApprovalLevel, isPending: isDeleting } =
    useDeleteLoanApprovalLevel();

  const [openedInfoSheet, setOpenedInfoSheet] = React.useState(false);
  const handleInfoSheetChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        setLoanApprovalLevel(undefined);
      }
      setOpenedInfoSheet(open);
    },
    [setLoanApprovalLevel]
  );

  const [openedFormSheet, setOpenedFormSheet] = React.useState(false);
  const handleFormSheetChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        setLoanApprovalLevel(undefined);
      }
      setOpenedFormSheet(open);
    },
    [setLoanApprovalLevel]
  );

  const [openedDeleteDialog, setOpenedDeleteDialog] = React.useState(false);

  const handleCreate = React.useCallback(() => {
    setLoanApprovalLevel(undefined);
    setOpenedFormSheet(true);
  }, []);

  const handleRowOpen = React.useCallback((row: LoanApprovalLevel) => {
    setLoanApprovalLevel(row);
    setOpenedInfoSheet(true);
  }, []);

  const handleRowEdit = React.useCallback((row: LoanApprovalLevel) => {
    setLoanApprovalLevel(row);
    setOpenedFormSheet(true);
  }, []);

  const handleRowDelete = React.useCallback((row: LoanApprovalLevel) => {
    setLoanApprovalLevel(row);
    setOpenedDeleteDialog(true);
  }, []);

  const handleDelete = React.useCallback(async () => {
    if (!loanApprovalLevel?.id) return;

    await deleteLoanApprovalLevel({ params: { id: loanApprovalLevel.id } });
    setLoanApprovalLevel(undefined);
    setOpenedDeleteDialog(false);
  }, [deleteLoanApprovalLevel, loanApprovalLevel]);

  const tableMeta = React.useMemo<TableMeta<LoanApprovalLevel>>(
    () => ({
      onRowView: handleRowOpen,
      onRowEdit: handleRowEdit,
      onRowDelete: handleRowDelete,
    }),
    [handleRowOpen, handleRowEdit, handleRowDelete]
  );

  return (
    <>
      <PageHeader
        title="Niveles de aprobacion"
        description="Defina niveles, topes de monto y usuarios para el flujo de aprobacion de solicitudes."
      />

      <PageContent>
        <DataTable
          columns={loanApprovalLevelColumns}
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
            <LoanApprovalLevelToolbar
              searchValue={searchValue}
              onSearchChange={handleSearchChange}
              onCreate={handleCreate}
              onRefresh={() => refetch()}
              isRefreshing={isFetching && !isLoading}
            />
          }
          emptyMessage="No hay niveles de aprobacion configurados."
          meta={tableMeta}
        />
      </PageContent>

      <LoanApprovalLevelInfo
        loanApprovalLevel={loanApprovalLevel}
        opened={openedInfoSheet}
        onOpened={handleInfoSheetChange}
      />
      <LoanApprovalLevelForm
        loanApprovalLevel={loanApprovalLevel}
        opened={openedFormSheet}
        onOpened={handleFormSheetChange}
      />

      <AlertDialog open={openedDeleteDialog} onOpenChange={setOpenedDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Esta seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. Se eliminara el nivel
              &quot;{loanApprovalLevel?.name}&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOpenedDeleteDialog(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction disabled={isDeleting} onClick={handleDelete}>
              {isDeleting ? <Spinner /> : null}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
