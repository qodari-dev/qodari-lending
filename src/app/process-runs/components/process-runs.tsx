'use client';

import { DataTable, useDataTable } from '@/components/data-table';
import { PageContent, PageHeader } from '@/components/layout';
import { useProcessRuns } from '@/hooks/queries/use-process-run-queries';
import { ProcessRun, ProcessRunInclude, ProcessRunSortField } from '@/schemas/process-run';
import { RowData, TableMeta } from '@tanstack/react-table';
import * as React from 'react';
import { processRunColumns } from './process-run-columns';
import { ProcessRunInfo } from './process-run-info';
import { ProcessRunsToolbar } from './process-runs-toolbar';

declare module '@tanstack/table-core' {
  interface TableMeta<TData extends RowData> {
    onRowView?: (row: TData) => void;
  }
}

export function ProcessRuns() {
  const [processRun, setProcessRun] = React.useState<ProcessRun>();

  const {
    pageIndex,
    pageSize,
    sorting,
    searchValue,
    queryParams,
    handlePaginationChange,
    handleSortingChange,
    handleSearchChange,
  } = useDataTable<ProcessRunSortField, ProcessRunInclude>({
    defaultPageSize: 20,
    defaultIncludes: ['accountingPeriod'],
    defaultSorting: [{ field: 'createdAt', order: 'desc' }],
  });

  const { data, isLoading, isFetching, refetch } = useProcessRuns(queryParams);

  const [openedInfoSheet, setOpenedInfoSheet] = React.useState(false);
  const handleInfoSheetChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        setProcessRun(undefined);
      }
      setOpenedInfoSheet(open);
    },
    [setProcessRun, setOpenedInfoSheet]
  );

  const handleRowOpen = React.useCallback((row: ProcessRun) => {
    setProcessRun(row);
    setOpenedInfoSheet(true);
  }, []);

  const tableMeta = React.useMemo<TableMeta<ProcessRun>>(
    () => ({
      onRowView: handleRowOpen,
    }),
    [handleRowOpen]
  );

  return (
    <>
      <PageHeader
        title="Corridas de procesos"
        description="Consulta histórica de process_runs para causación y cierres."
      />
      <PageContent>
        <DataTable
          columns={processRunColumns}
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
            <ProcessRunsToolbar
              searchValue={searchValue}
              onSearchChange={handleSearchChange}
              onRefresh={() => refetch()}
              isRefreshing={isFetching && !isLoading}
            />
          }
          emptyMessage="No hay corridas registradas."
          meta={tableMeta}
        />
      </PageContent>

      <ProcessRunInfo processRun={processRun} opened={openedInfoSheet} onOpened={handleInfoSheetChange} />
    </>
  );
}
