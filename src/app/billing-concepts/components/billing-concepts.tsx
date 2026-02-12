'use client';

import { api } from '@/clients/api';
import { DataTable, useDataTable, ExportDropdown } from '@/components/data-table';
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
  useBillingConcepts,
  useDeleteBillingConcept,
} from '@/hooks/queries/use-billing-concept-queries';
import {
  BillingConcept,
  BillingConceptInclude,
  BillingConceptSortField,
} from '@/schemas/billing-concept';
import { RowData, TableMeta } from '@tanstack/react-table';
import * as React from 'react';
import { billingConceptColumns } from './billing-concept-columns';
import { BillingConceptForm } from './billing-concept-form';
import { BillingConceptInfo } from './billing-concept-info';
import { billingConceptExportConfig } from './billing-concept-export-config';
import { BillingConceptsToolbar } from './billing-concept-toolbar';

declare module '@tanstack/table-core' {
  interface TableMeta<TData extends RowData> {
    onRowView?: (row: TData) => void;
    onRowEdit?: (row: TData) => void;
    onRowDelete?: (row: TData) => void;
  }
}

export function BillingConcepts() {
  const [billingConcept, setBillingConcept] = React.useState<BillingConcept>();

  const {
    pageIndex,
    pageSize,
    sorting,
    searchValue,
    queryParams,
    handlePaginationChange,
    handleSortingChange,
    handleSearchChange,
  } = useDataTable<BillingConceptSortField, BillingConceptInclude>({
    defaultPageSize: 20,
    defaultIncludes: ['defaultGlAccount', 'billingConceptRules'],
    defaultSorting: [{ field: 'createdAt', order: 'desc' }],
  });

  const { data, isLoading, isFetching, refetch } = useBillingConcepts(queryParams);
  const { mutateAsync: deleteBillingConcept, isPending: isDeleting } = useDeleteBillingConcept();

  const [openedInfoSheet, setOpenedInfoSheet] = React.useState(false);
  const handleInfoSheetChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        setBillingConcept(undefined);
      }
      setOpenedInfoSheet(open);
    },
    [setBillingConcept, setOpenedInfoSheet]
  );

  const [openedFormSheet, setOpenedFormSheet] = React.useState(false);
  const handleFormSheetChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        setBillingConcept(undefined);
      }
      setOpenedFormSheet(open);
    },
    [setBillingConcept, setOpenedFormSheet]
  );

  const [openedDeleteDialog, setOpenedDeleteDialog] = React.useState(false);
  const handleDelete = React.useCallback(async () => {
    if (!billingConcept?.id) return;
    await deleteBillingConcept({ params: { id: billingConcept.id } });
    setBillingConcept(undefined);
    setOpenedDeleteDialog(false);
  }, [billingConcept, deleteBillingConcept]);

  const handleCreate = () => {
    handleFormSheetChange(true);
  };

  const handleRowOpen = React.useCallback((row: BillingConcept) => {
    setBillingConcept(row);
    setOpenedInfoSheet(true);
  }, []);

  const handleRowEdit = React.useCallback((row: BillingConcept) => {
    setBillingConcept(row);
    setOpenedFormSheet(true);
  }, []);

  const handleRowDelete = React.useCallback((row: BillingConcept) => {
    setBillingConcept(row);
    setOpenedDeleteDialog(true);
  }, []);
  const fetchAllData = React.useCallback(async () => {
    const res = await api.billingConcept.list.query({
      query: { ...queryParams, page: 1, limit: 10000 },
    });
    return (res.body as { data: BillingConcept[] })?.data ?? [];
  }, [queryParams]);



  const tableMeta = React.useMemo<TableMeta<BillingConcept>>(
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
        title="Conceptos de Facturacion"
        description="Administre conceptos facturables y sus reglas de calculo."
      />
      <PageContent>
        <DataTable
          columns={billingConceptColumns}
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
            <BillingConceptsToolbar
              searchValue={searchValue}
              onSearchChange={handleSearchChange}
              onCreate={handleCreate}
              onRefresh={() => refetch()}
              isRefreshing={isFetching && !isLoading}
              exportActions={
                <ExportDropdown
                  config={billingConceptExportConfig}
                  fetchAllData={fetchAllData}
                />
              }
            />
          }
          emptyMessage="No hay informacion. Intente ajustar los filtros."
          meta={tableMeta}
        />
      </PageContent>

      <BillingConceptInfo
        billingConcept={billingConcept}
        opened={openedInfoSheet}
        onOpened={handleInfoSheetChange}
      />
      <BillingConceptForm
        billingConcept={billingConcept}
        opened={openedFormSheet}
        onOpened={handleFormSheetChange}
      />

      <AlertDialog open={openedDeleteDialog} onOpenChange={setOpenedDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Estas seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. Esto eliminara permanentemente el concepto
              &quot;{billingConcept?.code} - {billingConcept?.name}&quot; y todas sus reglas.
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
