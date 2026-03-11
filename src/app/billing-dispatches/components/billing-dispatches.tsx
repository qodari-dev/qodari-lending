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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { useAgreements, useRunAgreementBillingEmails } from '@/hooks/queries/use-agreement-queries';
import { useBillingDispatches } from '@/hooks/queries/use-billing-dispatch-queries';
import type { BillingDispatch, BillingDispatchSortField } from '@/schemas/billing-dispatch';
import { RowData, TableMeta } from '@tanstack/react-table';
import React from 'react';
import { billingDispatchColumns } from './billing-dispatch-columns';
import { BillingDispatchDetail } from './billing-dispatch-detail';
import { BillingDispatchToolbar } from './billing-dispatch-toolbar';

declare module '@tanstack/table-core' {
  interface TableMeta<TData extends RowData> {
    onRowView?: (row: TData) => void;
  }
}

export function BillingDispatches() {
  const [dispatch, setDispatch] = React.useState<BillingDispatch>();
  const [openedDetail, setOpenedDetail] = React.useState(false);

  // Filters
  const [selectedAgreementId, setSelectedAgreementId] = React.useState('__all__');
  const [selectedStatus, setSelectedStatus] = React.useState('__all__');

  const {
    pageIndex,
    pageSize,
    sorting,
    searchValue,
    queryParams,
    handlePaginationChange,
    handleSortingChange,
    handleSearchChange,
  } = useDataTable<BillingDispatchSortField>({
    defaultPageSize: 20,
    defaultSorting: [{ field: 'createdAt', order: 'desc' }],
  });

  // Build where clause from filters
  const finalQueryParams = React.useMemo(() => {
    const andConditions: Record<string, unknown>[] = [];

    if (selectedAgreementId !== '__all__') {
      andConditions.push({ agreementId: { eq: Number(selectedAgreementId) } });
    }
    if (selectedStatus !== '__all__') {
      andConditions.push({ status: { eq: selectedStatus } });
    }

    // Merge with existing where from queryParams
    const existingAnd = queryParams.where?.and ?? [];
    const allAnd = [...existingAnd, ...andConditions];

    return {
      ...queryParams,
      include: ['agreement' as const],
      where: allAnd.length ? { and: allAnd } : undefined,
    };
  }, [queryParams, selectedAgreementId, selectedStatus]);

  const { data, isLoading, isFetching, refetch } = useBillingDispatches(finalQueryParams);

  const { data: agreementsData } = useAgreements({
    page: 1,
    limit: 2000,
    include: [],
    sort: [{ field: 'businessName', order: 'asc' }],
    where: { and: [{ isActive: true }] },
  });
  const agreements = React.useMemo(() => agreementsData?.body?.data ?? [], [agreementsData]);

  // Encolar correos
  const { mutateAsync: runBillingEmails, isPending: isRunningBillingEmails } =
    useRunAgreementBillingEmails();

  const [openedRunDialog, setOpenedRunDialog] = React.useState(false);
  const [runMode, setRunMode] = React.useState<'ALL' | 'AGREEMENT'>('ALL');
  const [runAgreementId, setRunAgreementId] = React.useState<number | null>(null);

  const handleOpenRunDialog = React.useCallback(() => {
    if (selectedAgreementId !== '__all__') {
      setRunMode('AGREEMENT');
      setRunAgreementId(Number(selectedAgreementId));
    } else {
      setRunMode('ALL');
      setRunAgreementId(null);
    }
    setOpenedRunDialog(true);
  }, [selectedAgreementId]);

  const handleRunBillingEmails = React.useCallback(async () => {
    await runBillingEmails({
      body: {
        agreementId: runMode === 'AGREEMENT' ? runAgreementId : null,
        forceResend: false,
      },
    });
    setOpenedRunDialog(false);
    refetch();
  }, [runAgreementId, runBillingEmails, runMode, refetch]);

  const handleRowView = React.useCallback((row: BillingDispatch) => {
    setDispatch(row);
    setOpenedDetail(true);
  }, []);

  const handleDetailChange = React.useCallback((open: boolean) => {
    if (!open) setDispatch(undefined);
    setOpenedDetail(open);
  }, []);

  const tableMeta = React.useMemo<TableMeta<BillingDispatch>>(
    () => ({
      onRowView: handleRowView,
    }),
    [handleRowView]
  );

  return (
    <>
      <PageHeader
        title="Instrucciones de cobro"
        description="Historial de correos de facturación enviados a convenios. Consulte detalle, conciliación y encole nuevos envíos."
      />
      <PageContent>
        <DataTable
          columns={billingDispatchColumns}
          data={data?.body?.data ?? []}
          pageCount={data?.body?.meta.totalPages ?? 0}
          pageIndex={pageIndex}
          pageSize={pageSize}
          totalCount={data?.body?.meta.total}
          onPaginationChange={handlePaginationChange}
          sorting={sorting}
          onSortingChange={handleSortingChange}
          isLoading={isLoading}
          pageSizeOptions={[10, 20, 30, 50]}
          toolbar={
            <BillingDispatchToolbar
              searchValue={searchValue}
              onSearchChange={handleSearchChange}
              onRefresh={() => refetch()}
              isRefreshing={isFetching && !isLoading}
              agreements={agreements}
              selectedAgreementId={selectedAgreementId}
              onAgreementChange={setSelectedAgreementId}
              selectedStatus={selectedStatus}
              onStatusChange={setSelectedStatus}
              onRunBillingEmails={handleOpenRunDialog}
              isRunningBillingEmails={isRunningBillingEmails}
            />
          }
          emptyMessage="No hay instrucciones de cobro. Ajuste los filtros o encole correos."
          meta={tableMeta}
        />
      </PageContent>

      <BillingDispatchDetail
        dispatch={dispatch}
        opened={openedDetail}
        onOpened={handleDetailChange}
      />

      {/* Dialog encolar correos */}
      <AlertDialog open={openedRunDialog} onOpenChange={setOpenedRunDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encolar correos de facturación</AlertDialogTitle>
            <AlertDialogDescription>
              Se encolará un correo por convenio y ciclo seleccionado con archivo Excel adjunto.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Modo de ejecución</p>
              <Select
                value={runMode}
                onValueChange={(value) => setRunMode(value as 'ALL' | 'AGREEMENT')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los convenios</SelectItem>
                  <SelectItem value="AGREEMENT">Un convenio</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {runMode === 'AGREEMENT' ? (
              <div className="space-y-1">
                <p className="text-sm font-medium">Convenio</p>
                <Select
                  value={runAgreementId ? String(runAgreementId) : undefined}
                  onValueChange={(value) => setRunAgreementId(value ? Number(value) : null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione convenio..." />
                  </SelectTrigger>
                  <SelectContent>
                    {agreements.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.agreementCode} - {item.businessName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOpenedRunDialog(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isRunningBillingEmails || (runMode === 'AGREEMENT' && !runAgreementId)}
              onClick={handleRunBillingEmails}
            >
              {isRunningBillingEmails && <Spinner />}
              Encolar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
