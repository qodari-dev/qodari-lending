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
  useDeletePaymentAllocationPolicy,
  usePaymentAllocationPolicies,
} from '@/hooks/queries/use-payment-allocation-policy-queries';
import {
  PaymentAllocationPolicy,
  PaymentAllocationPolicyInclude,
  PaymentAllocationPolicySortField,
} from '@/schemas/payment-allocation-policy';
import { RowData, TableMeta } from '@tanstack/react-table';
import * as React from 'react';
import { PaymentAllocationPolicyColumns } from './payment-allocation-policy-columns';
import { PaymentAllocationPolicyForm } from './payment-allocation-policy-form';
import { PaymentAllocationPolicyInfo } from './payment-allocation-policy-info';
import { PaymentAllocationPolicyToolbar } from './payment-allocation-policy-toolbar';
import { paymentAllocationPolicyExportConfig } from './payment-allocation-policy-export-config';

declare module '@tanstack/table-core' {
  interface TableMeta<TData extends RowData> {
    onRowView?: (row: TData) => void;
    onRowEdit?: (row: TData) => void;
    onRowDelete?: (row: TData) => void;
  }
}

export function PaymentAllocationPolicies() {
  const [policy, setPolicy] = React.useState<PaymentAllocationPolicy>();

  const {
    pageIndex,
    pageSize,
    sorting,
    searchValue,
    queryParams,
    handlePaginationChange,
    handleSortingChange,
    handleSearchChange,
  } = useDataTable<PaymentAllocationPolicySortField, PaymentAllocationPolicyInclude>({
    defaultPageSize: 20,
    defaultIncludes: ['paymentAllocationPolicyRules'],
    defaultSorting: [{ field: 'createdAt', order: 'desc' }],
  });

  const { data, isLoading, isFetching, refetch } = usePaymentAllocationPolicies(queryParams);
  const { mutateAsync: deletePolicy, isPending: isDeleting } = useDeletePaymentAllocationPolicy();

  const [openedInfoSheet, setOpenedInfoSheet] = React.useState(false);
  const handleInfoSheetChange = React.useCallback((open: boolean) => {
    if (!open) setPolicy(undefined);
    setOpenedInfoSheet(open);
  }, []);

  const [openedFormSheet, setOpenedFormSheet] = React.useState(false);
  const handleFormSheetChange = React.useCallback((open: boolean) => {
    if (!open) setPolicy(undefined);
    setOpenedFormSheet(open);
  }, []);

  const [openedDeleteDialog, setOpenedDeleteDialog] = React.useState(false);
  const handleDelete = React.useCallback(async () => {
    if (!policy?.id) return;
    await deletePolicy({ params: { id: policy.id } });
    setPolicy(undefined);
    setOpenedDeleteDialog(false);
  }, [deletePolicy, policy]);

  const handleCreate = React.useCallback(() => {
    handleFormSheetChange(true);
  }, [handleFormSheetChange]);

  const handleRowOpen = React.useCallback((row: PaymentAllocationPolicy) => {
    setPolicy(row);
    setOpenedInfoSheet(true);
  }, []);

  const handleRowEdit = React.useCallback((row: PaymentAllocationPolicy) => {
    setPolicy(row);
    setOpenedFormSheet(true);
  }, []);

  const handleRowDelete = React.useCallback((row: PaymentAllocationPolicy) => {
    setPolicy(row);
    setOpenedDeleteDialog(true);
  }, []);
  const fetchAllData = React.useCallback(async () => {
    const res = await api.paymentAllocationPolicy.list.query({
      query: { ...queryParams, page: 1, limit: 10000 },
    });
    return (res.body as { data: PaymentAllocationPolicy[] })?.data ?? [];
  }, [queryParams]);

  const tableMeta = React.useMemo<TableMeta<PaymentAllocationPolicy>>(
    () => ({
      onRowView: handleRowOpen,
      onRowDelete: handleRowDelete,
      onRowEdit: handleRowEdit,
    }),
    [handleRowDelete, handleRowEdit, handleRowOpen]
  );

  return (
    <>
      <PageHeader
        title="Politicas de Aplicacion de Pagos"
        description="Defina como se aplica un abono por prelacion de conceptos."
      />
      <PageContent>
        <DataTable
          columns={PaymentAllocationPolicyColumns}
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
            <PaymentAllocationPolicyToolbar
              searchValue={searchValue}
              onSearchChange={handleSearchChange}
              onCreate={handleCreate}
              onRefresh={() => refetch()}
              isRefreshing={isFetching && !isLoading}
              exportActions={
                <ExportDropdown
                  config={paymentAllocationPolicyExportConfig}
                  fetchAllData={fetchAllData}
                />
              }
            />
          }
          emptyMessage="No hay informacion. Intente ajustar los filtros."
          meta={tableMeta}
        />
      </PageContent>

      <PaymentAllocationPolicyInfo
        paymentAllocationPolicy={policy}
        opened={openedInfoSheet}
        onOpened={handleInfoSheetChange}
      />
      <PaymentAllocationPolicyForm
        paymentAllocationPolicy={policy}
        opened={openedFormSheet}
        onOpened={handleFormSheetChange}
      />

      <AlertDialog open={openedDeleteDialog} onOpenChange={setOpenedDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Estas seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. Esto eliminara permanentemente la politica &quot;
              {policy?.name}&quot; y sus reglas.
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
