'use client';

import { ProcessRunInfo } from '@/app/process-runs/components/process-run-info';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useProcessRun, useProcessRuns } from '@/hooks/queries/use-process-run-queries';
import { ProcessRun } from '@/schemas/process-run';
import { formatCurrency, formatDate, formatDateTime } from '@/utils/formatters';
import React from 'react';
import { toast } from 'sonner';

type CausationRunError = {
  loanId: number;
  creditNumber: string;
  reason: string;
};

type CausationRunStatus = {
  status: string;
  scopeType: string;
  processDate: string;
  transactionDate: string;
  reviewedCredits: number;
  accruedCredits: number;
  failedCredits: number;
  totalAccruedAmount: number;
  errors: CausationRunError[];
  startedAt: string | null;
  finishedAt: string | null;
  message: string;
};

function getPreferredRun(runs: ProcessRun[]) {
  return (
    runs.find((item) => item.status === 'RUNNING') ??
    runs.find((item) => item.status === 'QUEUED') ??
    runs[0]
  );
}

function ProcessRunStatusBadge({ status }: { status: string }) {
  const variant =
    status === 'COMPLETED'
      ? 'default'
      : status === 'FAILED'
        ? 'destructive'
        : status === 'RUNNING'
          ? 'secondary'
          : 'outline';

  return <Badge variant={variant}>{status}</Badge>;
}

