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
  useDeleteRejectionReason,
  useRejectionReasons,
} from '@/hooks/queries/use-rejection-reason-queries';
import {
  RejectionReason,
  RejectionReasonInclude,
  RejectionReasonSortField,
} from '@/schemas/rejection-reason';
import { RowData, TableMeta } from '@tanstack/react-table';
import { rejectionReasonColumns } from './rejection-reason-columns';
import { RejectionReasonForm } from './rejection-reason-form';
import { RejectionReasonInfo } from './rejection-reason-info';
import { rejectionReasonExportConfig } from './rejection-reason-export-config';
import { RejectionReasonsToolbar } from './rejection-reason-toolbar';

declare module '@tanstack/table-core' {
  interface TableMeta<TData extends RowData> {
    onRowView?: (row: TData) => void;
    onRowEdit?: (row: TData) => void;
    onRowDelete?: (row: TData) => void;
  }
}

export function RejectionReasons() {
  const [rejectionReason, setRejectionReason] = React.useState<RejectionReason>();

  const {
    pageIndex,
    pageSize,
    sorting,
    searchValue,
    queryParams,
    handlePaginationChange,
    handleSortingChange,
    handleSearchChange,
  } = useDataTable<RejectionReasonSortField, RejectionReasonInclude>({
    defaultPageSize: 20,
    defaultIncludes: [],
    defaultSorting: [{ field: 'createdAt', order: 'desc' }],
  });

  const { data, isLoading, isFetching, refetch } = useRejectionReasons(queryParams);

  const { mutateAsync: deleteRejectionReason, isPending: isDeleting } = useDeleteRejectionReason();

  // ---- Handlers ----
  const [openedInfoSheet, setOpenedInfoSheet] = React.useState(false);
  const handleInfoSheetChange = React.useCallback(
    (open: boolean) => {
      if (open === false) {
        setRejectionReason(undefined);
      }
      setOpenedInfoSheet(open);
    },
    [setRejectionReason, setOpenedInfoSheet]
  );

  const [openedFormSheet, setOpenedFormSheet] = React.useState(false);
  const handleFormSheetChange = React.useCallback(
    (open: boolean) => {
      if (open === false) {
        setRejectionReason(undefined);
      }
      setOpenedFormSheet(open);
    },
    [setRejectionReason, setOpenedFormSheet]
  );

  const [openedDeleteDialog, setOpenedDeleteDialog] = React.useState(false);
  const handleDelete = React.useCallback(async () => {
    if (!rejectionReason?.id) return;
    await deleteRejectionReason({ params: { id: rejectionReason.id } });
    setRejectionReason(undefined);
    setOpenedDeleteDialog(false);
  }, [rejectionReason, setRejectionReason, setOpenedDeleteDialog, deleteRejectionReason]);

  const handleCreate = () => {
    handleFormSheetChange(true);
  };
  const handleRowOpen = React.useCallback((row: RejectionReason) => {
    setRejectionReason(row);
    setOpenedInfoSheet(true);
  }, []);
  const handleRowEdit = React.useCallback((row: RejectionReason) => {
    setRejectionReason(row);
    setOpenedFormSheet(true);
  }, []);
  const handleRowDelete = React.useCallback((row: RejectionReason) => {
    setRejectionReason(row);
    setOpenedDeleteDialog(true);
  }, []);
  const fetchAllData = React.useCallback(async () => {
    const res = await api.rejectionReason.list.query({
      query: { ...queryParams, page: 1, limit: 10000 },
    });
    return (res.body as { data: RejectionReason[] })?.data ?? [];
  }, [queryParams]);



  const tableMeta = React.useMemo<TableMeta<RejectionReason>>(
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
        title="Motivos de Rechazo"
        description="Administre los motivos de rechazo de solicitudes."
      />
      <PageContent>
        <DataTable
          columns={rejectionReasonColumns}
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
            <RejectionReasonsToolbar
              searchValue={searchValue}
              onSearchChange={handleSearchChange}
              onCreate={handleCreate}
              onRefresh={() => refetch()}
              isRefreshing={isFetching && !isLoading}
              exportActions={
                <ExportDropdown
                  config={rejectionReasonExportConfig}
                  fetchAllData={fetchAllData}
                />
              }
            />
          }
          emptyMessage="No hay información. Intente ajustar los filtros."
          meta={tableMeta}
        />
      </PageContent>

      <RejectionReasonInfo
        rejectionReason={rejectionReason}
        opened={openedInfoSheet}
        onOpened={handleInfoSheetChange}
      />
      <RejectionReasonForm
        rejectionReason={rejectionReason}
        opened={openedFormSheet}
        onOpened={handleFormSheetChange}
      />

      <AlertDialog open={openedDeleteDialog} onOpenChange={setOpenedDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el motivo de rechazo
              &quot;{rejectionReason?.name}&quot;.
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
