'use client';

import { exportToExcel } from '@/components/data-table/export/export-excel';
import { PageContent, PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import {
  useGenerateNotPerformedPledgesReport,
  useGeneratePerformedPledgesReport,
} from '@/hooks/queries/use-subsidy-queries';
import {
  GenerateNotPerformedPledgesReportBodySchema,
  GenerateNotPerformedPledgesReportResult,
  GeneratePerformedPledgesReportBodySchema,
  GeneratePerformedPledgesReportResult,
  NotPerformedPledgesReportRow,
  PerformedPledgesReportRow,
} from '@/schemas/subsidy';
import { formatCurrency } from '@/utils/formatters';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileDown } from 'lucide-react';
import React from 'react';
import { Controller, type Resolver, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

type ReportVariant = 'PERFORMED' | 'NOT_PERFORMED';
type FormValues = z.infer<typeof GeneratePerformedPledgesReportBodySchema>;
type ReportResult = GeneratePerformedPledgesReportResult | GenerateNotPerformedPledgesReportResult;

type Props = {
  variant: ReportVariant;
  title: string;
  description: string;
};

export function SubsidyPledgesReportForm({ variant, title, description }: Props) {
  const [result, setResult] = React.useState<ReportResult | null>(null);

  const schema = React.useMemo(
    () =>
      variant === 'PERFORMED'
        ? GeneratePerformedPledgesReportBodySchema
        : GenerateNotPerformedPledgesReportBodySchema,
    [variant]
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      period: '',
    },
  });

  React.useEffect(() => {
    setResult(null);
    form.reset({ period: '' });
  }, [form, variant]);

  const { mutateAsync: generatePerformed, isPending: isGeneratingPerformed } =
    useGeneratePerformedPledgesReport();
  const { mutateAsync: generateNotPerformed, isPending: isGeneratingNotPerformed } =
    useGenerateNotPerformedPledgesReport();

  const isGenerating = isGeneratingPerformed || isGeneratingNotPerformed;

  const onSubmit = async (values: FormValues) => {
    const response =
      variant === 'PERFORMED'
        ? await generatePerformed({ body: values })
        : await generateNotPerformed({ body: values });

    setResult(response.body);
    toast.success('Reporte generado');
  };

  const handleDownloadExcel = React.useCallback(async () => {
    if (!result) return;

    if (result.reportType === 'PERFORMED') {
      await exportToExcel<PerformedPledgesReportRow>(
        {
          title: `Pignoraciones realizadas - ${result.period}`,
          filename: `pignoraciones-realizadas-${result.period.toLowerCase().replace(/\s+/g, '-')}`,
          columns: [
            { header: '# Credito', accessorKey: 'creditNumber', width: 18 },
            { header: 'Documento', accessorKey: 'borrowerDocumentNumber', width: 18 },
            { header: 'Tercero', accessorKey: 'borrowerName', width: 28 },
            {
              header: 'Valor descontado',
              width: 18,
              getValue: (row) => formatCurrency(row.discountedAmount),
            },
          ],
        },
        result.rows
      );
    } else {
      await exportToExcel<NotPerformedPledgesReportRow>(
        {
          title: `Pignoraciones no realizadas - ${result.period}`,
          filename: `pignoraciones-no-realizadas-${result.period.toLowerCase().replace(/\s+/g, '-')}`,
          columns: [
            { header: '# Credito', accessorKey: 'creditNumber', width: 18 },
            { header: 'Documento', accessorKey: 'borrowerDocumentNumber', width: 18 },
            { header: 'Tercero', accessorKey: 'borrowerName', width: 28 },
            {
              header: 'Valor esperado',
              width: 18,
              getValue: (row) => formatCurrency(row.expectedDiscountedAmount),
            },
            { header: 'Novedad', accessorKey: 'reason', width: 30 },
          ],
        },
        result.rows
      );
    }

    toast.success('Excel generado correctamente');
  }, [result]);

  return (
    <>
      <PageHeader title={title} description={description} />
      <PageContent>
        <Card>
          <CardHeader>
            <CardTitle>Parametros</CardTitle>
            <CardDescription>Digite el periodo recibido desde subsidio para generar el reporte.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FieldGroup className="grid gap-4 md:grid-cols-[1fr_auto]">
                <Controller
                  name="period"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="period">Periodo (texto)</FieldLabel>
                      <Input
                        id="period"
                        {...field}
                        value={field.value ?? ''}
                        placeholder="Ej: 2026-01, ENE-2026"
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
            <CardContent className="grid gap-3 md:grid-cols-4">
              <div>
                <p className="text-muted-foreground text-xs">Tipo</p>
                <p className="font-medium">{result.reportType}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Periodo</p>
                <p className="font-medium">{result.period}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Creditos revisados</p>
                <p className="font-medium">{result.reviewedCredits}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Registros reportados</p>
                <p className="font-medium">{result.reportedCredits}</p>
              </div>
              <div className="md:col-span-4">
                <p className="text-muted-foreground text-xs">Mensaje</p>
                <p className="font-medium">{result.message}</p>
              </div>
              <div className="md:col-span-4">
                <Button type="button" variant="outline" onClick={handleDownloadExcel}>
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
