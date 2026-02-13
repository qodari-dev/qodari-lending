'use client';

import { PageContent, PageHeader } from '@/components/layout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAccountingPeriods } from '@/hooks/queries/use-accounting-period-queries';
import { useDashboardSummary } from '@/hooks/queries/use-dashboard-queries';
import { MONTH_LABELS } from '@/schemas/accounting-period';
import { categoryCodeLabels } from '@/schemas/category';
import { loanApplicationStatusLabels } from '@/schemas/loan-application';
import { PaymentTenderTypeLabels } from '@/schemas/payment-tender-type';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

const statusChartConfig = {
  total: {
    label: 'Solicitudes',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig;

const officeChartConfig = {
  total: {
    label: 'Solicitudes',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig;

const channelChartConfig = {
  total: {
    label: 'Solicitudes',
    color: 'var(--chart-4)',
  },
} satisfies ChartConfig;

const investmentTypeChartConfig = {
  amount: {
    label: 'Monto solicitado',
    color: 'var(--chart-5)',
  },
} satisfies ChartConfig;

const collectionChartConfig = {
  amount: {
    label: 'Valor',
    color: 'var(--chart-3)',
  },
} satisfies ChartConfig;

const trendChartConfig = {
  amount: {
    label: 'Monto',
    color: 'var(--chart-1)',
  },
  count: {
    label: 'Cantidad',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig;

function formatPeriodLabel(year: number, month: number): string {
  return `${MONTH_LABELS[month]} ${year}`;
}

function formatMoney(value: number, decimals = 0): string {
  return formatCurrency(value, {
    currency: 'COP',
    locale: 'es-CO',
    decimals,
  });
}

export function Dashboard() {
  const [selectedPeriodId, setSelectedPeriodId] = React.useState<number | undefined>();

  const { data: periodsData, isLoading: isLoadingPeriods } = useAccountingPeriods({
    page: 1,
    limit: 120,
    sort: [
      { field: 'year', order: 'desc' },
      { field: 'month', order: 'desc' },
    ],
  });

  const {
    data: summaryData,
    isLoading: isLoadingSummary,
    isFetching: isFetchingSummary,
    isError: isSummaryError,
    error: summaryError,
    refetch,
  } = useDashboardSummary(selectedPeriodId);

  const accountingPeriods = periodsData?.body.data ?? [];
  const summary = summaryData?.body;

  const statusChartData = React.useMemo(() => {
    if (!summary) return [];
    return summary.applications.byCurrentStatus.map((item) => ({
      statusLabel: loanApplicationStatusLabels[item.status],
      total: item.total,
    }));
  }, [summary]);

  const officeChartData = React.useMemo(() => {
    if (!summary) return [];
    return summary.applications.byOffice.slice(0, 10).map((item) => ({
      officeLabel: item.affiliationOfficeCode ?? item.affiliationOfficeName,
      total: item.total,
    }));
  }, [summary]);

  const channelChartData = React.useMemo(() => {
    if (!summary) return [];
    return summary.applications.byChannel.slice(0, 10).map((item) => ({
      channelLabel: item.channelCode ?? item.channelName,
      total: item.total,
    }));
  }, [summary]);

  const investmentTypeChartData = React.useMemo(() => {
    if (!summary) return [];
    return summary.applications.byInvestmentType.slice(0, 10).map((item) => ({
      investmentTypeLabel: item.investmentTypeName,
      amount: item.requestedAmountTotal,
    }));
  }, [summary]);

  const collectionPieData = React.useMemo(() => {
    if (!summary) return [];
    return summary.collections.byMethod.map((item) => ({
      method: item.collectionMethodName,
      amount: item.totalAmount,
      methodType: item.collectionMethodType,
    }));
  }, [summary]);

  const categoryComparisonData = React.useMemo(() => {
    if (!summary) return [];

    const loansCategoryMap = new Map(
      summary.loans.byCategory.map((item) => [item.categoryCode, item.totalCount])
    );

    return summary.people.byCategory.map((item) => ({
      categoryLabel: categoryCodeLabels[item.categoryCode],
      people: item.total,
      loans: loansCategoryMap.get(item.categoryCode) ?? 0,
    }));
  }, [summary]);

  const trendChartData = React.useMemo(() => {
    if (!summary) return [];

    return summary.loans.trendLast12Months.map((item) => ({
      label: item.label,
      amount: item.totalAmount,
      count: item.totalCount,
    }));
  }, [summary]);

  const summaryErrorMessage = isSummaryError ? getTsRestErrorMessage(summaryError) : null;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Indicadores operativos y financieros del periodo seleccionado."
      />

      <PageContent>
        <Card>
          <CardHeader>
            <CardTitle>Periodo</CardTitle>
            <CardDescription>
              Seleccione un periodo para cargar el resumen del dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="w-full md:max-w-sm">
              <Select
                value={selectedPeriodId ? String(selectedPeriodId) : ''}
                onValueChange={(value) => {
                  const parsed = Number(value);
                  setSelectedPeriodId(Number.isFinite(parsed) ? parsed : undefined);
                }}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={isLoadingPeriods ? 'Cargando periodos...' : 'Seleccione periodo'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {accountingPeriods.map((period) => (
                    <SelectItem key={period.id} value={String(period.id)}>
                      {formatPeriodLabel(period.year, period.month)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => refetch()}
              disabled={!selectedPeriodId || isFetchingSummary}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isFetchingSummary ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </CardContent>
        </Card>

        {!selectedPeriodId ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Seleccione un periodo</AlertTitle>
            <AlertDescription>
              El dashboard se consulta por periodo para optimizar tiempos de respuesta.
            </AlertDescription>
          </Alert>
        ) : null}

        {selectedPeriodId && isLoadingSummary ? (
          <Card>
            <CardContent className="flex items-center gap-2 py-8 text-sm">
              <Spinner />
              Cargando informacion del dashboard...
            </CardContent>
          </Card>
        ) : null}

        {summaryErrorMessage ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error al cargar dashboard</AlertTitle>
            <AlertDescription>{summaryErrorMessage}</AlertDescription>
          </Alert>
        ) : null}

        {summary ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Solicitudes creadas</CardDescription>
                  <CardTitle>{formatNumber(summary.applications.createdCount, 0)}</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-xs">
                  {summary.period.label}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Solicitudes aprobadas</CardDescription>
                  <CardTitle>{formatNumber(summary.applications.approvedCount, 0)}</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-xs">
                  Cambios de estado en el periodo
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Recaudo total</CardDescription>
                  <CardTitle>{formatMoney(summary.collections.totalAmount)}</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-xs">
                  {formatNumber(summary.collections.totalCount, 0)} abonos registrados
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Fondo disponible</CardDescription>
                  <CardTitle>{formatMoney(summary.funds.totalAvailableAmount)}</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-xs">
                  Presupuesto + reintegros - egresos
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Nuevas personas naturales</CardDescription>
                  <CardTitle>{formatNumber(summary.people.totalNewNatural, 0)}</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-xs">
                  Altas en terceros durante el periodo
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Creditos aprobados</CardDescription>
                  <CardTitle>{formatNumber(summary.loans.approvedCount, 0)}</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-xs">
                  Basado en fecha de registro del credito
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Monto creditos aprobados</CardDescription>
                  <CardTitle>{formatMoney(summary.loans.approvedAmountTotal)}</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-xs">
                  Capital aprobado del periodo
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Solicitudes rechazadas</CardDescription>
                  <CardTitle>{formatNumber(summary.applications.rejectedCount, 0)}</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-xs">
                  Cambios de estado en el periodo
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Solicitudes por estado</CardTitle>
                  <CardDescription>Distribucion de solicitudes creadas en el periodo</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={statusChartConfig} className="h-[280px] w-full">
                    <BarChart data={statusChartData}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="statusLabel" tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="total" fill="var(--color-total)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Solicitudes por oficina</CardTitle>
                  <CardDescription>Top oficinas por numero de solicitudes</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={officeChartConfig} className="h-[280px] w-full">
                    <BarChart data={officeChartData}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="officeLabel" tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="total" fill="var(--color-total)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Solicitudes por canal</CardTitle>
                  <CardDescription>Top canales de entrada en el periodo</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={channelChartConfig} className="h-[280px] w-full">
                    <BarChart data={channelChartData}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="channelLabel" tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="total" fill="var(--color-total)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Monto por tipo de inversion</CardTitle>
                  <CardDescription>Valor solicitado agrupado por destino de inversion</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={investmentTypeChartConfig} className="h-[280px] w-full">
                    <BarChart data={investmentTypeChartData}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="investmentTypeLabel" tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="amount" fill="var(--color-amount)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Recaudo por medio de pago</CardTitle>
                  <CardDescription>Cantidad y valor por forma de recaudo</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 lg:grid-cols-2">
                  <ChartContainer config={collectionChartConfig} className="h-[260px] w-full">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Pie data={collectionPieData} dataKey="amount" nameKey="method" innerRadius={55}>
                        {collectionPieData.map((entry, index) => (
                          <Cell
                            key={`${entry.method}-${entry.methodType}`}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Medio</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.collections.byMethod.length ? (
                        summary.collections.byMethod.map((item) => (
                          <TableRow key={item.collectionMethodId}>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <span>{item.collectionMethodName}</span>
                                <Badge variant="outline" className="w-fit">
                                  {PaymentTenderTypeLabels[item.collectionMethodType]}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {formatNumber(item.paymentCount, 0)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatMoney(item.totalAmount)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} className="text-muted-foreground text-center">
                            No hay recaudo en el periodo
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top motivos de rechazo</CardTitle>
                  <CardDescription>Motivos mas frecuentes en el periodo</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Motivo</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.applications.topRejectionReasons.length ? (
                        summary.applications.topRejectionReasons.map((item) => (
                          <TableRow key={item.rejectionReasonId ?? item.rejectionReasonName}>
                            <TableCell>{item.rejectionReasonName}</TableCell>
                            <TableCell className="text-right">{formatNumber(item.total, 0)}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={2} className="text-muted-foreground text-center">
                            No hay rechazos en el periodo
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Personas y creditos por categoria</CardTitle>
                  <CardDescription>
                    Comparativo entre nuevas personas naturales y creditos aprobados
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      people: { label: 'Nuevas personas', color: 'var(--chart-4)' },
                      loans: { label: 'Creditos aprobados', color: 'var(--chart-5)' },
                    }}
                    className="h-[280px] w-full"
                  >
                    <BarChart data={categoryComparisonData}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="categoryLabel" tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="people" fill="var(--color-people)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="loans" fill="var(--color-loans)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Fondos de credito</CardTitle>
                  <CardDescription>Presupuesto, reintegro, egreso y disponible</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fondo</TableHead>
                        <TableHead className="text-right">Presupuesto</TableHead>
                        <TableHead className="text-right">Reintegro</TableHead>
                        <TableHead className="text-right">Egreso</TableHead>
                        <TableHead className="text-right">Disponible</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.funds.byFund.length ? (
                        summary.funds.byFund.map((item) => (
                          <TableRow key={item.creditFundId}>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <span>{item.creditFundName}</span>
                                {!item.isControlled ? (
                                  <Badge variant="secondary" className="w-fit">
                                    Sin control
                                  </Badge>
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{formatMoney(item.fundAmount)}</TableCell>
                            <TableCell className="text-right">
                              {formatMoney(item.reinvestmentAmount)}
                            </TableCell>
                            <TableCell className="text-right">{formatMoney(item.expenseAmount)}</TableCell>
                            <TableCell className="text-right">
                              {formatMoney(item.availableAmount)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-muted-foreground text-center">
                            No hay presupuestos de fondos en el periodo
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Tendencia de creditos aprobados (ultimos 12 meses)</CardTitle>
                <CardDescription>
                  Cantidad y monto de creditos aprobados hasta {summary.period.label}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={trendChartConfig} className="h-[320px] w-full">
                  <ComposedChart data={trendChartData}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis yAxisId="count" allowDecimals={false} />
                    <YAxis yAxisId="amount" orientation="right" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar yAxisId="amount" dataKey="amount" fill="var(--color-amount)" />
                    <Line yAxisId="count" dataKey="count" stroke="var(--color-count)" strokeWidth={2} />
                  </ComposedChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </>
        ) : null}
      </PageContent>
    </>
  );
}
