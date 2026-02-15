'use client';

import { triggerDownload } from '@/components/data-table/export/download';
import { PageContent, PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import {
  useGenerateRiskCenterCifin,
  useGenerateRiskCenterDatacredito,
} from '@/hooks/queries/use-risk-center-report-queries';
import {
  GenerateRiskCenterCifinBodySchema,
  GenerateRiskCenterCifinResult,
  GenerateRiskCenterDatacreditoBodySchema,
  GenerateRiskCenterDatacreditoResult,
  RiskCenterReportType,
} from '@/schemas/risk-center-report';
import { formatDate } from '@/utils/formatters';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileDown } from 'lucide-react';
import React from 'react';
import { Controller, type Resolver, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

type Props = {
  reportType: RiskCenterReportType;
  title: string;
  description: string;
};

type FormValues = z.infer<typeof GenerateRiskCenterCifinBodySchema>;
type ReportResult = GenerateRiskCenterCifinResult | GenerateRiskCenterDatacreditoResult;

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function RiskCenterReportForm({ reportType, title, description }: Props) {
  const [result, setResult] = React.useState<ReportResult | null>(null);

  const today = React.useMemo(() => new Date(), []);
  const monthStart = React.useMemo(() => getMonthStart(today), [today]);

  const schema = React.useMemo(
    () =>
      reportType === 'CIFIN'
        ? GenerateRiskCenterCifinBodySchema
        : GenerateRiskCenterDatacreditoBodySchema,
    [reportType]
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      creditCutoffDate: today,
      paymentCutoffDate: today,
    },
  });

  React.useEffect(() => {
    setResult(null);
    form.reset({
      creditCutoffDate: monthStart,
      paymentCutoffDate: today,
    });
  }, [form, monthStart, reportType, today]);

  const { mutateAsync: generateCifin, isPending: isGeneratingCifin } = useGenerateRiskCenterCifin();
  const { mutateAsync: generateDatacredito, isPending: isGeneratingDatacredito } =
    useGenerateRiskCenterDatacredito();

  const isGenerating = isGeneratingCifin || isGeneratingDatacredito;

  const onSubmit = async (values: FormValues) => {
    const response =
      reportType === 'CIFIN'
        ? await generateCifin({ body: values })
        : await generateDatacredito({ body: values });

    setResult(response.body);
    toast.success('Proceso ejecutado correctamente');
  };

  const handleDownloadTxt = React.useCallback(() => {
    if (!result) return;

    const blob = new Blob([result.fileContent], { type: 'text/plain;charset=utf-8' });
    triggerDownload(blob, result.fileName);
  }, [result]);

  return (
    <>
      <PageHeader title={title} description={description} />
      <PageContent>
        <Card>
          <CardHeader>
            <CardTitle>Parametros</CardTitle>
            <CardDescription>
              Configure las fechas de corte para generar el archivo plano de reporte.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FieldGroup className="grid gap-4 md:grid-cols-2">
                <Controller
                  name="creditCutoffDate"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="creditCutoffDate">Fecha de corte de creditos</FieldLabel>
                      <DatePicker
                        id="creditCutoffDate"
                        value={field.value ?? null}
                        onChange={(value) => field.onChange(value ?? null)}
                        ariaInvalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  name="paymentCutoffDate"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="paymentCutoffDate">Fecha de corte de pagos</FieldLabel>
                      <DatePicker
                        id="paymentCutoffDate"
                        value={field.value ?? null}
                        onChange={(value) => field.onChange(value ?? null)}
                        ariaInvalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </FieldGroup>

              <div className="flex gap-2">
                <Button type="submit" disabled={isGenerating}>
                  {isGenerating ? <Spinner /> : null}
                  Generar archivo plano
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {result ? (
          <Card>
            <CardHeader>
              <CardTitle>Resultado de ejecucion</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-5">
              <div>
                <p className="text-muted-foreground text-xs">Central</p>
                <p className="font-medium">{result.reportType}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Corte creditos</p>
                <p className="font-medium">{formatDate(result.creditCutoffDate)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Corte pagos</p>
                <p className="font-medium">{formatDate(result.paymentCutoffDate)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Creditos revisados</p>
                <p className="font-medium">{result.reviewedCredits}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Creditos reportados</p>
                <p className="font-medium">{result.reportedCredits}</p>
              </div>
              <div className="md:col-span-5">
                <p className="text-muted-foreground text-xs">Mensaje</p>
                <p className="font-medium">{result.message}</p>
              </div>
              <div className="md:col-span-5">
                <Button type="button" variant="outline" onClick={handleDownloadTxt}>
                  <FileDown />
                  Descargar TXT
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </PageContent>
    </>
  );
}

