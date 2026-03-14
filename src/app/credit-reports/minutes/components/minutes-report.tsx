'use client';

import { PageContent, PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import {
  useGenerateMinutesPdf,
  useMinutesReportOptions,
} from '@/hooks/queries/use-credit-report-queries';
import { GenerateMinutesPdfBodySchema, GenerateMinutesPdfResult } from '@/schemas/credit-report';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileDown } from 'lucide-react';
import React from 'react';
import { type Resolver, Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { downloadPdfFromBase64 } from '../../components/pdf-download';
import { formatDate } from '@/utils/formatters';

const FormSchema = GenerateMinutesPdfBodySchema;
type FormValues = z.infer<typeof FormSchema>;

export function MinutesReport() {
  const [result, setResult] = React.useState<GenerateMinutesPdfResult | null>(null);
  const { data: minutesOptionsData, isLoading: isLoadingMinutesOptions } = useMinutesReportOptions();
  const minutesOptions = React.useMemo(() => minutesOptionsData?.body ?? [], [minutesOptionsData]);

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema) as Resolver<FormValues>,
    defaultValues: { minutesNumber: '' },
  });

  const { mutateAsync: generatePdf, isPending: isGenerating } = useGenerateMinutesPdf();
  const minutesNumberValue = useWatch({
    control: form.control,
    name: 'minutesNumber',
  });

  React.useEffect(() => {
    if (!minutesOptions.length) return;
    const currentValue = form.getValues('minutesNumber');
    if (currentValue) return;
    form.setValue('minutesNumber', minutesOptions[0].minutesNumber, { shouldValidate: true });
  }, [form, minutesOptions]);

  const onSubmit = async (values: FormValues) => {
    const response = await generatePdf({ body: values });
    setResult(response.body);
    toast.success('PDF generado');
  };

  const onDownload = React.useCallback(() => {
    if (!result) return;
    downloadPdfFromBase64(result.pdfBase64, result.fileName);
    toast.success('PDF descargado correctamente');
  }, [result]);

  return (
    <>
      <PageHeader title="Acta" description="Genere el PDF de acta seleccionando el numero del acta." />
      <PageContent>
        <Card>
          <CardHeader>
            <CardTitle>Parametros</CardTitle>
            <CardDescription>Seleccione el acta, ordenada de la mas reciente a la mas antigua.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FieldGroup className="grid gap-3 md:grid-cols-[1fr_auto]">
                <Controller
                  name="minutesNumber"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={Boolean(fieldState.error)}>
                      <FieldLabel htmlFor="minutesNumber">Numero de acta</FieldLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isLoadingMinutesOptions || minutesOptions.length === 0}
                      >
                        <SelectTrigger id="minutesNumber">
                          <SelectValue
                            placeholder={
                              isLoadingMinutesOptions
                                ? 'Cargando actas...'
                                : minutesOptions.length
                                  ? 'Seleccione...'
                                  : 'No hay actas disponibles'
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {minutesOptions.map((item) => (
                            <SelectItem key={item.minutesNumber} value={item.minutesNumber}>
                              {`${item.minutesNumber} · ${formatDate(item.actDate)} · ${item.reviewedApplicationsCount} solicitudes`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.error ? <FieldError errors={[fieldState.error]} /> : null}
                    </Field>
                  )}
                />

                <Button
                  type="submit"
                  className="self-end"
                  disabled={
                    isGenerating ||
                    isLoadingMinutesOptions ||
                    minutesOptions.length === 0 ||
                    !minutesNumberValue.trim()
                  }
                >
                  {isGenerating ? <Spinner /> : null}
                  Generar PDF
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
                <p className="text-muted-foreground text-xs">Reporte</p>
                <p className="font-medium">{result.reportType}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Acta</p>
                <p className="font-medium">{result.minutesNumber}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Archivo</p>
                <p className="font-medium">{result.fileName}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Observaciones</p>
                <p className="font-medium">Sin observaciones</p>
              </div>
              <div className="md:col-span-4">
                <p className="text-muted-foreground text-xs">Mensaje</p>
                <p className="font-medium">{result.message}</p>
              </div>
              <div className="md:col-span-4">
                <Button type="button" variant="outline" onClick={onDownload}>
                  <FileDown />
                  Descargar PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </PageContent>
    </>
  );
}
