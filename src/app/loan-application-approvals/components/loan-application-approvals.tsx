'use client';

import { DataTable, useDataTable } from '@/components/data-table';
import { PageContent, PageHeader } from '@/components/layout';
import {
  useLoanApplicationInbox,
} from '@/hooks/queries/use-loan-application-queries';
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
import { LoanApplicationCancelDialog } from './loan-application-cancel-dialog';
import { LoanApplicationRejectDialog } from './loan-application-reject-dialog';

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

  const [openedInfoSheet, setOpenedInfoSheet] = React.useState(false);
  const [openedFinalApproveDialog, setOpenedFinalApproveDialog] = React.useState(false);
  const [openedStepApproveDialog, setOpenedStepApproveDialog] = React.useState(false);
  const [openedCancelDialog, setOpenedCancelDialog] = React.useState(false);
  const [openedRejectDialog, setOpenedRejectDialog] = React.useState(false);

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

    setOpenedStepApproveDialog(true);
  }, []);

  const handleRowCancel = React.useCallback((row: LoanApplication) => {
    setLoanApplication(row);
    setOpenedCancelDialog(true);
  }, []);

  const handleRowReject = React.useCallback((row: LoanApplication) => {
    setLoanApplication(row);
    setOpenedRejectDialog(true);
  }, []);

  const clearSelection = React.useCallback(() => {
    setLoanApplication(undefined);
  }, []);

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
        mode="FINAL"
        loanApplication={loanApplication}
        opened={openedFinalApproveDialog}
        onOpened={setOpenedFinalApproveDialog}
        onApproved={() => {
          setOpenedFinalApproveDialog(false);
          clearSelection();
        }}
      />

      <LoanApplicationApproveDialog
        mode="STEP"
        loanApplication={loanApplication}
        opened={openedStepApproveDialog}
        onOpened={setOpenedStepApproveDialog}
        onApproved={() => {
          setOpenedStepApproveDialog(false);
          clearSelection();
        }}
      />

      <LoanApplicationCancelDialog
        loanApplication={loanApplication}
        opened={openedCancelDialog}
        onOpenChange={setOpenedCancelDialog}
        onCanceled={clearSelection}
      />

      <LoanApplicationRejectDialog
        loanApplication={loanApplication}
        opened={openedRejectDialog}
        onOpenChange={setOpenedRejectDialog}
        onRejected={clearSelection}
      />
    </>
  );
}
