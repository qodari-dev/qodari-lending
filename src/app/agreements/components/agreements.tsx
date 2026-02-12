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
  useAgreements,
  useDeleteAgreement,
} from '@/hooks/queries/use-agreement-queries';
import { Agreement, AgreementInclude, AgreementSortField } from '@/schemas/agreement';
import { RowData, TableMeta } from '@tanstack/react-table';
import React from 'react';
import { AgreementForm } from './agreement-form';
import { AgreementInfo } from './agreement-info';
import { agreementColumns } from './agreement-columns';
import { agreementExportConfig } from './agreement-export-config';
import { AgreementsToolbar } from './agreement-toolbar';

declare module '@tanstack/table-core' {
  interface TableMeta<TData extends RowData> {
    onRowView?: (row: TData) => void;
    onRowEdit?: (row: TData) => void;
    onRowDelete?: (row: TData) => void;
  }
}

export function Agreements() {
  const [agreement, setAgreement] = React.useState<Agreement>();

  const {
    pageIndex,
    pageSize,
    sorting,
    searchValue,
    queryParams,
    handlePaginationChange,
    handleSortingChange,
    handleSearchChange,
  } = useDataTable<AgreementSortField, AgreementInclude>({
    defaultPageSize: 20,
    defaultIncludes: ['city'],
    defaultSorting: [{ field: 'createdAt', order: 'desc' }],
  });

  const { data, isLoading, isFetching, refetch } = useAgreements(queryParams);

  const { mutateAsync: deleteAgreement, isPending: isDeleting } = useDeleteAgreement();

  const [openedInfoSheet, setOpenedInfoSheet] = React.useState(false);
  const handleInfoSheetChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        setAgreement(undefined);
      }
      setOpenedInfoSheet(open);
    },
    [setAgreement, setOpenedInfoSheet]
  );

  const [openedFormSheet, setOpenedFormSheet] = React.useState(false);
  const handleFormSheetChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        setAgreement(undefined);
      }
      setOpenedFormSheet(open);
    },
    [setAgreement, setOpenedFormSheet]
  );

  const [openedDeleteDialog, setOpenedDeleteDialog] = React.useState(false);
  const handleDelete = React.useCallback(async () => {
    if (!agreement?.id) return;
    await deleteAgreement({ params: { id: agreement.id } });
    setAgreement(undefined);
    setOpenedDeleteDialog(false);
  }, [agreement, setAgreement, setOpenedDeleteDialog, deleteAgreement]);

  const handleCreate = () => {
    handleFormSheetChange(true);
  };

  const handleRowOpen = React.useCallback((row: Agreement) => {
    setAgreement(row);
    setOpenedInfoSheet(true);
  }, []);

  const handleRowEdit = React.useCallback((row: Agreement) => {
    setAgreement(row);
    setOpenedFormSheet(true);
  }, []);

  const handleRowDelete = React.useCallback((row: Agreement) => {
    setAgreement(row);
    setOpenedDeleteDialog(true);
  }, []);
  const fetchAllData = React.useCallback(async () => {
    const res = await api.agreement.list.query({
      query: { ...queryParams, page: 1, limit: 10000 },
    });
    return (res.body as { data: Agreement[] })?.data ?? [];
  }, [queryParams]);



  const tableMeta = React.useMemo<TableMeta<Agreement>>(
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
        title="Convenios"
        description="Administre los convenios de libranza por empresa pagaduria."
      />
      <PageContent>
        <DataTable
          columns={agreementColumns}
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
            <AgreementsToolbar
              searchValue={searchValue}
              onSearchChange={handleSearchChange}
              onCreate={handleCreate}
              onRefresh={() => refetch()}
              isRefreshing={isFetching && !isLoading}
              exportActions={
                <ExportDropdown
                  config={agreementExportConfig}
                  fetchAllData={fetchAllData}
                />
              }
            />
          }
          emptyMessage="No hay informacion. Intente ajustar los filtros."
          meta={tableMeta}
        />
      </PageContent>

      <AgreementInfo agreement={agreement} opened={openedInfoSheet} onOpened={handleInfoSheetChange} />
      <AgreementForm agreement={agreement} opened={openedFormSheet} onOpened={handleFormSheetChange} />

      <AlertDialog open={openedDeleteDialog} onOpenChange={setOpenedDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Estas seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. Esto eliminara permanentemente el convenio
              &quot;{agreement?.agreementCode} - {agreement?.businessName}&quot;.
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
