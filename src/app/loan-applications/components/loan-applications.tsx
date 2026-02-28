'use client';

import { api } from '@/clients/api';
import { DataTable, ExportDropdown, useDataTable } from '@/components/data-table';
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
import { useIamUsers } from '@/hooks/queries/use-iam-user-queries';
import {
  useLoanApplications,
  useReassignLoanApplication,
  useReassignLoanApplications,
} from '@/hooks/queries/use-loan-application-queries';
import {
  LoanApplication,
  LoanApplicationInclude,
  LOAN_APPLICATION_STATUS_OPTIONS,
  LoanApplicationSortField,
  LoanApplicationStatus,
} from '@/schemas/loan-application';
import { RowData, TableMeta } from '@tanstack/react-table';
import React from 'react';
import { LoanApplicationApprovalLoadSheet } from './loan-application-approval-load-sheet';
import { loanApplicationColumns } from './loan-application-columns';
import { LoanApplicationForm } from './loan-application-form';
import { loanApplicationExportConfig } from './loan-application-export-config';
import { LoanApplicationInfo } from './loan-application-info';
import { LoanApplicationsToolbar } from './loan-application-toolbar';

declare module '@tanstack/table-core' {
  interface TableMeta<TData extends RowData> {
    onRowView?: (row: TData) => void;
    onRowEdit?: (row: TData) => void;
    onRowReassign?: (row: TData) => void;
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
    defaultSorting: [{ field: 'createdAt', order: 'desc' }],
  });

  const { data, isLoading, isFetching, refetch } = useLoanApplications(queryParams);
  const { mutateAsync: reassignLoanApplications, isPending: isReassigning } =
    useReassignLoanApplications();
  const { mutateAsync: reassignLoanApplication, isPending: isSingleReassigning } =
    useReassignLoanApplication();

  const { data: iamUsersData } = useIamUsers({ limit: 200, isEmployee: true });
  const iamUsers = React.useMemo(() => iamUsersData?.body?.data ?? [], [iamUsersData]);

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

  const assignedUserFilter = React.useMemo(() => {
    const assignedUserId = filters.assignedApprovalUserId;
    return typeof assignedUserId === 'string' ? assignedUserId : undefined;
  }, [filters.assignedApprovalUserId]);

  const assignedUserOptions = React.useMemo(
    () => iamUsers.map((user) => ({ label: user.displayName, value: user.id })),
    [iamUsers]
  );

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

  const [openedReassignDialog, setOpenedReassignDialog] = React.useState(false);
  const [fromAssignedUserId, setFromAssignedUserId] = React.useState<string>('');
  const [reassignStrategy, setReassignStrategy] = React.useState<'TO_USER' | 'ROUND_ROBIN'>('TO_USER');
  const [toAssignedUserId, setToAssignedUserId] = React.useState<string>('');
  const [reassignNote, setReassignNote] = React.useState('');

  const [singleReassignLoanApplication, setSingleReassignLoanApplication] =
    React.useState<LoanApplication>();
  const [openedSingleReassignDialog, setOpenedSingleReassignDialog] = React.useState(false);
  const [singleReassignStrategy, setSingleReassignStrategy] = React.useState<
    'TO_USER' | 'ROUND_ROBIN'
  >('TO_USER');
  const [singleToAssignedUserId, setSingleToAssignedUserId] = React.useState<string>('');
  const [singleReassignNote, setSingleReassignNote] = React.useState('');
  const [openedLoadSheet, setOpenedLoadSheet] = React.useState(false);

  const handleCreate = React.useCallback(() => {
    setLoanApplication(undefined);
    setOpenedFormSheet(true);
  }, []);

  const handleOpenReassign = React.useCallback(() => {
    setFromAssignedUserId('');
    setReassignStrategy('TO_USER');
    setToAssignedUserId('');
    setReassignNote('');
    setOpenedReassignDialog(true);
  }, []);

  const handleRowOpen = React.useCallback((row: LoanApplication) => {
    setLoanApplication(row);
    setOpenedInfoSheet(true);
  }, []);

  const handleRowEdit = React.useCallback((row: LoanApplication) => {
    setLoanApplication(row);
    setOpenedFormSheet(true);
  }, []);

  const handleRowReassign = React.useCallback((row: LoanApplication) => {
    setSingleReassignLoanApplication(row);
    setSingleReassignStrategy('TO_USER');
    setSingleToAssignedUserId('');
    setSingleReassignNote('');
    setOpenedSingleReassignDialog(true);
  }, []);

  const handleSubmitReassign = React.useCallback(async () => {
    if (!fromAssignedUserId) return;
    if (reassignStrategy === 'TO_USER' && !toAssignedUserId) return;

    await reassignLoanApplications({
      body: {
        fromAssignedUserId,
        strategy: reassignStrategy,
        toAssignedUserId: reassignStrategy === 'TO_USER' ? toAssignedUserId : undefined,
        note: reassignNote.trim() || undefined,
      },
    });

    setOpenedReassignDialog(false);
  }, [
    fromAssignedUserId,
    reassignLoanApplications,
    reassignNote,
    reassignStrategy,
    toAssignedUserId,
  ]);

  const handleSubmitSingleReassign = React.useCallback(async () => {
    if (!singleReassignLoanApplication?.id) return;
    if (singleReassignStrategy === 'TO_USER' && !singleToAssignedUserId) return;

    await reassignLoanApplication({
      params: { id: singleReassignLoanApplication.id },
      body: {
        strategy: singleReassignStrategy,
        toAssignedUserId: singleReassignStrategy === 'TO_USER' ? singleToAssignedUserId : undefined,
        note: singleReassignNote.trim() || undefined,
      },
    });

    setOpenedSingleReassignDialog(false);
    setSingleReassignLoanApplication(undefined);
  }, [
    reassignLoanApplication,
    singleReassignLoanApplication,
    singleReassignNote,
    singleReassignStrategy,
    singleToAssignedUserId,
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
      onRowReassign: handleRowReassign,
    }),
    [handleRowOpen, handleRowEdit, handleRowReassign]
  );

  const isReassignDisabled =
    !fromAssignedUserId || (reassignStrategy === 'TO_USER' && !toAssignedUserId) || isReassigning;
  const isSingleReassignDisabled =
    !singleReassignLoanApplication?.id ||
    (singleReassignStrategy === 'TO_USER' && !singleToAssignedUserId) ||
    isSingleReassigning;

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
              assignedUserFilter={assignedUserFilter}
              assignedUserOptions={assignedUserOptions}
              onAssignedUserFilterChange={(value) =>
                handleFilterChange('assignedApprovalUserId', value)
              }
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
              onReassign={handleOpenReassign}
              onApprovalLoad={() => setOpenedLoadSheet(true)}
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
      />
      <LoanApplicationForm
        loanApplication={loanApplication}
        opened={openedFormSheet}
        onOpened={handleFormSheetChange}
      />
      <LoanApplicationApprovalLoadSheet
        opened={openedLoadSheet}
        onOpened={setOpenedLoadSheet}
      />

      <Dialog
        open={openedSingleReassignDialog}
        onOpenChange={(open) => {
          setOpenedSingleReassignDialog(open);
          if (!open) setSingleReassignLoanApplication(undefined);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reasignar solicitud</DialogTitle>
            <DialogDescription>
              Reasigne la solicitud {singleReassignLoanApplication?.creditNumber ?? ''} manteniendo
              su nivel actual de aprobacion.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>Asignado actual</Label>
            <div className="text-muted-foreground rounded-md border px-3 py-2 text-sm">
              {singleReassignLoanApplication?.assignedApprovalUserName ??
                singleReassignLoanApplication?.assignedApprovalUserId ??
                '-'}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="singleReassignStrategy">Estrategia</Label>
            <Select
              value={singleReassignStrategy}
              onValueChange={(value) =>
                setSingleReassignStrategy(value as 'TO_USER' | 'ROUND_ROBIN')
              }
            >
              <SelectTrigger id="singleReassignStrategy">
                <SelectValue placeholder="Seleccione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TO_USER">Mover a usuario</SelectItem>
                <SelectItem value="ROUND_ROBIN">Round robin (mismo nivel)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {singleReassignStrategy === 'TO_USER' ? (
            <div className="space-y-2">
              <Label htmlFor="singleToAssignedUserId">Usuario destino</Label>
              <Select value={singleToAssignedUserId} onValueChange={setSingleToAssignedUserId}>
                <SelectTrigger id="singleToAssignedUserId">
                  <SelectValue placeholder="Seleccione..." />
                </SelectTrigger>
                <SelectContent>
                  {iamUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="singleReassignNote">Nota (opcional)</Label>
            <Textarea
              id="singleReassignNote"
              value={singleReassignNote}
              onChange={(event) => setSingleReassignNote(event.target.value)}
              placeholder="Detalle de la reasignacion..."
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setOpenedSingleReassignDialog(false);
                setSingleReassignLoanApplication(undefined);
              }}
            >
              Cerrar
            </Button>
            <Button onClick={handleSubmitSingleReassign} disabled={isSingleReassignDisabled}>
              {isSingleReassigning ? <Spinner /> : null}
              Reasignar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openedReassignDialog} onOpenChange={setOpenedReassignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reasignar solicitudes</DialogTitle>
            <DialogDescription>
              Reasigne todas las solicitudes pendientes de un usuario a otro usuario o por round robin
              en el mismo nivel.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="fromAssignedUserId">Usuario origen</Label>
            <Select value={fromAssignedUserId} onValueChange={setFromAssignedUserId}>
              <SelectTrigger id="fromAssignedUserId">
                <SelectValue placeholder="Seleccione..." />
              </SelectTrigger>
              <SelectContent>
                {iamUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reassignStrategy">Estrategia</Label>
            <Select
              value={reassignStrategy}
              onValueChange={(value) =>
                setReassignStrategy(value as 'TO_USER' | 'ROUND_ROBIN')
              }
            >
              <SelectTrigger id="reassignStrategy">
                <SelectValue placeholder="Seleccione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TO_USER">Mover a usuario</SelectItem>
                <SelectItem value="ROUND_ROBIN">Round robin (mismo nivel)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {reassignStrategy === 'TO_USER' ? (
            <div className="space-y-2">
              <Label htmlFor="toAssignedUserId">Usuario destino</Label>
              <Select value={toAssignedUserId} onValueChange={setToAssignedUserId}>
                <SelectTrigger id="toAssignedUserId">
                  <SelectValue placeholder="Seleccione..." />
                </SelectTrigger>
                <SelectContent>
                  {iamUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="reassignNote">Nota (opcional)</Label>
            <Textarea
              id="reassignNote"
              value={reassignNote}
              onChange={(event) => setReassignNote(event.target.value)}
              placeholder="Detalle de la reasignacion..."
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenedReassignDialog(false)}>
              Cerrar
            </Button>
            <Button onClick={handleSubmitReassign} disabled={isReassignDisabled}>
              {isReassigning ? <Spinner /> : null}
              Reasignar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
