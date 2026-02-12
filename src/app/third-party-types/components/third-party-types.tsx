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
import { useDeleteThirdPartyType, useThirdPartyTypes } from '@/hooks/queries/use-third-party-type-queries';
import { ThirdPartyType, ThirdPartyTypeInclude, ThirdPartyTypeSortField } from '@/schemas/third-party-type';
import { RowData, TableMeta } from '@tanstack/react-table';
import { thirdPartyTypeColumns } from './third-party-type-columns';
import { ThirdPartyTypeForm } from './third-party-type-form';
import { ThirdPartyTypeInfo } from './third-party-type-info';
import { thirdPartyTypeExportConfig } from './third-party-type-export-config';
import { ThirdPartyTypesToolbar } from './third-party-type-toolbar';

declare module '@tanstack/table-core' {
  interface TableMeta<TData extends RowData> {
    onRowView?: (row: TData) => void;
    onRowEdit?: (row: TData) => void;
    onRowDelete?: (row: TData) => void;
  }
}

export function ThirdPartyTypes() {
  const [thirdPartyType, setThirdPartyType] = React.useState<ThirdPartyType>();

  const {
    pageIndex,
    pageSize,
    sorting,
    searchValue,
    queryParams,
    handlePaginationChange,
    handleSortingChange,
    handleSearchChange,
  } = useDataTable<ThirdPartyTypeSortField, ThirdPartyTypeInclude>({
    defaultPageSize: 20,
    defaultIncludes: [],
    defaultSorting: [{ field: 'createdAt', order: 'desc' }],
  });

  const { data, isLoading, isFetching, refetch } = useThirdPartyTypes(queryParams);

  const { mutateAsync: deleteThirdPartyType, isPending: isDeleting } = useDeleteThirdPartyType();

  // ---- Handlers ----
  const [openedInfoSheet, setOpenedInfoSheet] = React.useState(false);
  const handleInfoSheetChange = React.useCallback(
    (open: boolean) => {
      if (open === false) {
        setThirdPartyType(undefined);
      }
      setOpenedInfoSheet(open);
    },
    [setThirdPartyType, setOpenedInfoSheet]
  );

  const [openedFormSheet, setOpenedFormSheet] = React.useState(false);
  const handleFormSheetChange = React.useCallback(
    (open: boolean) => {
      if (open === false) {
        setThirdPartyType(undefined);
      }
      setOpenedFormSheet(open);
    },
    [setThirdPartyType, setOpenedFormSheet]
  );

  const [openedDeleteDialog, setOpenedDeleteDialog] = React.useState(false);
  const handleDelete = React.useCallback(async () => {
    if (!thirdPartyType?.id) return;
    await deleteThirdPartyType({ params: { id: thirdPartyType.id } });
    setThirdPartyType(undefined);
    setOpenedDeleteDialog(false);
  }, [thirdPartyType, setThirdPartyType, setOpenedDeleteDialog, deleteThirdPartyType]);

  const handleCreate = () => {
    handleFormSheetChange(true);
  };
  const handleRowOpen = React.useCallback((row: ThirdPartyType) => {
    setThirdPartyType(row);
    setOpenedInfoSheet(true);
  }, []);
  const handleRowEdit = React.useCallback((row: ThirdPartyType) => {
    setThirdPartyType(row);
    setOpenedFormSheet(true);
  }, []);
  const handleRowDelete = React.useCallback((row: ThirdPartyType) => {
    setThirdPartyType(row);
    setOpenedDeleteDialog(true);
  }, []);
  const fetchAllData = React.useCallback(async () => {
    const res = await api.thirdPartyType.list.query({
      query: { ...queryParams, page: 1, limit: 10000 },
    });
    return (res.body as { data: ThirdPartyType[] })?.data ?? [];
  }, [queryParams]);



  const tableMeta = React.useMemo<TableMeta<ThirdPartyType>>(
    () => ({
      onRowView: handleRowOpen,
      onRowDelete: handleRowDelete,
      onRowEdit: handleRowEdit,
    }),
    [handleRowOpen, handleRowDelete, handleRowEdit]
  );

  return (
    <>
      <PageHeader title="Tipos de Terceros" description="Administre los tipos de terceros." />
      <PageContent>
        <DataTable
          columns={thirdPartyTypeColumns}
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
            <ThirdPartyTypesToolbar
              searchValue={searchValue}
              onSearchChange={handleSearchChange}
              onCreate={handleCreate}
              onRefresh={() => refetch()}
              isRefreshing={isFetching && !isLoading}
              exportActions={
                <ExportDropdown
                  config={thirdPartyTypeExportConfig}
                  fetchAllData={fetchAllData}
                />
              }
            />
          }
          emptyMessage="No hay informacion. Intente ajustar los filtros."
          meta={tableMeta}
        />
      </PageContent>

      <ThirdPartyTypeInfo
        thirdPartyType={thirdPartyType}
        opened={openedInfoSheet}
        onOpened={handleInfoSheetChange}
      />
      <ThirdPartyTypeForm
        thirdPartyType={thirdPartyType}
        opened={openedFormSheet}
        onOpened={handleFormSheetChange}
      />

      <AlertDialog open={openedDeleteDialog} onOpenChange={setOpenedDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estas seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. Esto eliminara permanentemente el tipo de tercero
              &quot;{thirdPartyType?.name}&quot;.
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
