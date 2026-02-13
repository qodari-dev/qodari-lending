'use client';

import { api } from '@/clients/api';
import { DataTable, useDataTable, ExportDropdown } from '@/components/data-table';
import { PageContent, PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import {
  useCancelLoanApplication,
  useLoanApplications,
  useRejectLoanApplication,
} from '@/hooks/queries/use-loan-application-queries';
import { useRejectionReasons } from '@/hooks/queries/use-rejection-reason-queries';
import {
  LoanApplication,
  LoanApplicationInclude,
  LOAN_APPLICATION_STATUS_OPTIONS,
  LoanApplicationStatus,
  LoanApplicationSortField,
} from '@/schemas/loan-application';
import { RowData, TableMeta } from '@tanstack/react-table';
import React from 'react';
import { LoanApplicationApproveDialog } from './loan-application-approve-dialog';
import { loanApplicationColumns } from './loan-application-columns';
import { LoanApplicationForm } from './loan-application-form';
import { LoanApplicationInfo } from './loan-application-info';
import { loanApplicationExportConfig } from './loan-application-export-config';
import { LoanApplicationsToolbar } from './loan-application-toolbar';

declare module '@tanstack/table-core' {
  interface TableMeta<TData extends RowData> {
    onRowView?: (row: TData) => void;
    onRowEdit?: (row: TData) => void;
    onRowApprove?: (row: TData) => void;
    onRowCancel?: (row: TData) => void;
    onRowReject?: (row: TData) => void;
  }
}

export function LoanApplications() {
  const [loanApplication, setLoanApplication] = React.useState<LoanApplication>();

  const {
    pageIndex,
    pageSize,
    sorting,
    searchValue,
    filters,
    queryParams,
    handlePaginationChange,
    handleSortingChange,
    handleSearchChange,
    handleFilterChange,
    resetFilters,
  } = useDataTable<LoanApplicationSortField, LoanApplicationInclude>({
    defaultPageSize: 20,
    defaultIncludes: [
      'thirdParty',
      'creditProduct',
      'affiliationOffice',
      'bank',
      'channel',
      'insuranceCompany',
      'rejectionReason',
      'loanApplicationCoDebtors',
      'loanApplicationDocuments',
      'loanApplicationPledges',
      'loanApplicationStatusHistory',
    ],
    defaultSorting: [{ field: 'createdAt', order: 'desc' }],
  });

  const { data, isLoading, isFetching, refetch } = useLoanApplications(queryParams);

  const rangeDateFilter = React.useMemo(() => {
    const applicationDate = filters.applicationDate as { gte?: Date; lte?: Date } | undefined;
    if (!applicationDate) return undefined;
    const from = applicationDate.gte;
    const to = applicationDate.lte;
    if (!from && !to) return undefined;
    return { from, to };
  }, [filters.applicationDate]);

  const statusFilter = React.useMemo(() => {
    const status = filters.status;
    if (!status || typeof status !== 'string') return undefined;
    if (LOAN_APPLICATION_STATUS_OPTIONS.includes(status as LoanApplicationStatus)) {
      return status as LoanApplicationStatus;
    }
    return undefined;
  }, [filters.status]);
  const { mutateAsync: cancelLoanApplication, isPending: isCanceling } = useCancelLoanApplication();
  const { mutateAsync: rejectLoanApplication, isPending: isRejecting } = useRejectLoanApplication();

  const { data: rejectionReasonsData } = useRejectionReasons({
    limit: 1000,
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'name', order: 'asc' }],
  });
  const rejectionReasons = rejectionReasonsData?.body?.data ?? [];

  const [openedInfoSheet, setOpenedInfoSheet] = React.useState(false);
  const handleInfoSheetChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        setLoanApplication(undefined);
      }
      setOpenedInfoSheet(open);
    },
    [setLoanApplication, setOpenedInfoSheet]
  );

  const [openedFormSheet, setOpenedFormSheet] = React.useState(false);
  const handleFormSheetChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        setLoanApplication(undefined);
      }
      setOpenedFormSheet(open);
    },
    [setLoanApplication, setOpenedFormSheet]
  );

  const [openedCancelDialog, setOpenedCancelDialog] = React.useState(false);
  const [cancelNote, setCancelNote] = React.useState('');
  const [openedApproveDialog, setOpenedApproveDialog] = React.useState(false);
  const [openedRejectDialog, setOpenedRejectDialog] = React.useState(false);
  const [rejectNote, setRejectNote] = React.useState('');
  const [rejectReasonId, setRejectReasonId] = React.useState<number | undefined>();

  const handleCreate = React.useCallback(() => {
    setLoanApplication(undefined);
    setOpenedFormSheet(true);
  }, []);

  const handleRowOpen = React.useCallback((row: LoanApplication) => {
    setLoanApplication(row);
    setOpenedInfoSheet(true);
  }, []);

  const handleRowEdit = React.useCallback((row: LoanApplication) => {
    setLoanApplication(row);
    setOpenedFormSheet(true);
  }, []);

  const handleRowApprove = React.useCallback((row: LoanApplication) => {
    setLoanApplication(row);
    setOpenedApproveDialog(true);
  }, []);

  const handleRowCancel = React.useCallback((row: LoanApplication) => {
    setLoanApplication(row);
    setCancelNote('');
    setOpenedCancelDialog(true);
  }, []);

  const handleRowReject = React.useCallback((row: LoanApplication) => {
    setLoanApplication(row);
    setRejectNote('');
    setRejectReasonId(undefined);
    setOpenedRejectDialog(true);
  }, []);

  const submitCancel = React.useCallback(async () => {
    if (!loanApplication?.id) return;
    if (!cancelNote.trim()) return;

    await cancelLoanApplication({
      params: { id: loanApplication.id },
      body: {
        statusNote: cancelNote.trim(),
      },
    });

    setOpenedCancelDialog(false);
    setLoanApplication(undefined);
  }, [cancelLoanApplication, cancelNote, loanApplication]);

  const submitReject = React.useCallback(async () => {
    if (!loanApplication?.id || !rejectReasonId || !rejectNote.trim()) return;

    await rejectLoanApplication({
      params: { id: loanApplication.id },
      body: {
        statusNote: rejectNote.trim(),
        rejectionReasonId: rejectReasonId,
      },
    });

    setOpenedRejectDialog(false);
    setLoanApplication(undefined);
  }, [loanApplication, rejectLoanApplication, rejectReasonId, rejectNote]);
  const fetchAllData = React.useCallback(async () => {
    const res = await api.loanApplication.list.query({
      query: { ...queryParams, page: 1, limit: 10000 },
    });
    return (res.body as { data: LoanApplication[] })?.data ?? [];
  }, [queryParams]);

  const tableMeta = React.useMemo<TableMeta<LoanApplication>>(
    () => ({
      onRowView: handleRowOpen,
      onRowEdit: handleRowEdit,
      onRowApprove: handleRowApprove,
      onRowCancel: handleRowCancel,
      onRowReject: handleRowReject,
    }),
    [handleRowOpen, handleRowEdit, handleRowApprove, handleRowCancel, handleRowReject]
  );

  return (
    <>
      <PageHeader
        title="Solicitudes de Credito"
        description="Administre solicitudes, codeudores, documentos y estado operativo."
      />
      <PageContent>
        <DataTable
          columns={loanApplicationColumns}
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
            <LoanApplicationsToolbar
              searchValue={searchValue}
              onSearchChange={handleSearchChange}
              statusFilter={statusFilter}
              onStatusFilterChange={(value) => handleFilterChange('status', value)}
              rangeDateFilter={rangeDateFilter}
              onRangeDateFilterChange={(value) => {
                if (value?.from && value?.to) {
                  handleFilterChange('applicationDate', { gte: value.from, lte: value.to });
                } else if (value?.from) {
                  handleFilterChange('applicationDate', { gte: value.from });
                } else if (value?.to) {
                  handleFilterChange('applicationDate', { lte: value.to });
                } else {
                  handleFilterChange('applicationDate', undefined);
                }
              }}
              onReset={resetFilters}
              onCreate={handleCreate}
              onRefresh={() => refetch()}
              isRefreshing={isFetching && !isLoading}
              exportActions={
                <ExportDropdown config={loanApplicationExportConfig} fetchAllData={fetchAllData} />
              }
            />
          }
          emptyMessage="No hay informacion. Intente ajustar los filtros."
          meta={tableMeta}
        />
      </PageContent>

      <LoanApplicationInfo
        loanApplication={loanApplication}
        opened={openedInfoSheet}
        onOpened={handleInfoSheetChange}
        onApprove={handleRowApprove}
        onReject={handleRowReject}
      />
      <LoanApplicationForm
        loanApplication={loanApplication}
        opened={openedFormSheet}
        onOpened={handleFormSheetChange}
      />

      <LoanApplicationApproveDialog
        loanApplication={loanApplication}
        opened={openedApproveDialog}
        onOpened={setOpenedApproveDialog}
        onApproved={() => setLoanApplication(undefined)}
      />

      <Dialog open={openedCancelDialog} onOpenChange={setOpenedCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar solicitud</DialogTitle>
            <DialogDescription>
              Esta accion cambia el estado a cancelada y solicita una nota obligatoria.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="cancelNote">Nota</Label>
            <Textarea
              id="cancelNote"
              value={cancelNote}
              onChange={(event) => setCancelNote(event.target.value)}
              placeholder="Ingrese motivo de cancelacion..."
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenedCancelDialog(false)}>
              Cerrar
            </Button>
            <Button onClick={submitCancel} disabled={isCanceling || !cancelNote.trim()}>
              {isCanceling && <Spinner />}
              Cancelar solicitud
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openedRejectDialog} onOpenChange={setOpenedRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar solicitud</DialogTitle>
            <DialogDescription>
              Debe seleccionar un motivo de rechazo e ingresar una nota.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="rejectReasonId">Motivo rechazo</Label>
            <Select
              value={rejectReasonId ? String(rejectReasonId) : ''}
              onValueChange={(value) => setRejectReasonId(value ? Number(value) : undefined)}
            >
              <SelectTrigger id="rejectReasonId">
                <SelectValue placeholder="Seleccione..." />
              </SelectTrigger>
              <SelectContent>
                {rejectionReasons.map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rejectNote">Nota</Label>
            <Textarea
              id="rejectNote"
              value={rejectNote}
              onChange={(event) => setRejectNote(event.target.value)}
              placeholder="Ingrese motivo de rechazo..."
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenedRejectDialog(false)}>
              Cerrar
            </Button>
            <Button
              variant="destructive"
              onClick={submitReject}
              disabled={isRejecting || !rejectReasonId || !rejectNote.trim()}
            >
              {isRejecting && <Spinner />}
              Rechazar solicitud
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
