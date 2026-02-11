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
  useAgingProfiles,
  useDeactivateAgingProfile,
  useDeleteAgingProfile,
} from '@/hooks/queries/use-aging-profile-queries';
import { AgingProfile, AgingProfileInclude, AgingProfileSortField } from '@/schemas/aging-profile';
import { RowData, TableMeta } from '@tanstack/react-table';
import { agingProfileColumns } from './aging-profile-columns';
import { AgingProfileForm } from './aging-profile-form';
import { AgingProfileInfo } from './aging-profile-info';
import { AgingProfilesToolbar } from './aging-profile-toolbar';

declare module '@tanstack/table-core' {
  interface TableMeta<TData extends RowData> {
    onRowView?: (row: TData) => void;
    onRowEdit?: (row: TData) => void;
    onRowDelete?: (row: TData) => void;
    onRowDeactivate?: (row: TData) => void;
  }
}

export function AgingProfiles() {
  const [agingProfile, setAgingProfile] = React.useState<AgingProfile>();

  const {
    pageIndex,
    pageSize,
    sorting,
    searchValue,
    queryParams,
    handlePaginationChange,
    handleSortingChange,
    handleSearchChange,
  } = useDataTable<AgingProfileSortField, AgingProfileInclude>({
    defaultPageSize: 20,
    defaultIncludes: ['agingBuckets'],
    defaultSorting: [{ field: 'createdAt', order: 'desc' }],
  });

  const { data, isLoading, isFetching, refetch } = useAgingProfiles(queryParams);

  const { mutateAsync: deleteAgingProfile, isPending: isDeleting } = useDeleteAgingProfile();
  const { mutateAsync: deactivateAgingProfile, isPending: isDeactivating } =
    useDeactivateAgingProfile();

  // ---- Handlers ----
  const [openedInfoSheet, setOpenedInfoSheet] = React.useState(false);
  const handleInfoSheetChange = React.useCallback(
    (open: boolean) => {
      if (open === false) {
        setAgingProfile(undefined);
      }
      setOpenedInfoSheet(open);
    },
    [setAgingProfile, setOpenedInfoSheet]
  );

  const [openedFormSheet, setOpenedFormSheet] = React.useState(false);
  const handleFormSheetChange = React.useCallback(
    (open: boolean) => {
      if (open === false) {
        setAgingProfile(undefined);
      }
      setOpenedFormSheet(open);
    },
    [setAgingProfile, setOpenedFormSheet]
  );

  const [openedDeleteDialog, setOpenedDeleteDialog] = React.useState(false);
  const handleDelete = React.useCallback(async () => {
    if (!agingProfile?.id) return;
    await deleteAgingProfile({ params: { id: agingProfile.id } });
    setAgingProfile(undefined);
    setOpenedDeleteDialog(false);
  }, [agingProfile, setAgingProfile, setOpenedDeleteDialog, deleteAgingProfile]);

  const [openedDeactivateDialog, setOpenedDeactivateDialog] = React.useState(false);
  const handleDeactivate = React.useCallback(async () => {
    if (!agingProfile?.id) return;
    await deactivateAgingProfile({ params: { id: agingProfile.id } });
    setAgingProfile(undefined);
    setOpenedDeactivateDialog(false);
  }, [agingProfile, setAgingProfile, setOpenedDeactivateDialog, deactivateAgingProfile]);

  const handleCreate = () => {
    handleFormSheetChange(true);
  };
  const handleRowOpen = React.useCallback((row: AgingProfile) => {
    setAgingProfile(row);
    setOpenedInfoSheet(true);
  }, []);
  const handleRowEdit = React.useCallback((row: AgingProfile) => {
    setAgingProfile(row);
    setOpenedFormSheet(true);
  }, []);
  const handleRowDelete = React.useCallback((row: AgingProfile) => {
    setAgingProfile(row);
    setOpenedDeleteDialog(true);
  }, []);
  const handleRowDeactivate = React.useCallback((row: AgingProfile) => {
    setAgingProfile(row);
    setOpenedDeactivateDialog(true);
  }, []);

  const tableMeta = React.useMemo<TableMeta<AgingProfile>>(
    () => ({
      onRowView: handleRowOpen,
      onRowDelete: handleRowDelete,
      onRowEdit: handleRowEdit,
      onRowDeactivate: handleRowDeactivate,
    }),
    [handleRowOpen, handleRowDelete, handleRowEdit, handleRowDeactivate]
  );

  return (
    <>
      <PageHeader
        title="Perfiles de Aging"
        description="Administre los perfiles de aging y sus buckets."
      />
      <PageContent>
        <DataTable
          columns={agingProfileColumns}
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
            <AgingProfilesToolbar
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

      <AgingProfileInfo
        agingProfile={agingProfile}
        opened={openedInfoSheet}
        onOpened={handleInfoSheetChange}
      />
      <AgingProfileForm
        agingProfile={agingProfile}
        opened={openedFormSheet}
        onOpened={handleFormSheetChange}
      />

      <AlertDialog open={openedDeleteDialog} onOpenChange={setOpenedDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Estas seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. Esto eliminara permanentemente el perfil de aging
              &quot;{agingProfile?.name}&quot; y todos sus buckets.
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

      <AlertDialog open={openedDeactivateDialog} onOpenChange={setOpenedDeactivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Estas seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion inactivara el perfil de aging &quot;{agingProfile?.name}&quot;.
              Para activar otro, crea uno nuevo con estado activo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOpenedDeactivateDialog(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction disabled={isDeactivating} onClick={handleDeactivate}>
              {isDeactivating && <Spinner />}
              Inactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
