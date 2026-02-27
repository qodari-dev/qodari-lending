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
  useBillingEmailTemplates,
  useDeleteBillingEmailTemplate,
} from '@/hooks/queries/use-billing-email-template-queries';
import {
  BillingEmailTemplate,
  BillingEmailTemplateInclude,
  BillingEmailTemplateSortField,
} from '@/schemas/billing-email-template';
import { RowData, TableMeta } from '@tanstack/react-table';
import React from 'react';
import { billingEmailTemplateColumns } from './billing-email-template-columns';
import { BillingEmailTemplateForm } from './billing-email-template-form';
import { BillingEmailTemplateInfo } from './billing-email-template-info';
import { BillingEmailTemplatesToolbar } from './billing-email-template-toolbar';

declare module '@tanstack/table-core' {
  interface TableMeta<TData extends RowData> {
    onRowView?: (row: TData) => void;
    onRowEdit?: (row: TData) => void;
    onRowDelete?: (row: TData) => void;
  }
}

export function BillingEmailTemplates() {
  const [billingEmailTemplate, setBillingEmailTemplate] = React.useState<BillingEmailTemplate>();

  const {
    pageIndex,
    pageSize,
    sorting,
    searchValue,
    queryParams,
    handlePaginationChange,
    handleSortingChange,
    handleSearchChange,
  } = useDataTable<BillingEmailTemplateSortField, BillingEmailTemplateInclude>({
    defaultPageSize: 20,
    defaultIncludes: [],
    defaultSorting: [{ field: 'createdAt', order: 'desc' }],
  });

  const { data, isLoading, isFetching, refetch } = useBillingEmailTemplates(queryParams);
  const { mutateAsync: deleteBillingEmailTemplate, isPending: isDeleting } =
    useDeleteBillingEmailTemplate();

  const [openedInfoSheet, setOpenedInfoSheet] = React.useState(false);
  const handleInfoSheetChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        setBillingEmailTemplate(undefined);
      }
      setOpenedInfoSheet(open);
    },
    [setBillingEmailTemplate, setOpenedInfoSheet]
  );

  const [openedFormSheet, setOpenedFormSheet] = React.useState(false);
  const handleFormSheetChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        setBillingEmailTemplate(undefined);
      }
      setOpenedFormSheet(open);
    },
    [setBillingEmailTemplate, setOpenedFormSheet]
  );

  const [openedDeleteDialog, setOpenedDeleteDialog] = React.useState(false);
  const handleDelete = React.useCallback(async () => {
    if (!billingEmailTemplate?.id) return;
    await deleteBillingEmailTemplate({ params: { id: billingEmailTemplate.id } });
    setBillingEmailTemplate(undefined);
    setOpenedDeleteDialog(false);
  }, [billingEmailTemplate, deleteBillingEmailTemplate]);

  const handleCreate = () => {
    handleFormSheetChange(true);
  };

  const handleRowOpen = React.useCallback((row: BillingEmailTemplate) => {
    setBillingEmailTemplate(row);
    setOpenedInfoSheet(true);
  }, []);

  const handleRowEdit = React.useCallback((row: BillingEmailTemplate) => {
    setBillingEmailTemplate(row);
    setOpenedFormSheet(true);
  }, []);

  const handleRowDelete = React.useCallback((row: BillingEmailTemplate) => {
    setBillingEmailTemplate(row);
    setOpenedDeleteDialog(true);
  }, []);

  const tableMeta = React.useMemo<TableMeta<BillingEmailTemplate>>(
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
        title="Plantillas de correo"
        description="Defina contenido y asunto de los correos de facturacion por convenio."
      />
      <PageContent>
        <DataTable
          columns={billingEmailTemplateColumns}
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
            <BillingEmailTemplatesToolbar
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

      <BillingEmailTemplateInfo
        billingEmailTemplate={billingEmailTemplate}
        opened={openedInfoSheet}
        onOpened={handleInfoSheetChange}
      />
      <BillingEmailTemplateForm
        billingEmailTemplate={billingEmailTemplate}
        opened={openedFormSheet}
        onOpened={handleFormSheetChange}
      />

      <AlertDialog open={openedDeleteDialog} onOpenChange={setOpenedDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Estas seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. Esto eliminara permanentemente la plantilla
              &quot;{billingEmailTemplate?.name}&quot;.
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
