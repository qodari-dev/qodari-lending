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
  useDeleteIdentificationType,
  useIdentificationTypes,
} from '@/hooks/queries/use-identification-type-queries';
import {
  IdentificationType,
  IdentificationTypeInclude,
  IdentificationTypeSortField,
} from '@/schemas/identification-type';
import { RowData, TableMeta } from '@tanstack/react-table';
import { identificationTypeColumns } from './identification-type-columns';
import { IdentificationTypeForm } from './identification-type-form';
import { IdentificationTypeInfo } from './identification-type-info';
import { identificationTypeExportConfig } from './identification-type-export-config';
import { IdentificationTypesToolbar } from './identification-type-toolbar';

declare module '@tanstack/table-core' {
  interface TableMeta<TData extends RowData> {
    onRowView?: (row: TData) => void;
    onRowEdit?: (row: TData) => void;
    onRowDelete?: (row: TData) => void;
  }
}

export function IdentificationTypes() {
  const [identificationType, setIdentificationType] = React.useState<IdentificationType>();

  const {
    pageIndex,
    pageSize,
    sorting,
    searchValue,
    queryParams,
    handlePaginationChange,
    handleSortingChange,
    handleSearchChange,
  } = useDataTable<IdentificationTypeSortField, IdentificationTypeInclude>({
    defaultPageSize: 20,
    defaultIncludes: [],
    defaultSorting: [{ field: 'createdAt', order: 'desc' }],
  });

  const { data, isLoading, isFetching, refetch } = useIdentificationTypes(queryParams);

  const { mutateAsync: deleteIdentificationType, isPending: isDeleting } =
    useDeleteIdentificationType();

  // ---- Handlers ----
  const [openedInfoSheet, setOpenedInfoSheet] = React.useState(false);
  const handleInfoSheetChange = React.useCallback(
    (open: boolean) => {
      if (open === false) {
        setIdentificationType(undefined);
      }
      setOpenedInfoSheet(open);
    },
    [setIdentificationType, setOpenedInfoSheet]
  );

  const [openedFormSheet, setOpenedFormSheet] = React.useState(false);
  const handleFormSheetChange = React.useCallback(
    (open: boolean) => {
      if (open === false) {
        setIdentificationType(undefined);
      }
      setOpenedFormSheet(open);
    },
    [setIdentificationType, setOpenedFormSheet]
  );

  const [openedDeleteDialog, setOpenedDeleteDialog] = React.useState(false);
  const handleDelete = React.useCallback(async () => {
    if (!identificationType?.id) return;
    await deleteIdentificationType({ params: { id: identificationType.id } });
    setIdentificationType(undefined);
    setOpenedDeleteDialog(false);
  }, [identificationType, setIdentificationType, setOpenedDeleteDialog, deleteIdentificationType]);

  const handleCreate = () => {
    handleFormSheetChange(true);
  };
  const handleRowOpen = React.useCallback((row: IdentificationType) => {
    setIdentificationType(row);
    setOpenedInfoSheet(true);
  }, []);
  const handleRowEdit = React.useCallback((row: IdentificationType) => {
    setIdentificationType(row);
    setOpenedFormSheet(true);
  }, []);
  const handleRowDelete = React.useCallback((row: IdentificationType) => {
    setIdentificationType(row);
    setOpenedDeleteDialog(true);
  }, []);
  const fetchAllData = React.useCallback(async () => {
    const res = await api.identificationType.list.query({
      query: { ...queryParams, page: 1, limit: 10000 },
    });
    return (res.body as { data: IdentificationType[] })?.data ?? [];
  }, [queryParams]);



  const tableMeta = React.useMemo<TableMeta<IdentificationType>>(
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
        title="Tipos de Identificación"
        description="Administre el catálogo de tipos de identificación (CC, NIT, CE, etc.)."
      />
      <PageContent>
        <DataTable
          columns={identificationTypeColumns}
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
            <IdentificationTypesToolbar
              searchValue={searchValue}
              onSearchChange={handleSearchChange}
              onCreate={handleCreate}
              onRefresh={() => refetch()}
              isRefreshing={isFetching && !isLoading}
              exportActions={
                <ExportDropdown
                  config={identificationTypeExportConfig}
                  fetchAllData={fetchAllData}
                />
              }
            />
          }
          emptyMessage="No hay información. Intente ajustar los filtros."
          meta={tableMeta}
        />
      </PageContent>

      <IdentificationTypeInfo
        identificationType={identificationType}
        opened={openedInfoSheet}
        onOpened={handleInfoSheetChange}
      />
      <IdentificationTypeForm
        identificationType={identificationType}
        opened={openedFormSheet}
        onOpened={handleFormSheetChange}
      />

      <AlertDialog open={openedDeleteDialog} onOpenChange={setOpenedDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el tipo de
              identificación &quot;{identificationType?.name}&quot;.
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
