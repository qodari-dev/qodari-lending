'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useBillingDispatch } from '@/hooks/queries/use-billing-dispatch-queries';
import { useRetryAgreementBillingEmailDispatch } from '@/hooks/queries/use-agreement-queries';
import {
  agreementBillingEmailDispatchStatusLabels,
  AGREEMENT_BILLING_EMAIL_DISPATCH_STATUS_OPTIONS,
} from '@/schemas/agreement';
import type { BillingDispatch } from '@/schemas/billing-dispatch';
import { useHasPermission } from '@/stores/auth-store-provider';
import { formatCurrency, formatDate, formatDateTime } from '@/utils/formatters';
import { RotateCcw } from 'lucide-react';
import React, { useMemo } from 'react';

type DispatchStatus = (typeof AGREEMENT_BILLING_EMAIL_DISPATCH_STATUS_OPTIONS)[number];

const statusVariant: Record<DispatchStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  QUEUED: 'outline',
  RUNNING: 'secondary',
  SENT: 'default',
  FAILED: 'destructive',
};

export function BillingDispatchDetail({
  dispatch,
  opened,
  onOpened,
}: {
  dispatch: BillingDispatch | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  const dispatchId = dispatch?.id ?? 0;
  const canRun = useHasPermission('agreements:run');

  const { data: detailResponse } = useBillingDispatch(dispatchId, {
    include: ['agreement', 'items'],
    enabled: opened && Boolean(dispatchId),
  });

  const { mutateAsync: retryDispatch, isPending: isRetrying } =
    useRetryAgreementBillingEmailDispatch();

  const detail = detailResponse?.body ?? dispatch;
  const items = useMemo(() => {
    return detail?.items ?? [];
  }, [detail]);
  const agreement = detail?.agreement;

  const totals = React.useMemo(() => {
    let totalInstallment = 0;
    let totalOverdue = 0;
    let totalBalance = 0;

    for (const item of items) {
      totalInstallment += Number(item.installmentAmount);
      totalOverdue += Number(item.overdueAmount);
      totalBalance += Number(item.currentBalance);
    }

    return {
      totalInstallment,
      totalOverdue,
      totalBalance,
      totalBilled: totalInstallment + totalOverdue,
      creditCount: items.length,
    };
  }, [items]);

  if (!dispatch) return null;

  const status = (detail?.status ?? dispatch.status) as DispatchStatus;
  const canRetry = status === 'FAILED' && canRun;

  const handleRetry = async () => {
    await retryDispatch({ params: { id: dispatchId } });
  };

  return (
    <Sheet open={opened} onOpenChange={onOpened}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Instrucción #{detail?.dispatchNumber ?? dispatch.dispatchNumber}
            <Badge variant={statusVariant[status] ?? 'outline'}>
              {agreementBillingEmailDispatchStatusLabels[status] ?? status}
            </Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Encabezado */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Información general</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-y-2 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Convenio</p>
                <p className="font-medium">
                  {agreement
                    ? `${agreement.agreementCode} — ${agreement.businessName}`
                    : detail?.agreementId}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Período</p>
                <p className="font-medium">{detail?.period}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Fecha de corte</p>
                <p className="font-medium">{formatDate(detail?.scheduledDate)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Origen</p>
                <p className="font-medium">{detail?.triggerSource}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Enviado</p>
                <p className="font-medium">
                  {detail?.sentAt ? formatDateTime(detail.sentAt) : '—'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Intentos</p>
                <p className="font-medium">{detail?.attempts ?? 0}</p>
              </div>
              {status === 'FAILED' && detail?.lastError ? (
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs">Error</p>
                  <p className="text-destructive text-xs break-all">{detail.lastError}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Resumen / Conciliación */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Resumen de cobro</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-y-2 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Créditos</p>
                <p className="font-medium">{totals.creditCount}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Total cuota</p>
                <p className="font-medium">{formatCurrency(totals.totalInstallment)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Total mora</p>
                <p className="font-medium">{formatCurrency(totals.totalOverdue)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Total cobrado</p>
                <p className="text-base font-semibold">{formatCurrency(totals.totalBilled)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Total saldo cartera</p>
                <p className="font-medium">{formatCurrency(totals.totalBalance)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Monto registrado</p>
                <p className="font-medium">
                  {detail?.totalBilledAmount
                    ? formatCurrency(Number(detail.totalBilledAmount))
                    : '—'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Acciones */}
          {canRetry ? (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleRetry} disabled={isRetrying}>
                {isRetrying ? <Spinner /> : <RotateCcw className="mr-2 h-4 w-4" />}
                Reintentar envío
              </Button>
            </div>
          ) : null}

          {/* Detalle de ítems */}
          {items.length > 0 ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Detalle por crédito ({items.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-100 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Crédito</TableHead>
                        <TableHead className="text-xs">Documento</TableHead>
                        <TableHead className="text-xs">Nombre</TableHead>
                        <TableHead className="text-right text-xs">Saldo</TableHead>
                        <TableHead className="text-right text-xs">Cuota</TableHead>
                        <TableHead className="text-right text-xs">Mora</TableHead>
                        <TableHead className="text-right text-xs">Días</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-xs">{item.creditNumber}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {item.borrowerDocument}
                          </TableCell>
                          <TableCell
                            className="max-w-40 truncate text-xs"
                            title={item.borrowerName}
                          >
                            {item.borrowerName}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {formatCurrency(Number(item.currentBalance))}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {formatCurrency(Number(item.installmentAmount))}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {formatCurrency(Number(item.overdueAmount))}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {item.daysPastDue > 0 ? (
                              <span className="text-destructive font-medium">
                                {item.daysPastDue}
                              </span>
                            ) : (
                              '0'
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : status === 'SENT' ? (
            <p className="text-muted-foreground text-sm">
              No hay detalle de ítems para esta instrucción.
            </p>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
