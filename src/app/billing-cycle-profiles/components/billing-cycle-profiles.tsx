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
  useBillingCycleProfiles,
  useDeleteBillingCycleProfile,
} from '@/hooks/queries/use-billing-cycle-profile-queries';
import {
  BillingCycleProfile,
  BillingCycleProfileInclude,
  BillingCycleProfileSortField,
} from '@/schemas/billing-cycle-profile';
import { RowData, TableMeta } from '@tanstack/react-table';
import React from 'react';
import { billingCycleProfileColumns } from './billing-cycle-profile-columns';
import { BillingCycleProfileForm } from './billing-cycle-profile-form';
import { BillingCycleProfileInfo } from './billing-cycle-profile-info';
import { BillingCycleProfilesToolbar } from './billing-cycle-profile-toolbar';

declare module '@tanstack/table-core' {
  interface TableMeta<TData extends RowData> {
    onRowView?: (row: TData) => void;
    onRowEdit?: (row: TData) => void;
    onRowDelete?: (row: TData) => void;
  }
}

export function BillingCycleProfiles() {
  const [billingCycleProfile, setBillingCycleProfile] = React.useState<BillingCycleProfile>();

  const {
    pageIndex,
    pageSize,
    sorting,
    searchValue,
    queryParams,
    handlePaginationChange,
    handleSortingChange,
    handleSearchChange,
  } = useDataTable<BillingCycleProfileSortField, BillingCycleProfileInclude>({
    defaultPageSize: 20,
    defaultIncludes: ['creditProduct', 'agreement', 'billingCycleProfileCycles'],
    defaultSorting: [{ field: 'createdAt', order: 'desc' }],
  });

  const { data, isLoading, isFetching, refetch } = useBillingCycleProfiles(queryParams);

  const { mutateAsync: deleteBillingCycleProfile, isPending: isDeleting } =
    useDeleteBillingCycleProfile();

  const [openedInfoSheet, setOpenedInfoSheet] = React.useState(false);
  const handleInfoSheetChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        setBillingCycleProfile(undefined);
      }
      setOpenedInfoSheet(open);
    },
    [setBillingCycleProfile, setOpenedInfoSheet]
  );

  const [openedFormSheet, setOpenedFormSheet] = React.useState(false);
  const handleFormSheetChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        setBillingCycleProfile(undefined);
      }
      setOpenedFormSheet(open);
    },
    [setBillingCycleProfile, setOpenedFormSheet]
  );

  const [openedDeleteDialog, setOpenedDeleteDialog] = React.useState(false);
  const handleDelete = React.useCallback(async () => {
    if (!billingCycleProfile?.id) return;
    await deleteBillingCycleProfile({ params: { id: billingCycleProfile.id } });
    setBillingCycleProfile(undefined);
    setOpenedDeleteDialog(false);
  }, [billingCycleProfile, setBillingCycleProfile, setOpenedDeleteDialog, deleteBillingCycleProfile]);

  const handleCreate = () => {
    handleFormSheetChange(true);
  };

  const handleRowOpen = React.useCallback((row: BillingCycleProfile) => {
    setBillingCycleProfile(row);
    setOpenedInfoSheet(true);
  }, []);

  const handleRowEdit = React.useCallback((row: BillingCycleProfile) => {
    setBillingCycleProfile(row);
    setOpenedFormSheet(true);
  }, []);

  const handleRowDelete = React.useCallback((row: BillingCycleProfile) => {
    setBillingCycleProfile(row);
    setOpenedDeleteDialog(true);
  }, []);

  const tableMeta = React.useMemo<TableMeta<BillingCycleProfile>>(
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
        title="Perfiles de Facturacion"
        description="Configure ciclos de facturacion por producto y convenio."
      />
      <PageContent>
        <DataTable
          columns={billingCycleProfileColumns}
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
            <BillingCycleProfilesToolbar
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

      <BillingCycleProfileInfo
        billingCycleProfile={billingCycleProfile}
        opened={openedInfoSheet}
        onOpened={handleInfoSheetChange}
      />
      <BillingCycleProfileForm
        billingCycleProfile={billingCycleProfile}
        opened={openedFormSheet}
        onOpened={handleFormSheetChange}
      />

      <AlertDialog open={openedDeleteDialog} onOpenChange={setOpenedDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Estas seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. Esto eliminara permanentemente el perfil
              &quot;{billingCycleProfile?.name}&quot; y sus ciclos asociados.
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
