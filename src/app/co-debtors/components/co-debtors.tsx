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
  useDeleteCoDebtor,
  useCoDebtors,
  useCoDebtor,
} from '@/hooks/queries/use-co-debtor-queries';
import { CoDebtor, CoDebtorInclude, CoDebtorSortField } from '@/schemas/co-debtor';
import { RowData, TableMeta } from '@tanstack/react-table';
import { coDebtorColumns } from './co-debtor-columns';
import { CoDebtorForm } from './co-debtor-form';
import { CoDebtorInfo } from './co-debtor-info';
import { CoDebtorsToolbar } from './co-debtor-toolbar';

declare module '@tanstack/table-core' {
  interface TableMeta<TData extends RowData> {
    onRowView?: (row: TData) => void;
    onRowEdit?: (row: TData) => void;
    onRowDelete?: (row: TData) => void;
  }
}

export function CoDebtors() {
  const [coDebtor, setCoDebtor] = React.useState<CoDebtor>();
  const [selectedId, setSelectedId] = React.useState<number>();

  const {
    pageIndex,
    pageSize,
    sorting,
    searchValue,
    queryParams,
    handlePaginationChange,
    handleSortingChange,
    handleSearchChange,
  } = useDataTable<CoDebtorSortField, CoDebtorInclude>({
    defaultPageSize: 20,
    defaultIncludes: [],
    defaultSorting: [{ field: 'createdAt', order: 'desc' }],
  });

  const { data, isLoading, isFetching, refetch } = useCoDebtors(queryParams);

  // Query con include para obtener las solicitudes de credito
  const { data: coDebtorDetail } = useCoDebtor(selectedId ?? 0, {
    include: ['loanApplicationCoDebtors'],
    enabled: !!selectedId,
  });

  const { mutateAsync: deleteCoDebtor, isPending: isDeleting } = useDeleteCoDebtor();

  // ---- Handlers ----
  const [openedInfoSheet, setOpenedInfoSheet] = React.useState(false);
  const handleInfoSheetChange = React.useCallback(
    (open: boolean) => {
      if (open === false) {
        setCoDebtor(undefined);
        setSelectedId(undefined);
      }
      setOpenedInfoSheet(open);
    },
    [setCoDebtor, setOpenedInfoSheet]
  );

  const [openedFormSheet, setOpenedFormSheet] = React.useState(false);
  const handleFormSheetChange = React.useCallback(
    (open: boolean) => {
      if (open === false) {
        setCoDebtor(undefined);
      }
      setOpenedFormSheet(open);
    },
    [setCoDebtor, setOpenedFormSheet]
  );

  const [openedDeleteDialog, setOpenedDeleteDialog] = React.useState(false);
  const handleDelete = React.useCallback(async () => {
    if (!coDebtor?.id) return;
    await deleteCoDebtor({ params: { id: coDebtor.id } });
    setCoDebtor(undefined);
    setOpenedDeleteDialog(false);
  }, [coDebtor, setCoDebtor, setOpenedDeleteDialog, deleteCoDebtor]);

  const handleCreate = () => {
    handleFormSheetChange(true);
  };
  const handleRowOpen = React.useCallback((row: CoDebtor) => {
    setCoDebtor(row);
    setSelectedId(row.id);
    setOpenedInfoSheet(true);
  }, []);
  const handleRowEdit = React.useCallback((row: CoDebtor) => {
    setCoDebtor(row);
    setOpenedFormSheet(true);
  }, []);
  const handleRowDelete = React.useCallback((row: CoDebtor) => {
    setCoDebtor(row);
    setOpenedDeleteDialog(true);
  }, []);

  const tableMeta = React.useMemo<TableMeta<CoDebtor>>(
    () => ({
      onRowView: handleRowOpen,
      onRowDelete: handleRowDelete,
      onRowEdit: handleRowEdit,
    }),
    [handleRowOpen, handleRowDelete, handleRowEdit]
  );

  return (
    <>
      <PageHeader title="Codeudores" description="Administre los codeudores." />
      <PageContent>
        <DataTable
          columns={coDebtorColumns}
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
            <CoDebtorsToolbar
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

      <CoDebtorInfo
        coDebtor={coDebtorDetail?.body ?? coDebtor}
        opened={openedInfoSheet}
        onOpened={handleInfoSheetChange}
      />
      <CoDebtorForm coDebtor={coDebtor} opened={openedFormSheet} onOpened={handleFormSheetChange} />

      <AlertDialog open={openedDeleteDialog} onOpenChange={setOpenedDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estas seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. Esto eliminara permanentemente el codeudor &quot;
              {coDebtor?.documentType} {coDebtor?.documentNumber}&quot;.
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
