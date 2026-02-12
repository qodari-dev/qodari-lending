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
  useDeleteInsuranceCompany,
  useInsuranceCompanies,
} from '@/hooks/queries/use-insurance-company-queries';
import {
  InsuranceCompany,
  InsuranceCompanyInclude,
  InsuranceCompanySortField,
} from '@/schemas/insurance-company';
import { RowData, TableMeta } from '@tanstack/react-table';
import { insuranceCompanyColumns } from './insurance-company-columns';
import { InsuranceCompanyForm } from './insurance-company-form';
import { InsuranceCompanyInfo } from './insurance-company-info';
import { insuranceCompanyExportConfig } from './insurance-company-export-config';
import { InsuranceCompaniesToolbar } from './insurance-company-toolbar';

declare module '@tanstack/table-core' {
  interface TableMeta<TData extends RowData> {
    onRowView?: (row: TData) => void;
    onRowEdit?: (row: TData) => void;
    onRowDelete?: (row: TData) => void;
  }
}

export function InsuranceCompanies() {
  const [insuranceCompany, setInsuranceCompany] = React.useState<InsuranceCompany>();

  const {
    pageIndex,
    pageSize,
    sorting,
    searchValue,
    queryParams,
    handlePaginationChange,
    handleSortingChange,
    handleSearchChange,
  } = useDataTable<InsuranceCompanySortField, InsuranceCompanyInclude>({
    defaultPageSize: 20,
    defaultIncludes: ['insuranceRateRanges'],
    defaultSorting: [{ field: 'createdAt', order: 'desc' }],
  });

  const { data, isLoading, isFetching, refetch } = useInsuranceCompanies(queryParams);

  const { mutateAsync: deleteInsuranceCompany, isPending: isDeleting } =
    useDeleteInsuranceCompany();

  // ---- Handlers ----
  const [openedInfoSheet, setOpenedInfoSheet] = React.useState(false);
  const handleInfoSheetChange = React.useCallback(
    (open: boolean) => {
      if (open === false) {
        setInsuranceCompany(undefined);
      }
      setOpenedInfoSheet(open);
    },
    [setInsuranceCompany, setOpenedInfoSheet]
  );

  const [openedFormSheet, setOpenedFormSheet] = React.useState(false);
  const handleFormSheetChange = React.useCallback(
    (open: boolean) => {
      if (open === false) {
        setInsuranceCompany(undefined);
      }
      setOpenedFormSheet(open);
    },
    [setInsuranceCompany, setOpenedFormSheet]
  );

  const [openedDeleteDialog, setOpenedDeleteDialog] = React.useState(false);
  const handleDelete = React.useCallback(async () => {
    if (!insuranceCompany?.id) return;
    await deleteInsuranceCompany({ params: { id: insuranceCompany.id } });
    setInsuranceCompany(undefined);
    setOpenedDeleteDialog(false);
  }, [insuranceCompany, setInsuranceCompany, setOpenedDeleteDialog, deleteInsuranceCompany]);

  const handleCreate = () => {
    handleFormSheetChange(true);
  };
  const handleRowOpen = React.useCallback((row: InsuranceCompany) => {
    setInsuranceCompany(row);
    setOpenedInfoSheet(true);
  }, []);
  const handleRowEdit = React.useCallback((row: InsuranceCompany) => {
    setInsuranceCompany(row);
    setOpenedFormSheet(true);
  }, []);
  const handleRowDelete = React.useCallback((row: InsuranceCompany) => {
    setInsuranceCompany(row);
    setOpenedDeleteDialog(true);
  }, []);
  const fetchAllData = React.useCallback(async () => {
    const res = await api.insuranceCompany.list.query({
      query: { ...queryParams, page: 1, limit: 10000 },
    });
    return (res.body as { data: InsuranceCompany[] })?.data ?? [];
  }, [queryParams]);



  const tableMeta = React.useMemo<TableMeta<InsuranceCompany>>(
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
        title="Empresas de Seguros"
        description="Administre las empresas de seguros y sus rangos de tasas."
      />
      <PageContent>
        <DataTable
          columns={insuranceCompanyColumns}
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
            <InsuranceCompaniesToolbar
              searchValue={searchValue}
              onSearchChange={handleSearchChange}
              onCreate={handleCreate}
              onRefresh={() => refetch()}
              isRefreshing={isFetching && !isLoading}
              exportActions={
                <ExportDropdown
                  config={insuranceCompanyExportConfig}
                  fetchAllData={fetchAllData}
                />
              }
            />
          }
          emptyMessage="No hay información. Intente ajustar los filtros."
          meta={tableMeta}
        />
      </PageContent>

      <InsuranceCompanyInfo
        insuranceCompany={insuranceCompany}
        opened={openedInfoSheet}
        onOpened={handleInfoSheetChange}
      />
      <InsuranceCompanyForm
        insuranceCompany={insuranceCompany}
        opened={openedFormSheet}
        onOpened={handleFormSheetChange}
      />

      <AlertDialog open={openedDeleteDialog} onOpenChange={setOpenedDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente la empresa de seguros
              &quot;{insuranceCompany?.businessName}&quot; y todos sus rangos de tasas.
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
