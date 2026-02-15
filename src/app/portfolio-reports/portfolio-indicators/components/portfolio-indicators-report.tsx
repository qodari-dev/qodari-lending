'use client';

import { exportToExcel } from '@/components/data-table/export/export-excel';
import { PageContent, PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { useGeneratePortfolioIndicatorsReport } from '@/hooks/queries/use-portfolio-report-queries';
import {
  GeneratePortfolioIndicatorsBodySchema,
  GeneratePortfolioIndicatorsReportResult,
  PortfolioIndicatorsReportRow,
} from '@/schemas/portfolio-report';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileDown } from 'lucide-react';
import React from 'react';
import { Controller, type Resolver, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const FormSchema = GeneratePortfolioIndicatorsBodySchema;
type FormValues = z.infer<typeof FormSchema>;

function formatIndicatorValue(row: PortfolioIndicatorsReportRow) {
  if (row.unit === 'CURRENCY') return formatCurrency(row.indicatorValue);
  if (row.unit === 'PERCENTAGE') return `${row.indicatorValue.toFixed(2)}%`;
  return String(Math.trunc(row.indicatorValue));
}

export function PortfolioIndicatorsReport() {
  const [result, setResult] = React.useState<GeneratePortfolioIndicatorsReportResult | null>(null);
  const today = React.useMemo(() => new Date(), []);

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema) as Resolver<FormValues>,
    defaultValues: { cutoffDate: today },
  });

  const { mutateAsync: generateReport, isPending: isGenerating } =
    useGeneratePortfolioIndicatorsReport();

  const onSubmit = async (values: FormValues) => {
    const response = await generateReport({ body: values });
    setResult(response.body);
    toast.success('Indicadores generados');
  };

  const onDownload = React.useCallback(async () => {
    if (!result) return;
    await exportToExcel<PortfolioIndicatorsReportRow>(
      {
        title: 'Indicadores de cartera',
        filename: `indicadores-cartera-${result.cutoffDate}`,
        columns: [
          { header: 'Codigo', accessorKey: 'indicatorCode', width: 16 },
          { header: 'Indicador', accessorKey: 'indicatorName', width: 32 },
          { header: 'Unidad', accessorKey: 'unit', width: 16 },
          { header: 'Valor', width: 18, getValue: (row) => formatIndicatorValue(row) },
        ],
      },
      result.rows
    );
    toast.success('Excel generado correctamente');
  }, [result]);

  return (
    <>
      <PageHeader
        title="Indicadores de cartera"
        description="Genere el reporte de indicadores de cartera por fecha de corte."
      />
      <PageContent>
        <Card>
          <CardHeader>
            <CardTitle>Parametros</CardTitle>
            <CardDescription>Seleccione la fecha de corte para generar los indicadores.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FieldGroup className="grid gap-4 md:grid-cols-[1fr_auto]">
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
                      {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                    </Field>
                  )}
                />
                <Button type="submit" className="self-end" disabled={isGenerating}>
                  {isGenerating ? <Spinner /> : null}
                  Generar indicadores
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
                <p className="text-muted-foreground text-xs">Fecha corte</p>
                <p className="font-medium">{formatDate(result.cutoffDate)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Creditos revisados</p>
                <p className="font-medium">{result.reviewedCredits}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Indicadores reportados</p>
                <p className="font-medium">{result.reportedCredits}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Registros</p>
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