export function CausationProcessRunMonitor({
  processTypeFilter,
  selectedRunId,
  onSelectedRunIdChange,
  runStatus,
  isFetchingRunStatus,
  scopeLabels,
}: {
  processTypeFilter: string;
  selectedRunId: number | null;
  onSelectedRunIdChange(runId: number): void;
  runStatus: CausationRunStatus | undefined;
  isFetchingRunStatus: boolean;
  scopeLabels: Record<string, string>;
}) {
  const [openedInfoSheet, setOpenedInfoSheet] = React.useState(false);
  const previousRunStatusRef = React.useRef<string | null>(null);

  const {
    data: recentRunsData,
    isLoading: isLoadingRecentRuns,
    isFetching: isFetchingRecentRuns,
    refetch: refetchRecentRuns,
  } = useProcessRuns({
    limit: 10,
    include: ['accountingPeriod'],
    sort: [{ field: 'createdAt', order: 'desc' }],
    where: { and: [{ processType: processTypeFilter }] },
  });

  const recentRuns = React.useMemo(() => recentRunsData?.body.data ?? [], [recentRunsData]);
  const shouldPollSelectedRun = runStatus?.status === 'QUEUED' || runStatus?.status === 'RUNNING';
  const { data: selectedProcessRunData } = useProcessRun(selectedRunId ?? 0, {
    include: ['accountingPeriod'],
    enabled: openedInfoSheet && Boolean(selectedRunId),
    refetchInterval: openedInfoSheet && shouldPollSelectedRun ? 3000 : false,
  });

  const selectedProcessRun = React.useMemo(
    () => selectedProcessRunData?.body ?? recentRuns.find((item) => item.id === selectedRunId),
    [recentRuns, selectedProcessRunData?.body, selectedRunId]
  );

  React.useEffect(() => {
    if (!recentRuns.length) return;
    const selectedExists = selectedRunId
      ? recentRuns.some((item) => item.id === selectedRunId)
      : false;

    if (!selectedRunId || !selectedExists) {
      const preferredRun = getPreferredRun(recentRuns);
      if (preferredRun) {
        onSelectedRunIdChange(preferredRun.id);
      }
    }
  }, [onSelectedRunIdChange, recentRuns, selectedRunId]);

  React.useEffect(() => {
    if (!selectedRunId) return;
    previousRunStatusRef.current = null;
    void refetchRecentRuns();
  }, [refetchRecentRuns, selectedRunId]);

  React.useEffect(() => {
    if (!shouldPollSelectedRun) return;

    const intervalId = window.setInterval(() => {
      void refetchRecentRuns();
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [refetchRecentRuns, shouldPollSelectedRun]);

  React.useEffect(() => {
    if (!runStatus) return;
    const previousStatus = previousRunStatusRef.current;

    if (previousStatus && previousStatus !== runStatus.status && runStatus.status === 'COMPLETED') {
      toast.success(`Causación finalizada. Créditos causados: ${runStatus.accruedCredits}`);
      void refetchRecentRuns();
    }

    if (
      previousStatus &&
      previousStatus !== runStatus.status &&
      (runStatus.status === 'FAILED' || runStatus.status === 'CANCELED')
    ) {
      toast.error(runStatus.message || 'La causación finalizó con error');
      void refetchRecentRuns();
    }

    previousRunStatusRef.current = runStatus.status;
  }, [refetchRecentRuns, runStatus]);

  return (
    <>
      {selectedRunId ? (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-1">
                <CardTitle>Corrida seleccionada</CardTitle>
                <CardDescription>
                  Run #{selectedRunId} {isFetchingRunStatus ? '- actualizando...' : ''}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => void refetchRecentRuns()}>
                  Actualizar corridas
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenedInfoSheet(true)}
                  disabled={!selectedProcessRun}
                >
                  Ver detalle
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {runStatus ? (
              <>
                <div className="grid gap-3 md:grid-cols-6">
                  <div>
                    <p className="text-muted-foreground text-xs">Estado</p>
                    <div className="pt-1">
                      <ProcessRunStatusBadge status={runStatus.status} />
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Alcance</p>
                    <p className="font-medium">
                      {scopeLabels[runStatus.scopeType] ?? runStatus.scopeType}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Fecha</p>
                    <p className="font-medium">{formatDate(runStatus.processDate)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Fecha movimiento</p>
                    <p className="font-medium">{formatDate(runStatus.transactionDate)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Créditos revisados</p>
                    <p className="font-medium">{runStatus.reviewedCredits}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Créditos causados</p>
                    <p className="font-medium">{runStatus.accruedCredits}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Créditos con error</p>
                    <p className="font-medium">{runStatus.failedCredits}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Valor causado</p>
                    <p className="font-medium">{formatCurrency(runStatus.totalAccruedAmount)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Inicio ejecución</p>
                    <p className="font-medium">
                      {runStatus.startedAt ? formatDateTime(runStatus.startedAt) : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Fin ejecución</p>
                    <p className="font-medium">
                      {runStatus.finishedAt ? formatDateTime(runStatus.finishedAt) : '-'}
                    </p>
                  </div>
                  <div className="md:col-span-6">
                    <p className="text-muted-foreground text-xs">Mensaje</p>
                    <p className="font-medium">{runStatus.message}</p>
                  </div>
                </div>

                {runStatus.errors.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID crédito</TableHead>
                        <TableHead>Número crédito</TableHead>
                        <TableHead>Motivo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {runStatus.errors.map((error, index) => (
                        <TableRow key={`${error.loanId}-${index}`}>
                          <TableCell>{error.loanId}</TableCell>
                          <TableCell>{error.creditNumber}</TableCell>
                          <TableCell>{error.reason}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : null}
              </>
            ) : (
              <div className="text-muted-foreground text-sm">Consultando estado de la corrida...</div>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Últimas corridas</CardTitle>
          <CardDescription>
            Se selecciona automáticamente la corrida en ejecución; si no hay una activa, se toma la más reciente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingRecentRuns ? (
            <div className="text-muted-foreground text-sm">Cargando corridas recientes...</div>
          ) : recentRuns.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Run</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Alcance</TableHead>
                  <TableHead>Fecha proceso</TableHead>
                  <TableHead>Fecha movimiento</TableHead>
                  <TableHead>Ejecutado por</TableHead>
                  <TableHead>Inicio</TableHead>
                  <TableHead className="w-[140px] text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentRuns.map((item) => {
                  const isSelected = item.id === selectedRunId;

                  return (
                    <TableRow
                      key={item.id}
                      className={isSelected ? 'bg-muted/50' : 'cursor-pointer'}
                      onClick={() => onSelectedRunIdChange(item.id)}
                    >
                      <TableCell className="font-medium">#{item.id}</TableCell>
                      <TableCell>
                        <ProcessRunStatusBadge status={item.status} />
                      </TableCell>
                      <TableCell>{scopeLabels[item.scopeType] ?? item.scopeType}</TableCell>
                      <TableCell>{formatDate(item.processDate)}</TableCell>
                      <TableCell>{formatDate(item.transactionDate)}</TableCell>
                      <TableCell>{item.executedByUserName}</TableCell>
                      <TableCell>{formatDateTime(item.startedAt ?? item.executedAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            onSelectedRunIdChange(item.id);
                            setOpenedInfoSheet(true);
                          }}
                        >
                          Ver detalle
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-muted-foreground text-sm">No hay corridas registradas.</div>
          )}
          {isFetchingRecentRuns && !isLoadingRecentRuns ? (
            <p className="text-muted-foreground mt-3 text-xs">Actualizando corridas recientes...</p>
          ) : null}
        </CardContent>
      </Card>

      <ProcessRunInfo
        processRun={selectedProcessRun}
        opened={openedInfoSheet}
        onOpened={setOpenedInfoSheet}
      />
    </>
  );
}
