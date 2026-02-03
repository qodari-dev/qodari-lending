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
import { useDeleteThirdParty, useThirdParties, useThirdParty } from '@/hooks/queries/use-third-party-queries';
import { ThirdParty, ThirdPartyInclude, ThirdPartySortField } from '@/schemas/third-party';
import { RowData, TableMeta } from '@tanstack/react-table';
import { thirdPartyColumns } from './third-party-columns';
import { ThirdPartyForm } from './third-party-form';
import { ThirdPartyInfo } from './third-party-info';
import { ThirdPartiesToolbar } from './third-party-toolbar';

declare module '@tanstack/table-core' {
  interface TableMeta<TData extends RowData> {
    onRowView?: (row: TData) => void;
    onRowEdit?: (row: TData) => void;
    onRowDelete?: (row: TData) => void;
  }
}

export function ThirdParties() {
  const [thirdParty, setThirdParty] = React.useState<ThirdParty>();
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
  } = useDataTable<ThirdPartySortField, ThirdPartyInclude>({
    defaultPageSize: 20,
    defaultIncludes: ['thirdPartyType'],
    defaultSorting: [{ field: 'createdAt', order: 'desc' }],
  });

  const { data, isLoading, isFetching, refetch } = useThirdParties(queryParams);

  // Query con include para obtener las solicitudes de credito y creditos
  const { data: thirdPartyDetail } = useThirdParty(selectedId ?? 0, {
    include: ['thirdPartyType', 'loanApplications', 'loans'],
    enabled: !!selectedId,
  });

  const { mutateAsync: deleteThirdParty, isPending: isDeleting } = useDeleteThirdParty();

  // ---- Handlers ----
  const [openedInfoSheet, setOpenedInfoSheet] = React.useState(false);
  const handleInfoSheetChange = React.useCallback(
    (open: boolean) => {
      if (open === false) {
        setThirdParty(undefined);
        setSelectedId(undefined);
      }
      setOpenedInfoSheet(open);
    },
    [setThirdParty, setOpenedInfoSheet]
  );

  const [openedFormSheet, setOpenedFormSheet] = React.useState(false);
  const handleFormSheetChange = React.useCallback(
    (open: boolean) => {
      if (open === false) {
        setThirdParty(undefined);
      }
      setOpenedFormSheet(open);
    },
    [setThirdParty, setOpenedFormSheet]
  );

  const [openedDeleteDialog, setOpenedDeleteDialog] = React.useState(false);
  const handleDelete = React.useCallback(async () => {
    if (!thirdParty?.id) return;
    await deleteThirdParty({ params: { id: thirdParty.id } });
    setThirdParty(undefined);
    setOpenedDeleteDialog(false);
  }, [thirdParty, setThirdParty, setOpenedDeleteDialog, deleteThirdParty]);

  const handleCreate = () => {
    handleFormSheetChange(true);
  };
  const handleRowOpen = React.useCallback((row: ThirdParty) => {
    setThirdParty(row);
    setSelectedId(row.id);
    setOpenedInfoSheet(true);
  }, []);
  const handleRowEdit = React.useCallback((row: ThirdParty) => {
    setThirdParty(row);
    setOpenedFormSheet(true);
  }, []);
  const handleRowDelete = React.useCallback((row: ThirdParty) => {
    setThirdParty(row);
    setOpenedDeleteDialog(true);
  }, []);

  const tableMeta = React.useMemo<TableMeta<ThirdParty>>(
    () => ({
      onRowView: handleRowOpen,
      onRowDelete: handleRowDelete,
      onRowEdit: handleRowEdit,
    }),
    [handleRowOpen, handleRowDelete, handleRowEdit]
  );

  // Get display name for the third party
  const getThirdPartyDisplayName = (tp: ThirdParty | undefined) => {
    if (!tp) return '';
    if (tp.personType === 'NATURAL') {
      return `${tp.firstName ?? ''} ${tp.firstLastName ?? ''}`.trim();
    }
    return tp.businessName ?? '';
  };

  return (
    <>
      <PageHeader title="Terceros" description="Administre los terceros del sistema." />
      <PageContent>
        <DataTable
          columns={thirdPartyColumns}
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
            <ThirdPartiesToolbar
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

      <ThirdPartyInfo
        thirdParty={thirdPartyDetail?.body ?? thirdParty}
        opened={openedInfoSheet}
        onOpened={handleInfoSheetChange}
      />
      <ThirdPartyForm
        thirdParty={thirdParty}
        opened={openedFormSheet}
        onOpened={handleFormSheetChange}
      />

      <AlertDialog open={openedDeleteDialog} onOpenChange={setOpenedDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estas seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. Esto eliminara permanentemente el tercero
              &quot;{thirdParty?.documentType} {thirdParty?.documentNumber} - {getThirdPartyDisplayName(thirdParty)}&quot;.
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
