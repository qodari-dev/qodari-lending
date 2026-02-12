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
import { Input } from '@/components/ui/input';
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
import { useAgreements } from '@/hooks/queries/use-agreement-queries';
import {
  useApproveLoanApplication,
  useCancelLoanApplication,
  useLoanApplicationActNumbers,
  useLoanApplications,
  useRejectLoanApplication,
} from '@/hooks/queries/use-loan-application-queries';
import { usePaymentGuaranteeTypes } from '@/hooks/queries/use-payment-guarantee-type-queries';
import { useRejectionReasons } from '@/hooks/queries/use-rejection-reason-queries';
import { useRepaymentMethods } from '@/hooks/queries/use-repayment-method-queries';
import { useThirdParties } from '@/hooks/queries/use-third-party-queries';
import {
  LoanApplication,
  LoanApplicationInclude,
  LOAN_APPLICATION_STATUS_OPTIONS,
  LoanApplicationStatus,
  LoanApplicationSortField,
} from '@/schemas/loan-application';
import { formatDateISO } from '@/utils/formatters';
import { RowData, TableMeta } from '@tanstack/react-table';
import React from 'react';
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

function getThirdPartyLabel(item: {
  personType: 'NATURAL' | 'LEGAL';
  businessName?: string | null;
  firstName?: string | null;
  secondName?: string | null;
  firstLastName?: string | null;
  secondLastName?: string | null;
  documentNumber: string;
}): string {
  if (item.personType === 'LEGAL') {
    return item.businessName ?? item.documentNumber;
  }

  const fullName = [item.firstName, item.secondName, item.firstLastName, item.secondLastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  return fullName || item.documentNumber;
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
  const { mutateAsync: approveLoanApplication, isPending: isApproving } =
    useApproveLoanApplication();
  const { mutateAsync: cancelLoanApplication, isPending: isCanceling } = useCancelLoanApplication();
  const { mutateAsync: rejectLoanApplication, isPending: isRejecting } = useRejectLoanApplication();

  const { data: rejectionReasonsData } = useRejectionReasons({
    limit: 1000,
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'name', order: 'asc' }],
  });
  const rejectionReasons = rejectionReasonsData?.body?.data ?? [];

  const { data: repaymentMethodsData } = useRepaymentMethods({
    limit: 1000,
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'name', order: 'asc' }],
  });
  const repaymentMethods = repaymentMethodsData?.body?.data ?? [];

  const { data: paymentGuaranteeTypesData } = usePaymentGuaranteeTypes({
    limit: 1000,
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'name', order: 'asc' }],
  });
  const paymentGuaranteeTypes = paymentGuaranteeTypesData?.body?.data ?? [];

  const { data: agreementsData } = useAgreements({
    limit: 1000,
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'businessName', order: 'asc' }],
  });
  const agreements = React.useMemo(() => agreementsData?.body?.data ?? [], [agreementsData]);

  const { data: thirdPartiesData } = useThirdParties({
    limit: 1000,
    sort: [{ field: 'createdAt', order: 'desc' }],
  });
  const thirdParties = thirdPartiesData?.body?.data ?? [];

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
  const [approveRepaymentMethodId, setApproveRepaymentMethodId] = React.useState<
    number | undefined
  >();
  const [approvePaymentGuaranteeTypeId, setApprovePaymentGuaranteeTypeId] = React.useState<
    number | undefined
  >();
  const [approveAgreementId, setApproveAgreementId] = React.useState<number | undefined>();
  const [approveApprovedAmount, setApproveApprovedAmount] = React.useState('');
  const [approveActNumber, setApproveActNumber] = React.useState('');
  const [approvePayeeThirdPartyId, setApprovePayeeThirdPartyId] = React.useState<
    number | undefined
  >();
  const [approveFirstCollectionDate, setApproveFirstCollectionDate] = React.useState('');
  const [openedRejectDialog, setOpenedRejectDialog] = React.useState(false);
  const [rejectNote, setRejectNote] = React.useState('');
  const [rejectReasonId, setRejectReasonId] = React.useState<number | undefined>();

  const { data: actNumbersData, isLoading: isLoadingActNumbers } = useLoanApplicationActNumbers({
    affiliationOfficeId: loanApplication?.affiliationOfficeId ?? 0,
    limit: 100,
  });
  const actNumbers = React.useMemo(() => actNumbersData?.body ?? [], [actNumbersData]);

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
    setApproveRepaymentMethodId(row.repaymentMethodId ?? undefined);
    setApprovePaymentGuaranteeTypeId(row.paymentGuaranteeTypeId ?? undefined);
    setApproveAgreementId(undefined);
    setApproveApprovedAmount(String(row.requestedAmount ?? '0'));
    setApproveActNumber(row.actNumber ?? '');
    setApprovePayeeThirdPartyId(row.thirdPartyId);
    setApproveFirstCollectionDate(formatDateISO(new Date()));
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

  React.useEffect(() => {
    if (!openedApproveDialog || approveActNumber || !actNumbers.length) return;
    setApproveActNumber(actNumbers[0]?.actNumber ?? '');
  }, [actNumbers, approveActNumber, openedApproveDialog]);

  React.useEffect(() => {
    if (!openedApproveDialog || approveAgreementId || !agreements.length) return;
    setApproveAgreementId(agreements[0]?.id);
  }, [agreements, approveAgreementId, openedApproveDialog]);

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

  const submitApprove = React.useCallback(async () => {
    if (
      !loanApplication?.id ||
      !approveRepaymentMethodId ||
      !approvePaymentGuaranteeTypeId ||
      !approveAgreementId ||
      !approveApprovedAmount.trim() ||
      !approveActNumber.trim() ||
      !approvePayeeThirdPartyId ||
      !approveFirstCollectionDate
    ) {
      return;
    }

    await approveLoanApplication({
      params: { id: loanApplication.id },
      body: {
        repaymentMethodId: approveRepaymentMethodId,
        paymentGuaranteeTypeId: approvePaymentGuaranteeTypeId,
        agreementId: approveAgreementId,
        approvedAmount: approveApprovedAmount.trim(),
        actNumber: approveActNumber.trim(),
        payeeThirdPartyId: approvePayeeThirdPartyId,
        firstCollectionDate: new Date(`${approveFirstCollectionDate}T00:00:00`),
      },
    });

    setOpenedApproveDialog(false);
    setLoanApplication(undefined);
  }, [
    approveActNumber,
    approveAgreementId,
    approveApprovedAmount,
    approveFirstCollectionDate,
    approveLoanApplication,
    approvePaymentGuaranteeTypeId,
    approvePayeeThirdPartyId,
    approveRepaymentMethodId,
    loanApplication,
  ]);
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
        description="Administre solicitudes, terceros asociados, documentos y estado operativo."
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
                <ExportDropdown
                  config={loanApplicationExportConfig}
                  fetchAllData={fetchAllData}
                />
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
      />
      <LoanApplicationForm
        loanApplication={loanApplication}
        opened={openedFormSheet}
        onOpened={handleFormSheetChange}
      />

      <Dialog open={openedApproveDialog} onOpenChange={setOpenedApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprobar solicitud</DialogTitle>
            <DialogDescription>
              Complete los datos de aprobacion para generar el credito y su tabla de amortizacion.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="approveRepaymentMethodId">Forma de pago</Label>
              <Select
                value={approveRepaymentMethodId ? String(approveRepaymentMethodId) : ''}
                onValueChange={(value) =>
                  setApproveRepaymentMethodId(value ? Number(value) : undefined)
                }
              >
                <SelectTrigger id="approveRepaymentMethodId">
                  <SelectValue placeholder="Seleccione..." />
                </SelectTrigger>
                <SelectContent>
                  {repaymentMethods.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="approvePaymentGuaranteeTypeId">Garantia de pago</Label>
              <Select
                value={approvePaymentGuaranteeTypeId ? String(approvePaymentGuaranteeTypeId) : ''}
                onValueChange={(value) =>
                  setApprovePaymentGuaranteeTypeId(value ? Number(value) : undefined)
                }
              >
                <SelectTrigger id="approvePaymentGuaranteeTypeId">
                  <SelectValue placeholder="Seleccione..." />
                </SelectTrigger>
                <SelectContent>
                  {paymentGuaranteeTypes.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="approveAgreementId">Convenio</Label>
              <Select
                value={approveAgreementId ? String(approveAgreementId) : ''}
                onValueChange={(value) => setApproveAgreementId(value ? Number(value) : undefined)}
              >
                <SelectTrigger id="approveAgreementId">
                  <SelectValue placeholder="Seleccione..." />
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

            <div className="space-y-2">
              <Label htmlFor="approveApprovedAmount">Valor aprobado</Label>
              <Input
                id="approveApprovedAmount"
                value={approveApprovedAmount}
                onChange={(event) => setApproveApprovedAmount(event.target.value)}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="approveActNumber">Acta</Label>
              <Select
                value={approveActNumber}
                onValueChange={(value) => setApproveActNumber(value)}
                disabled={isLoadingActNumbers}
              >
                <SelectTrigger id="approveActNumber">
                  <SelectValue
                    placeholder={isLoadingActNumbers ? 'Cargando...' : 'Seleccione...'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {actNumbers.map((item) => (
                    <SelectItem key={item.id} value={item.actNumber}>
                      {item.actNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="approvePayeeThirdPartyId">Tercero desembolso</Label>
              <Select
                value={approvePayeeThirdPartyId ? String(approvePayeeThirdPartyId) : ''}
                onValueChange={(value) =>
                  setApprovePayeeThirdPartyId(value ? Number(value) : undefined)
                }
              >
                <SelectTrigger id="approvePayeeThirdPartyId">
                  <SelectValue placeholder="Seleccione..." />
                </SelectTrigger>
                <SelectContent>
                  {thirdParties.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {getThirdPartyLabel(item)} ({item.documentNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="approveFirstCollectionDate">Fecha primer recaudo</Label>
              <Input
                id="approveFirstCollectionDate"
                type="date"
                value={approveFirstCollectionDate}
                onChange={(event) => setApproveFirstCollectionDate(event.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenedApproveDialog(false)}>
              Cerrar
            </Button>
            <Button
              onClick={submitApprove}
              disabled={
                isApproving ||
                !approveRepaymentMethodId ||
                !approvePaymentGuaranteeTypeId ||
                !approveAgreementId ||
                !approveApprovedAmount.trim() ||
                !approveActNumber.trim() ||
                !approvePayeeThirdPartyId ||
                !approveFirstCollectionDate
              }
            >
              {isApproving && <Spinner />}
              Aprobar solicitud
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
