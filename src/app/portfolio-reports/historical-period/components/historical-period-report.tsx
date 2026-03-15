'use client';

import { exportToExcel } from '@/components/data-table/export/export-excel';
import { PageContent, PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { useCreditProducts } from '@/hooks/queries/use-credit-product-queries';
import { useGenerateHistoricalPortfolioByPeriodReport } from '@/hooks/queries/use-portfolio-report-queries';
import {
  GenerateHistoricalPortfolioByPeriodBodySchema,
  GenerateHistoricalPortfolioByPeriodReportResult,
  HistoricalPortfolioByPeriodReportRow,
} from '@/schemas/portfolio-report';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileDown } from 'lucide-react';
import React from 'react';
import { Controller, type Resolver, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const FormSchema = GenerateHistoricalPortfolioByPeriodBodySchema;
type FormValues = z.infer<typeof FormSchema>;

export function HistoricalPeriodReport() {
  const [result, setResult] = React.useState<GenerateHistoricalPortfolioByPeriodReportResult | null>(
    null
  );
  const today = React.useMemo(() => new Date(), []);
  const { data: creditProductsData, isLoading: isLoadingCreditProducts } = useCreditProducts({
    limit: 1000,
    include: [],
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'name', order: 'asc' }],
  });
  const creditProducts = React.useMemo(
    () => creditProductsData?.body.data ?? [],
    [creditProductsData]
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema) as Resolver<FormValues>,
    defaultValues: { cutoffDate: today, creditProductId: undefined, groupBy: 'CREDIT' },
  });

  const { mutateAsync: generateReport, isPending: isGenerating } =
    useGenerateHistoricalPortfolioByPeriodReport();

  const onSubmit = async (values: FormValues) => {
    const response = await generateReport({ body: values });
    setResult(response.body);
    toast.success('Reporte generado');
  };

  const onDownload = React.useCallback(async () => {
    if (!result) return;

    const bucketColumns = result.buckets.map((bucket) => ({
      header: bucket.name,
      width: 18,
      getValue: (row: HistoricalPortfolioByPeriodReportRow) =>
        formatCurrency(row.bucketBalances[String(bucket.id)] ?? 0),
    }));

    await exportToExcel<HistoricalPortfolioByPeriodReportRow>(
      {
        title: 'Reporte historico de cartera por periodo',
        filename: `historico-cartera-por-periodo-${result.cutoffDate}`,
        columns: [
          ...(result.groupBy === 'CREDIT'
            ? [
                { header: '# Credito', accessorKey: 'creditNumber' as const, width: 18 },
                {
                  header: 'Documento',
                  accessorKey: 'thirdPartyDocumentNumber' as const,
                  width: 18,
                },
                { header: 'Tercero', accessorKey: 'thirdPartyName' as const, width: 28 },
                { header: 'Convenio', accessorKey: 'agreementName' as const, width: 22 },
              ]
            : [
                { header: 'Auxiliar', accessorKey: 'auxiliaryCode' as const, width: 18 },
                { header: 'Nombre auxiliar', accessorKey: 'auxiliaryName' as const, width: 26 },
                {
                  header: 'Creditos',
                  width: 14,
                  getValue: (row: HistoricalPortfolioByPeriodReportRow) =>
                    String(row.reviewedCreditsCount ?? 0),
                },
              ]),
          { header: 'Tipo credito', accessorKey: 'creditProductName', width: 20 },
          { header: 'Estado', accessorKey: 'status', width: 14 },
          {
            header: 'Dias mora',
            width: 14,
            getValue: (row) => String(row.daysPastDue),
          },
          {
            header: 'Valor cuota',
            width: 18,
            getValue: (row) => formatCurrency(row.installmentValue),
          },
          {
            header: 'Saldo corriente',
            width: 18,
            getValue: (row) => formatCurrency(row.currentAmount),
          },
          { header: 'Saldo vencido', width: 18, getValue: (row) => formatCurrency(row.overdueBalance) },
          ...bucketColumns,
          { header: 'Saldo total', width: 18, getValue: (row) => formatCurrency(row.outstandingBalance) },
          { header: 'Nota', accessorKey: 'note', width: 30 },
        ],
      },
      result.rows
    );
    toast.success('Excel generado correctamente');
  }, [result]);

  return (
    <>
      <PageHeader
        title="Reporte historico de cartera por periodo"
        description="Genere reporte historico de cartera a la fecha de corte."
      />
      <PageContent>
        <Card>
            <CardHeader>
              <CardTitle>Parametros</CardTitle>
            <CardDescription>
              Seleccione la línea, fecha de corte y agrupación para consultar el snapshot del período.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FieldGroup className="grid gap-4 md:grid-cols-[1.2fr_1fr_1fr_auto]">
                <Controller
                  name="creditProductId"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="creditProductId">Linea de credito</FieldLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value ? Number(value) : undefined)}
                        value={field.value ? String(field.value) : ''}
                        disabled={isLoadingCreditProducts}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              isLoadingCreditProducts ? 'Cargando lineas...' : 'Seleccione...'
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {creditProducts.map((item) => (
                            <SelectItem key={item.id} value={String(item.id)}>
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  name="cutoffDate"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="cutoffDate">Fecha de corte</FieldLabel>
                      <DatePicker
                        id="cutoffDate"
                        value={field.value ?? null}
                        onChange={(value) => field.onChange(value ?? null)}
                        ariaInvalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  name="groupBy"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="groupBy">Agrupar por</FieldLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CREDIT">Credito</SelectItem>
                          <SelectItem value="GL_ACCOUNT">Auxiliar</SelectItem>
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Button type="submit" className="self-end" disabled={isGenerating}>
                  {isGenerating ? <Spinner /> : null}
                  Generar reporte
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>

        {result ? (
          <Card>
            <CardHeader>
              <CardTitle>Resultado</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-5">
              <div>
                <p className="text-muted-foreground text-xs">Reporte</p>
                <p className="font-medium">{result.reportType}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Linea de credito</p>
                <p className="font-medium">{result.creditProductName}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Periodo</p>
                <p className="font-medium">{result.periodLabel}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Fecha corte</p>
                <p className="font-medium">{formatDate(result.cutoffDate)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Agrupación</p>
                <p className="font-medium">
                  {result.groupBy === 'CREDIT' ? 'Por credito' : 'Por auxiliar'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Perfil aging</p>
                <p className="font-medium">{result.agingProfileName}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Creditos revisados</p>
                <p className="font-medium">{result.reviewedCredits}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Creditos reportados</p>
                <p className="font-medium">{result.reportedCredits}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Registros excel</p>
                <p className="font-medium">{result.rows.length}</p>
              </div>
              <div className="md:col-span-5">
                <p className="text-muted-foreground text-xs">Mensaje</p>
                <p className="font-medium">{result.message}</p>
              </div>
              <div className="md:col-span-5">
                <Button type="button" variant="outline" onClick={onDownload}>
                  <FileDown />
                  Descargar Excel
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </PageContent>
    </>
  );
}
