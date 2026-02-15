'use client';

import { exportToExcel } from '@/components/data-table/export/export-excel';
import { PageContent, PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { useGenerateLiquidatedCreditsReport } from '@/hooks/queries/use-credit-report-queries';
import {
  GenerateLiquidatedCreditsReportBodySchema,
  GenerateLiquidatedCreditsReportResult,
  LiquidatedCreditsReportRow,
} from '@/schemas/credit-report';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileDown } from 'lucide-react';
import React from 'react';
import { Controller, type Resolver, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const FormSchema = GenerateLiquidatedCreditsReportBodySchema;
type FormValues = z.infer<typeof FormSchema>;

export function LiquidatedCreditsReport() {
  const [result, setResult] = React.useState<GenerateLiquidatedCreditsReportResult | null>(null);
  const today = React.useMemo(() => new Date(), []);

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema) as Resolver<FormValues>,
    defaultValues: { startDate: today, endDate: today },
  });

  const { mutateAsync: generateReport, isPending: isGenerating } = useGenerateLiquidatedCreditsReport();

  const onSubmit = async (values: FormValues) => {
    const response = await generateReport({ body: values });
    setResult(response.body);
    toast.success('Reporte generado');
  };

  const onDownload = React.useCallback(async () => {
    if (!result) return;
    await exportToExcel<LiquidatedCreditsReportRow>(
      {
        title: 'Reporte de creditos liquidados',
        filename: `creditos-liquidados-${result.startDate}-${result.endDate}`,
        columns: [
          { header: '# Credito', accessorKey: 'creditNumber', width: 18 },
          { header: 'Documento', accessorKey: 'thirdPartyDocumentNumber', width: 18 },
          { header: 'Tercero', accessorKey: 'thirdPartyName', width: 28 },
          { header: 'Fecha liquidacion', accessorKey: 'liquidatedAt', width: 18 },
          { header: 'Valor liquidado', width: 18, getValue: (row) => formatCurrency(row.liquidatedAmount) },
        ],
      },
      result.rows
    );
    toast.success('Excel generado correctamente');
  }, [result]);

  return (
    <>
      <PageHeader
        title="Reporte creditos liquidados"
        description="Genere Excel de creditos liquidados por rango de fechas."
      />
      <PageContent>
        <Card>
          <CardHeader>
            <CardTitle>Parametros</CardTitle>
            <CardDescription>Defina el rango de fechas para generar el reporte.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FieldGroup className="grid gap-4 md:grid-cols-3">
                <Controller
                  name="startDate"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="startDate">Fecha inicial</FieldLabel>
                      <DatePicker
                        id="startDate"
                        value={field.value ?? null}
                        onChange={(value) => field.onChange(value ?? null)}
                        ariaInvalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  name="endDate"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="endDate">Fecha final</FieldLabel>
                      <DatePicker
                        id="endDate"
                        value={field.value ?? null}
                        onChange={(value) => field.onChange(value ?? null)}
                        ariaInvalid={fieldState.invalid}
                      />
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
                <p className="text-muted-foreground text-xs">Rango inicial</p>
                <p className="font-medium">{formatDate(result.startDate)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Rango final</p>
                <p className="font-medium">{formatDate(result.endDate)}</p>
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
