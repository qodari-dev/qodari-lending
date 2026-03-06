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
  useDeleteDocumentTemplate,
  useDocumentTemplates,
} from '@/hooks/queries/use-document-template-queries';
import {
  DocumentTemplate,
  DocumentTemplateInclude,
  DocumentTemplateSortField,
} from '@/schemas/document-template';
import { RowData, TableMeta } from '@tanstack/react-table';
import React from 'react';
import { documentTemplateColumns } from './document-template-columns';
import { DocumentTemplateForm } from './document-template-form';
import { DocumentTemplateInfo } from './document-template-info';
import { DocumentTemplateToolbar } from './document-template-toolbar';

declare module '@tanstack/table-core' {
  interface TableMeta<TData extends RowData> {
    onRowView?: (row: TData) => void;
    onRowEdit?: (row: TData) => void;
    onRowDelete?: (row: TData) => void;
  }
}

export function DocumentTemplates() {
  const [documentTemplate, setDocumentTemplate] = React.useState<DocumentTemplate>();

  const {
    pageIndex,
    pageSize,
    sorting,
    searchValue,
    queryParams,
    handlePaginationChange,
    handleSortingChange,
    handleSearchChange,
  } = useDataTable<DocumentTemplateSortField, DocumentTemplateInclude>({
    defaultPageSize: 20,
    defaultIncludes: ['templateSignerRules', 'creditProductDocumentRules'],
    defaultSorting: [{ field: 'createdAt', order: 'desc' }],
  });

  const { data, isLoading, isFetching, refetch } = useDocumentTemplates(queryParams);
  const { mutateAsync: deleteDocumentTemplate, isPending: isDeleting } = useDeleteDocumentTemplate();

  const [openedInfoSheet, setOpenedInfoSheet] = React.useState(false);
  const handleInfoSheetChange = React.useCallback(
    (open: boolean) => {
      if (!open) setDocumentTemplate(undefined);
      setOpenedInfoSheet(open);
    },
    [setDocumentTemplate]
  );

  const [openedFormSheet, setOpenedFormSheet] = React.useState(false);
  const handleFormSheetChange = React.useCallback(
    (open: boolean) => {
      if (!open) setDocumentTemplate(undefined);
      setOpenedFormSheet(open);
    },
    [setDocumentTemplate]
  );

  const [openedDeleteDialog, setOpenedDeleteDialog] = React.useState(false);
  const handleDelete = React.useCallback(async () => {
    if (!documentTemplate?.id) return;
    await deleteDocumentTemplate({ params: { id: documentTemplate.id } });
    setDocumentTemplate(undefined);
    setOpenedDeleteDialog(false);
  }, [documentTemplate, deleteDocumentTemplate]);

  const handleCreate = () => handleFormSheetChange(true);

  const handleRowOpen = React.useCallback((row: DocumentTemplate) => {
    setDocumentTemplate(row);
    setOpenedInfoSheet(true);
  }, []);

  const handleRowEdit = React.useCallback((row: DocumentTemplate) => {
    setDocumentTemplate(row);
    setOpenedFormSheet(true);
  }, []);

  const handleRowDelete = React.useCallback((row: DocumentTemplate) => {
    setDocumentTemplate(row);
    setOpenedDeleteDialog(true);
  }, []);

  const tableMeta = React.useMemo<TableMeta<DocumentTemplate>>(
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
        title="Plantillas de firma"
        description="Administre plantillas documentales y su configuracion de firmantes."
      />
      <PageContent>
        <DataTable
          columns={documentTemplateColumns}
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
            <DocumentTemplateToolbar
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

      <DocumentTemplateInfo
        documentTemplate={documentTemplate}
        opened={openedInfoSheet}
        onOpened={handleInfoSheetChange}
      />
      <DocumentTemplateForm
        documentTemplate={documentTemplate}
        opened={openedFormSheet}
        onOpened={handleFormSheetChange}
      />

      <AlertDialog open={openedDeleteDialog} onOpenChange={setOpenedDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Estas seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. Se eliminara permanentemente la plantilla
              &quot;{documentTemplate?.code}&quot;.
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
