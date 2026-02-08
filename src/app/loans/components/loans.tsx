'use client';

import { DataTable, useDataTable } from '@/components/data-table';
import { PageContent, PageHeader } from '@/components/layout';
import { useLoans } from '@/hooks/queries/use-loan-queries';
import { Loan, LoanInclude, LOAN_STATUS_OPTIONS, LoanSortField, LoanStatus } from '@/schemas/loan';
import { RowData, TableMeta } from '@tanstack/react-table';
import React from 'react';
import { loanColumns } from './loan-columns';
import { LoanInfo } from './loan-info';
import { LoansToolbar } from './loan-toolbar';

declare module '@tanstack/table-core' {
  interface TableMeta<TData extends RowData> {
    onRowView?: (row: TData) => void;
  }
}

export function Loans() {
  const [loan, setLoan] = React.useState<Loan>();

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
  } = useDataTable<LoanSortField, LoanInclude>({
    defaultPageSize: 20,
    defaultIncludes: [
      'borrower',
      'disbursementParty',
      'affiliationOffice',
      'paymentFrequency',
      'loanApplication',
    ],
    defaultSorting: [{ field: 'createdAt', order: 'desc' }],
  });

  const { data, isLoading, isFetching, refetch } = useLoans(queryParams);

  const rangeDateFilter = React.useMemo(() => {
    const recordDate = filters.recordDate as { gte?: Date; lte?: Date } | undefined;
    if (!recordDate) return undefined;
    const from = recordDate.gte;
    const to = recordDate.lte;
    if (!from && !to) return undefined;
    return { from, to };
  }, [filters.recordDate]);

  const statusFilter = React.useMemo(() => {
    const status = filters.status;
    if (!status || typeof status !== 'string') return undefined;
    if (LOAN_STATUS_OPTIONS.includes(status as LoanStatus)) {
      return status as LoanStatus;
    }
    return undefined;
  }, [filters.status]);

  const [openedInfoSheet, setOpenedInfoSheet] = React.useState(false);
  const handleInfoSheetChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        setLoan(undefined);
      }
      setOpenedInfoSheet(open);
    },
    [setLoan, setOpenedInfoSheet]
  );

  const handleRowOpen = React.useCallback((row: Loan) => {
    setLoan(row);
    setOpenedInfoSheet(true);
  }, []);

  const tableMeta = React.useMemo<TableMeta<Loan>>(
    () => ({
      onRowView: handleRowOpen,
    }),
    [handleRowOpen]
  );

  return (
    <>
      <PageHeader
        title="Creditos"
        description="Consulte creditos, cuotas y abonos asociados."
      />
      <PageContent>
        <DataTable
          columns={loanColumns}
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
            <LoansToolbar
              searchValue={searchValue}
              onSearchChange={handleSearchChange}
              statusFilter={statusFilter}
              onStatusFilterChange={(value) => handleFilterChange('status', value)}
              rangeDateFilter={rangeDateFilter}
              onRangeDateFilterChange={(value) => {
                if (value?.from && value?.to) {
                  handleFilterChange('recordDate', { gte: value.from, lte: value.to });
                } else if (value?.from) {
                  handleFilterChange('recordDate', { gte: value.from });
                } else if (value?.to) {
                  handleFilterChange('recordDate', { lte: value.to });
                } else {
                  handleFilterChange('recordDate', undefined);
                }
              }}
              onReset={resetFilters}
              onRefresh={() => refetch()}
              isRefreshing={isFetching && !isLoading}
            />
          }
          emptyMessage="No hay informacion. Intente ajustar los filtros."
          meta={tableMeta}
        />
      </PageContent>

      <LoanInfo loan={loan} opened={openedInfoSheet} onOpened={handleInfoSheetChange} />
    </>
  );
}
