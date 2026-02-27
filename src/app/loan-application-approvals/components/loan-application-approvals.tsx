'use client';

import { DataTable, useDataTable } from '@/components/data-table';
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
  useApproveLoanApplication,
  useCancelLoanApplication,
  useLoanApplicationInbox,
  useRejectLoanApplication,
} from '@/hooks/queries/use-loan-application-queries';
import { useRejectionReasons } from '@/hooks/queries/use-rejection-reason-queries';
import {
  LoanApplication,
  LoanApplicationInclude,
  LoanApplicationSortField,
} from '@/schemas/loan-application';
import { RowData, TableMeta } from '@tanstack/react-table';
import React from 'react';
import { LoanApplicationApproveDialog } from '@/app/loan-applications/components/loan-application-approve-dialog';
import { LoanApplicationInfo } from '@/app/loan-applications/components/loan-application-info';
import { LoanApplicationApprovalColumns } from './loan-application-approval-columns';
import { LoanApplicationApprovalToolbar } from './loan-application-approval-toolbar';

declare module '@tanstack/table-core' {
  interface TableMeta<TData extends RowData> {
    onRowView?: (row: TData) => void;
    onRowApprove?: (row: TData) => void;
    onRowCancel?: (row: TData) => void;
    onRowReject?: (row: TData) => void;
  }
}

function isFinalApprovalLevel(application: LoanApplication) {
  if (!application.currentApprovalLevelId || !application.targetApprovalLevelId) return false;
  return application.currentApprovalLevelId === application.targetApprovalLevelId;
}

export function LoanApplicationApprovals() {
  const [loanApplication, setLoanApplication] = React.useState<LoanApplication>();

  const {
    pageIndex,
    pageSize,
    sorting,
    searchValue,
    queryParams,
    handlePaginationChange,
    handleSortingChange,
    handleSearchChange,
  } = useDataTable<LoanApplicationSortField, LoanApplicationInclude>({
    defaultPageSize: 20,
    defaultIncludes: [
      'thirdParty',
      'creditProduct',
      'creditFund',
      'paymentFrequency',
      'affiliationOffice',
      'bank',
      'channel',
      'insuranceCompany',
      'rejectionReason',
      'loanApplicationCoDebtors',
      'loanApplicationDocuments',
      'loanApplicationPledges',
      'currentApprovalLevel',
      'targetApprovalLevel',
      'loanApplicationApprovalHistory',
      'loanApplicationStatusHistory',
      'loanApplicationRiskAssessments',
    ],
    defaultSorting: [{ field: 'createdAt', order: 'asc' }],
  });

  const { data, isLoading, isFetching, refetch } = useLoanApplicationInbox(queryParams);
  const { mutateAsync: approveLoanApplication, isPending: isApprovingStep } =
    useApproveLoanApplication();
  const { mutateAsync: cancelLoanApplication, isPending: isCanceling } = useCancelLoanApplication();
  const { mutateAsync: rejectLoanApplication, isPending: isRejecting } = useRejectLoanApplication();

  const { data: rejectionReasonsData } = useRejectionReasons({
    limit: 1000,
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'name', order: 'asc' }],
  });
  const rejectionReasons = rejectionReasonsData?.body?.data ?? [];

  const [openedInfoSheet, setOpenedInfoSheet] = React.useState(false);
  const [openedFinalApproveDialog, setOpenedFinalApproveDialog] = React.useState(false);
  const [openedStepApproveDialog, setOpenedStepApproveDialog] = React.useState(false);
  const [openedCancelDialog, setOpenedCancelDialog] = React.useState(false);
  const [openedRejectDialog, setOpenedRejectDialog] = React.useState(false);

  const [stepApproveNote, setStepApproveNote] = React.useState('');
  const [cancelNote, setCancelNote] = React.useState('');
  const [rejectNote, setRejectNote] = React.useState('');
  const [rejectReasonId, setRejectReasonId] = React.useState<number | undefined>();

  const handleInfoSheetChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        setLoanApplication(undefined);
      }
      setOpenedInfoSheet(open);
    },
    [setLoanApplication]
  );

  const handleRowOpen = React.useCallback((row: LoanApplication) => {
    setLoanApplication(row);
    setOpenedInfoSheet(true);
  }, []);

  const handleRowApprove = React.useCallback((row: LoanApplication) => {
    setLoanApplication(row);

    if (isFinalApprovalLevel(row)) {
      setOpenedFinalApproveDialog(true);
      return;
    }

    setStepApproveNote('');
    setOpenedStepApproveDialog(true);
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

  const submitStepApprove = React.useCallback(async () => {
    if (!loanApplication?.id || !stepApproveNote.trim()) return;

    await approveLoanApplication({
      params: { id: loanApplication.id },
      body: {
        mode: 'STEP',
        approvalNote: stepApproveNote.trim(),
      },
    });

    setOpenedStepApproveDialog(false);
    setLoanApplication(undefined);
  }, [approveLoanApplication, loanApplication, stepApproveNote]);

  const submitCancel = React.useCallback(async () => {
    if (!loanApplication?.id || !cancelNote.trim()) return;

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

  const tableMeta = React.useMemo<TableMeta<LoanApplication>>(
    () => ({
      onRowView: handleRowOpen,
      onRowApprove: handleRowApprove,
      onRowCancel: handleRowCancel,
      onRowReject: handleRowReject,
    }),
    [handleRowOpen, handleRowApprove, handleRowCancel, handleRowReject]
  );

  return (
    <>
      <PageHeader
        title="Aprobacion de solicitudes"
        description="Revise las solicitudes pendientes asignadas a su usuario y ejecute acciones de aprobacion."
      />
      <PageContent>
        <DataTable
          columns={LoanApplicationApprovalColumns}
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
            <LoanApplicationApprovalToolbar
              searchValue={searchValue}
              onSearchChange={handleSearchChange}
              onRefresh={() => refetch()}
              isRefreshing={isFetching && !isLoading}
            />
          }
          emptyMessage="No hay solicitudes asignadas en su bandeja."
          meta={tableMeta}
        />
      </PageContent>

      <LoanApplicationInfo
        loanApplication={loanApplication}
        opened={openedInfoSheet}
        onOpened={handleInfoSheetChange}
      />

      <LoanApplicationApproveDialog
        loanApplication={loanApplication}
        opened={openedFinalApproveDialog}
        onOpened={setOpenedFinalApproveDialog}
        onApproved={() => {
          setOpenedFinalApproveDialog(false);
          setLoanApplication(undefined);
        }}
      />

      <Dialog open={openedStepApproveDialog} onOpenChange={setOpenedStepApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprobar y enviar al siguiente nivel</DialogTitle>
            <DialogDescription>
              Esta accion mantiene la solicitud pendiente y la reasigna al siguiente nivel de
              aprobacion.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="stepApproveNote">Nota de aprobacion</Label>
            <Textarea
              id="stepApproveNote"
              value={stepApproveNote}
              onChange={(event) => setStepApproveNote(event.target.value)}
              placeholder="Ingrese observaciones de aprobacion..."
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenedStepApproveDialog(false)}>
              Cerrar
            </Button>
            <Button onClick={submitStepApprove} disabled={isApprovingStep || !stepApproveNote.trim()}>
              {isApprovingStep ? <Spinner /> : null}
              Aprobar y continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              {isCanceling ? <Spinner /> : null}
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
              {isRejecting ? <Spinner /> : null}
              Rechazar solicitud
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
