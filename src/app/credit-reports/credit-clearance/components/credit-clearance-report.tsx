'use client';

import { PageContent, PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useGenerateCreditClearancePdf } from '@/hooks/queries/use-credit-report-queries';
import {
  GenerateCreditClearancePdfBodySchema,
  GenerateCreditClearancePdfResult,
} from '@/schemas/credit-report';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileDown } from 'lucide-react';
import React from 'react';
import { type Resolver, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { downloadPdfFromBase64 } from '../../components/pdf-download';

const FormSchema = GenerateCreditClearancePdfBodySchema;
type FormValues = z.infer<typeof FormSchema>;

export function CreditClearanceReport() {
  const [result, setResult] = React.useState<GenerateCreditClearancePdfResult | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema) as Resolver<FormValues>,
    defaultValues: { creditNumber: '' },
  });

  const { mutateAsync: generatePdf, isPending: isGenerating } = useGenerateCreditClearancePdf();
  const creditNumberValue = form.watch('creditNumber') ?? '';

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
      <PageHeader
        title="Paz y salvo de un credito"
        description="Genere el PDF de paz y salvo por numero de credito."
      />
      <PageContent>
        <Card>
          <CardHeader>
            <CardTitle>Parametros</CardTitle>
            <CardDescription>Digite el numero del credito para generar el PDF.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FieldGroup className="grid gap-3 md:grid-cols-[1fr_auto]">
                <Field data-invalid={Boolean(form.formState.errors.creditNumber)}>
                  <FieldLabel htmlFor="creditNumber">Numero de credito</FieldLabel>
                  <Input
                    id="creditNumber"
                    placeholder="Ej: CR2501010001"
                    {...form.register('creditNumber')}
                  />
                  {form.formState.errors.creditNumber ? (
                    <FieldError errors={[form.formState.errors.creditNumber]} />
                  ) : null}
                </Field>

                <Button
                  type="submit"
                  className="self-end"
                  disabled={isGenerating || !creditNumberValue.trim()}
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
                <p className="text-muted-foreground text-xs">Credito</p>
                <p className="font-medium">{result.creditNumber}</p>
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
