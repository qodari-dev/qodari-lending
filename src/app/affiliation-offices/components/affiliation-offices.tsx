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
  useAffiliationOffices,
  useDeleteAffiliationOffice,
} from '@/hooks/queries/use-affiliation-office-queries';
import {
  AffiliationOffice,
  AffiliationOfficeInclude,
  AffiliationOfficeSortField,
} from '@/schemas/affiliation-office';
import { RowData, TableMeta } from '@tanstack/react-table';
import { affiliationOfficeColumns } from './affiliation-office-columns';
import { AffiliationOfficeForm } from './affiliation-office-form';
import { AffiliationOfficeInfo } from './affiliation-office-info';
import { affiliationOfficeExportConfig } from './affiliation-office-export-config';
import { AffiliationOfficesToolbar } from './affiliation-office-toolbar';

declare module '@tanstack/table-core' {
  interface TableMeta<TData extends RowData> {
    onRowView?: (row: TData) => void;
    onRowEdit?: (row: TData) => void;
    onRowDelete?: (row: TData) => void;
  }
}

export function AffiliationOffices() {
  const [affiliationOffice, setAffiliationOffice] = React.useState<AffiliationOffice>();

  const {
    pageIndex,
    pageSize,
    sorting,
    searchValue,
    queryParams,
    handlePaginationChange,
    handleSortingChange,
    handleSearchChange,
  } = useDataTable<AffiliationOfficeSortField, AffiliationOfficeInclude>({
    defaultPageSize: 20,
    defaultIncludes: ['city', 'costCenter', 'userAffiliationOffices'],
    defaultSorting: [{ field: 'createdAt', order: 'desc' }],
  });

  const { data, isLoading, isFetching, refetch } = useAffiliationOffices(queryParams);

  const { mutateAsync: deleteAffiliationOffice, isPending: isDeleting } =
    useDeleteAffiliationOffice();

  const [openedInfoSheet, setOpenedInfoSheet] = React.useState(false);
  const handleInfoSheetChange = React.useCallback(
    (open: boolean) => {
      if (open === false) {
        setAffiliationOffice(undefined);
      }
      setOpenedInfoSheet(open);
    },
    [setAffiliationOffice, setOpenedInfoSheet]
  );

  const [openedFormSheet, setOpenedFormSheet] = React.useState(false);
  const handleFormSheetChange = React.useCallback(
    (open: boolean) => {
      if (open === false) {
        setAffiliationOffice(undefined);
      }
      setOpenedFormSheet(open);
    },
    [setAffiliationOffice, setOpenedFormSheet]
  );

  const [openedDeleteDialog, setOpenedDeleteDialog] = React.useState(false);
  const handleDelete = React.useCallback(async () => {
    if (!affiliationOffice?.id) return;
    await deleteAffiliationOffice({ params: { id: affiliationOffice.id } });
    setAffiliationOffice(undefined);
    setOpenedDeleteDialog(false);
  }, [affiliationOffice, deleteAffiliationOffice]);

  const handleCreate = () => {
    handleFormSheetChange(true);
  };

  const handleRowOpen = React.useCallback((row: AffiliationOffice) => {
    setAffiliationOffice(row);
    setOpenedInfoSheet(true);
  }, []);

  const handleRowEdit = React.useCallback((row: AffiliationOffice) => {
    setAffiliationOffice(row);
    setOpenedFormSheet(true);
  }, []);

  const handleRowDelete = React.useCallback((row: AffiliationOffice) => {
    setAffiliationOffice(row);
    setOpenedDeleteDialog(true);
  }, []);
  const fetchAllData = React.useCallback(async () => {
    const res = await api.affiliationOffice.list.query({
      query: { ...queryParams, page: 1, limit: 10000 },
    });
    return (res.body as { data: AffiliationOffice[] })?.data ?? [];
  }, [queryParams]);



  const tableMeta = React.useMemo<TableMeta<AffiliationOffice>>(
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
        title="Oficinas de Afiliacion"
        description="Administre oficinas de afiliacion y usuarios asignados."
      />
      <PageContent>
        <DataTable
          columns={affiliationOfficeColumns}
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
            <AffiliationOfficesToolbar
              searchValue={searchValue}
              onSearchChange={handleSearchChange}
              onCreate={handleCreate}
              onRefresh={() => refetch()}
              isRefreshing={isFetching && !isLoading}
              exportActions={
                <ExportDropdown
                  config={affiliationOfficeExportConfig}
                  fetchAllData={fetchAllData}
                />
              }
            />
          }
          emptyMessage="No hay informacion. Intente ajustar los filtros."
          meta={tableMeta}
        />
      </PageContent>

      <AffiliationOfficeInfo
        affiliationOffice={affiliationOffice}
        opened={openedInfoSheet}
        onOpened={handleInfoSheetChange}
      />
      <AffiliationOfficeForm
        affiliationOffice={affiliationOffice}
        opened={openedFormSheet}
        onOpened={handleFormSheetChange}
      />

      <AlertDialog open={openedDeleteDialog} onOpenChange={setOpenedDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Estas seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. Esto eliminara permanentemente la oficina
              &quot;{affiliationOffice?.name}&quot; y su configuracion de usuarios.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOpenedDeleteDialog(false)}>Cancelar</AlertDialogCancel>
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
