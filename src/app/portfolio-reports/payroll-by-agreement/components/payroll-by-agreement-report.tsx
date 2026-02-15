'use client';

import { exportToExcel } from '@/components/data-table/export/export-excel';
import { PageContent, PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { useGeneratePayrollPortfolioByAgreementReport } from '@/hooks/queries/use-portfolio-report-queries';
import {
  GeneratePayrollPortfolioByAgreementBodySchema,
  GeneratePayrollPortfolioByAgreementReportResult,
  PayrollPortfolioByAgreementReportRow,
} from '@/schemas/portfolio-report';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileDown } from 'lucide-react';
import React from 'react';
import { Controller, type Resolver, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const FormSchema = GeneratePayrollPortfolioByAgreementBodySchema;
type FormValues = z.infer<typeof FormSchema>;

export function PayrollByAgreementReport() {
  const [result, setResult] = React.useState<GeneratePayrollPortfolioByAgreementReportResult | null>(
    null
  );
  const today = React.useMemo(() => new Date(), []);

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema) as Resolver<FormValues>,
    defaultValues: { cutoffDate: today },
  });

  const { mutateAsync: generateReport, isPending: isGenerating } =
    useGeneratePayrollPortfolioByAgreementReport();

  const onSubmit = async (values: FormValues) => {
    const response = await generateReport({ body: values });
    setResult(response.body);
    toast.success('Reporte generado');
  };

  const onDownload = React.useCallback(async () => {
    if (!result) return;
    await exportToExcel<PayrollPortfolioByAgreementReportRow>(
      {
        title: 'Reporte cartera de libranza por convenio',
        filename: `cartera-libranza-por-convenio-${result.cutoffDate}`,
        columns: [
          { header: '# Credito', accessorKey: 'creditNumber', width: 18 },
          { header: 'Documento', accessorKey: 'thirdPartyDocumentNumber', width: 18 },
          { header: 'Tercero', accessorKey: 'thirdPartyName', width: 28 },
          { header: 'Convenio', accessorKey: 'agreementName', width: 22 },
          { header: 'Tipo credito', accessorKey: 'creditProductName', width: 20 },
          { header: 'Estado', accessorKey: 'status', width: 16 },
          { header: 'Saldo', width: 18, getValue: (row) => formatCurrency(row.outstandingBalance) },
          { header: 'Saldo vencido', width: 18, getValue: (row) => formatCurrency(row.overdueBalance) },
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
        title="Reporte cartera de libranza por convenio"
        description="Genere reporte de cartera de libranza agrupada por convenio."
      />
      <PageContent>
        <Card>
          <CardHeader>
            <CardTitle>Parametros</CardTitle>
            <CardDescription>Seleccione la fecha de corte para generar el reporte.</CardDescription>
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
                <p className="text-muted-foreground text-xs">Fecha corte</p>
                <p className="font-medium">{formatDate(result.cutoffDate)}</p>
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
