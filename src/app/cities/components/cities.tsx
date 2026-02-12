'use client';

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

import { api } from '@/clients/api';
import { PageContent, PageHeader } from '@/components/layout';
import { Spinner } from '@/components/ui/spinner';
import { useDeleteCity, useCities } from '@/hooks/queries/use-city-queries';
import { City, CityInclude, CitySortField } from '@/schemas/city';
import { RowData, TableMeta } from '@tanstack/react-table';
import { cityColumns } from './city-columns';
import { cityExportConfig } from './city-export-config';
import { CityForm } from './city-form';
import { CityInfo } from './city-info';
import { CitiesToolbar } from './city-toolbar';

declare module '@tanstack/table-core' {
  interface TableMeta<TData extends RowData> {
    onRowView?: (row: TData) => void;
    onRowEdit?: (row: TData) => void;
    onRowDelete?: (row: TData) => void;
  }
}

export function Cities() {
  const [city, setCity] = React.useState<City>();

  const {
    pageIndex,
    pageSize,
    sorting,
    searchValue,
    queryParams,
    handlePaginationChange,
    handleSortingChange,
    handleSearchChange,
  } = useDataTable<CitySortField, CityInclude>({
    defaultPageSize: 20,
    defaultIncludes: [],
    defaultSorting: [{ field: 'createdAt', order: 'desc' }],
  });

  const { data, isLoading, isFetching, refetch } = useCities(queryParams);

  const { mutateAsync: deleteCity, isPending: isDeleting } = useDeleteCity();

  // ---- Handlers ----
  const [openedInfoSheet, setOpenedInfoSheet] = React.useState(false);
  const handleInfoSheetChange = React.useCallback(
    (open: boolean) => {
      if (open === false) {
        setCity(undefined);
      }
      setOpenedInfoSheet(open);
    },
    [setCity, setOpenedInfoSheet]
  );

  const [openedFormSheet, setOpenedFormSheet] = React.useState(false);
  const handleFormSheetChange = React.useCallback(
    (open: boolean) => {
      if (open === false) {
        setCity(undefined);
      }
      setOpenedFormSheet(open);
    },
    [setCity, setOpenedFormSheet]
  );

  const [openedDeleteDialog, setOpenedDeleteDialog] = React.useState(false);
  const handleDelete = React.useCallback(async () => {
    if (!city?.id) return;
    await deleteCity({ params: { id: city.id } });
    setCity(undefined);
    setOpenedDeleteDialog(false);
  }, [city, setCity, setOpenedDeleteDialog, deleteCity]);

  const handleCreate = () => {
    handleFormSheetChange(true);
  };
  const handleRowOpen = React.useCallback((row: City) => {
    setCity(row);
    setOpenedInfoSheet(true);
  }, []);
  const handleRowEdit = React.useCallback((row: City) => {
    setCity(row);
    setOpenedFormSheet(true);
  }, []);
  const handleRowDelete = React.useCallback((row: City) => {
    setCity(row);
    setOpenedDeleteDialog(true);
  }, []);

  const fetchAllData = React.useCallback(async () => {
    const res = await api.city.list.query({
      query: { ...queryParams, page: 1, limit: 10000 },
    });
    return (res.body as { data: City[] })?.data ?? [];
  }, [queryParams]);

  const tableMeta = React.useMemo<TableMeta<City>>(
    () => ({
      onRowView: handleRowOpen,
      onRowDelete: handleRowDelete,
      onRowEdit: handleRowEdit,
    }),
    [handleRowOpen, handleRowDelete, handleRowEdit]
  );

  return (
    <>
      <PageHeader title="Ciudades" description="Administre el catálogo de ciudades." />
      <PageContent>
        <DataTable
          columns={cityColumns}
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
            <CitiesToolbar
              searchValue={searchValue}
              onSearchChange={handleSearchChange}
              onCreate={handleCreate}
              onRefresh={() => refetch()}
              isRefreshing={isFetching && !isLoading}
              exportActions={
                <ExportDropdown
                  config={cityExportConfig}
                  fetchAllData={fetchAllData}
                />
              }
            />
          }
          emptyMessage="No hay información. Intente ajustar los filtros."
          meta={tableMeta}
        />
      </PageContent>

      <CityInfo city={city} opened={openedInfoSheet} onOpened={handleInfoSheetChange} />
      <CityForm city={city} opened={openedFormSheet} onOpened={handleFormSheetChange} />

      <AlertDialog open={openedDeleteDialog} onOpenChange={setOpenedDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente la ciudad &quot;
              {city?.name}&quot;.
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
