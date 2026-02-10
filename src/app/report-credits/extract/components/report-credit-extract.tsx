'use client';

import { PageContent, PageHeader } from '@/components/layout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCreditExtractReport } from '@/hooks/queries/use-report-credit-queries';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { AlertTriangle, FileDown, Search } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

export function ReportCreditExtract() {
  const [creditNumberInput, setCreditNumberInput] = React.useState('');
  const [creditNumberQuery, setCreditNumberQuery] = React.useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = React.useState(false);
  const lastErrorMessageRef = React.useRef<string | null>(null);

  const { data, isLoading, isFetching, error } = useCreditExtractReport(
    creditNumberQuery,
    Boolean(creditNumberQuery)
  );

  React.useEffect(() => {
    if (!error) {
      lastErrorMessageRef.current = null;
      return;
    }
    const message = getTsRestErrorMessage(error);
    if (lastErrorMessageRef.current === message) return;
    lastErrorMessageRef.current = message;
    toast.error(message);
  }, [error]);

  const report = data?.body;

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = creditNumberInput.trim();
    if (!normalized) return;
    setCreditNumberQuery(normalized);
  };

  const handleGeneratePdf = React.useCallback(() => {
    if (!report) {
      toast.error('Primero debe consultar un credito');
      return;
    }
    const run = async () => {
      try {
        setIsGeneratingPdf(true);
        const params = new URLSearchParams({ creditNumber: report.loan.creditNumber });
        const response = await fetch(`/api/v1/report-credits/extract/pdf?${params.toString()}`, {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) {
          let message = 'No fue posible generar el PDF';
          try {
            const body = (await response.json()) as { message?: string };
            if (body?.message) message = body.message;
          } catch {
            // keep fallback message
          }
          toast.error(message);
          return;
        }

        const blob = await response.blob();
        const objectUrl = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = `extracto-${report.loan.creditNumber}.pdf`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.URL.revokeObjectURL(objectUrl);
      } catch {
        toast.error('No fue posible descargar el PDF');
      } finally {
        setIsGeneratingPdf(false);
      }
    };

    run();
  }, [report]);

  return (
    <>
      <PageHeader
        title="Reporte de extracto"
        description="Consulte un credito por numero y genere PDF del extracto."
      />
      <PageContent>
        <Card>
          <CardHeader>
            <CardTitle>Filtro</CardTitle>
            <CardDescription>Digite el numero de credito para generar el extracto.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch}>
              <FieldGroup className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
                <Field>
                  <FieldLabel htmlFor="creditNumber">Numero de credito</FieldLabel>
                  <Input
                    id="creditNumber"
                    value={creditNumberInput}
                    onChange={(event) => setCreditNumberInput(event.target.value)}
                    placeholder="Ej: CR2501010001"
                  />
                </Field>
                <Button type="submit" className="self-end" disabled={!creditNumberInput.trim() || isFetching}>
                  {isFetching ? <Spinner /> : <Search />}
                  Consultar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="self-end"
                  disabled={!report || isGeneratingPdf}
                  onClick={handleGeneratePdf}
                >
                  {isGeneratingPdf ? <Spinner /> : <FileDown />}
                  Generar PDF
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>

        {isLoading || isFetching ? (
          <div className="flex items-center gap-2 text-sm">
            <Spinner />
            Cargando extracto...
          </div>
        ) : null}

        {report ? (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Datos del credito</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3">
                <div>
                  <p className="text-muted-foreground text-xs">Numero</p>
                  <p className="font-medium">{report.loan.creditNumber}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Titular</p>
                  <p className="font-medium">{report.loan.borrowerName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Documento</p>
                  <p className="font-medium">{report.loan.borrowerDocumentNumber ?? '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Estado</p>
                  <p className="font-medium">{report.loan.status}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Fecha credito</p>
                  <p className="font-medium">{formatDate(report.loan.creditStartDate)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Vencimiento</p>
                  <p className="font-medium">{formatDate(report.loan.maturityDate)}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resumen de saldo</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3">
                <div>
                  <p className="text-muted-foreground text-xs">Saldo actual</p>
                  <p className="font-medium">{formatCurrency(report.balanceSummary.currentBalance)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Saldo vencido</p>
                  <p className="font-medium">{formatCurrency(report.balanceSummary.overdueBalance)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Cuotas abiertas</p>
                  <p className="font-medium">{report.balanceSummary.openInstallments}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Total causado</p>
                  <p className="font-medium">{formatCurrency(report.balanceSummary.totalCharged)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Total pagado</p>
                  <p className="font-medium">{formatCurrency(report.balanceSummary.totalPaid)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Proximo vencimiento</p>
                  <p className="font-medium">{formatDate(report.balanceSummary.nextDueDate)}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Saldo por auxiliar</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Auxiliar</TableHead>
                      <TableHead>Cargos</TableHead>
                      <TableHead>Pagos</TableHead>
                      <TableHead>Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.balanceSummary.byAccount.length ? (
                      report.balanceSummary.byAccount.map((row) => (
                        <TableRow key={row.glAccountId}>
                          <TableCell>
                            {[row.glAccountCode, row.glAccountName].filter(Boolean).join(' - ') || '-'}
                          </TableCell>
                          <TableCell>{formatCurrency(row.chargeAmount)}</TableCell>
                          <TableCell>{formatCurrency(row.paymentAmount)}</TableCell>
                          <TableCell>{formatCurrency(row.balance)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4}>Sin informacion</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Movimientos</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Fuente</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Cuenta</TableHead>
                      <TableHead>Naturaleza</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Delta cartera</TableHead>
                      <TableHead>Saldo cartera</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.statement.entries.length ? (
                      report.statement.entries.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{formatDate(row.entryDate)}</TableCell>
                          <TableCell>
                            {row.relatedPaymentNumber
                              ? `${row.sourceLabel} (${row.relatedPaymentNumber})`
                              : row.sourceLabel}
                          </TableCell>
                          <TableCell>{`${row.documentCode}-${row.sequence}`}</TableCell>
                          <TableCell>
                            {[row.glAccountCode, row.glAccountName].filter(Boolean).join(' - ') || '-'}
                          </TableCell>
                          <TableCell>{row.nature}</TableCell>
                          <TableCell>{formatCurrency(row.amount)}</TableCell>
                          <TableCell>{formatCurrency(row.receivableDelta)}</TableCell>
                          <TableCell>{formatCurrency(row.runningBalance)}</TableCell>
                          <TableCell>{row.status}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9}>Sin movimientos</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {!report && creditNumberQuery && !isFetching ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Sin datos</AlertTitle>
            <AlertDescription>No fue posible encontrar informacion para el numero indicado.</AlertDescription>
          </Alert>
        ) : null}
      </PageContent>
    </>
  );
}
