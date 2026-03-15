'use client';

import { PageContent, PageHeader } from '@/components/layout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  useRiskCenterReportRunItems,
  useRiskCenterReportRuns,
} from '@/hooks/queries/use-risk-center-report-queries';
import { formatCurrency, formatDate, formatDateTime } from '@/utils/formatters';
import { getThirdPartyLabel } from '@/utils/third-party';
import React from 'react';

export function RiskCenterReportHistory() {
  const { data, isLoading } = useRiskCenterReportRuns();
  const runs = React.useMemo(() => data?.body ?? [], [data]);
  const [selectedRunId, setSelectedRunId] = React.useState<number | undefined>(undefined);

  React.useEffect(() => {
    if (!runs.length) {
      setSelectedRunId(undefined);
      return;
    }

    setSelectedRunId((current) =>
      current && runs.some((run) => run.id === current) ? current : runs[0]?.id
    );
  }, [runs]);

  const { data: selectedRunData, isLoading: isLoadingItems } = useRiskCenterReportRunItems(
    selectedRunId,
    Boolean(selectedRunId)
  );
  const selectedRun = selectedRunData?.body.run;
  const items = selectedRunData?.body.items ?? [];

  return (
    <>
      <PageHeader
        title="Historial centrales de riesgo"
        description="Consulte corridas generadas y el detalle por credito reportado o excluido."
      />
      <PageContent>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Corridas</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Spinner className="size-4" />
                  Cargando corridas...
                </div>
              ) : runs.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Central</TableHead>
                      <TableHead>Corte creditos</TableHead>
                      <TableHead>Corte pagos</TableHead>
                      <TableHead>Revisados</TableHead>
                      <TableHead>Reportados</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Generado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runs.map((run) => {
                      const isSelected = run.id === selectedRunId;

                      return (
                        <TableRow
                          key={run.id}
                          className="cursor-pointer"
                          data-state={isSelected ? 'selected' : undefined}
                          onClick={() => setSelectedRunId(run.id)}
                        >
                          <TableCell>
                            <Badge variant="outline">{run.riskCenterType}</Badge>
                          </TableCell>
                          <TableCell>{formatDate(run.creditCutoffDate)}</TableCell>
                          <TableCell>{formatDate(run.paymentCutoffDate)}</TableCell>
                          <TableCell>{run.reviewedCredits}</TableCell>
                          <TableCell>{run.reportedCredits}</TableCell>
                          <TableCell>{run.generatedByUserName}</TableCell>
                          <TableCell>{formatDateTime(run.generatedAt)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No hay corridas registradas de centrales de riesgo.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Detalle de corrida
                {selectedRun ? (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {selectedRun.riskCenterType} - {selectedRun.fileName}
                  </span>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingItems ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Spinner className="size-4" />
                  Cargando detalle...
                </div>
              ) : items.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Credito</TableHead>
                      <TableHead>Tercero</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Reportado</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Dias mora</TableHead>
                      <TableHead>Saldo</TableHead>
                      <TableHead>Saldo mora</TableHead>
                      <TableHead>Terceros</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id} className={item.wasReported ? '' : 'bg-muted/30'}>
                        <TableCell>{item.loan?.creditNumber ?? item.loanId}</TableCell>
                        <TableCell>
                          {item.loan?.borrower ? getThirdPartyLabel(item.loan.borrower) : '-'}
                        </TableCell>
                        <TableCell>{item.loan?.borrower?.documentNumber ?? '-'}</TableCell>
                        <TableCell>{item.wasReported ? 'Si' : 'No'}</TableCell>
                        <TableCell>{item.reportedStatus}</TableCell>
                        <TableCell>{item.daysPastDue}</TableCell>
                        <TableCell>{formatCurrency(item.currentBalance)}</TableCell>
                        <TableCell>{formatCurrency(item.overdueBalance)}</TableCell>
                        <TableCell>{item.reportedThirdPartiesCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Seleccione una corrida para ver su detalle.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </>
  );
}
