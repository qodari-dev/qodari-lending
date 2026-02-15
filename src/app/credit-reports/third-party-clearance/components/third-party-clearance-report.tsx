'use client';

import { PageContent, PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useGenerateThirdPartyClearancePdf } from '@/hooks/queries/use-credit-report-queries';
import {
  GenerateThirdPartyClearancePdfBodySchema,
  GenerateThirdPartyClearancePdfResult,
} from '@/schemas/credit-report';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileDown } from 'lucide-react';
import React from 'react';
import { type Resolver, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { downloadPdfFromBase64 } from '../../components/pdf-download';

const FormSchema = GenerateThirdPartyClearancePdfBodySchema;
type FormValues = z.infer<typeof FormSchema>;

export function ThirdPartyClearanceReport() {
  const [result, setResult] = React.useState<GenerateThirdPartyClearancePdfResult | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema) as Resolver<FormValues>,
    defaultValues: { thirdPartyDocumentNumber: '' },
  });

  const { mutateAsync: generatePdf, isPending: isGenerating } = useGenerateThirdPartyClearancePdf();
  const thirdPartyDocumentNumberValue = form.watch('thirdPartyDocumentNumber') ?? '';

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
        title="Paz y salvo de tercero"
        description="Genere el PDF de paz y salvo por documento del tercero."
      />
      <PageContent>
        <Card>
          <CardHeader>
            <CardTitle>Parametros</CardTitle>
            <CardDescription>Digite el documento del tercero para generar el PDF.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FieldGroup className="grid gap-3 md:grid-cols-[1fr_auto]">
                <Field data-invalid={Boolean(form.formState.errors.thirdPartyDocumentNumber)}>
                  <FieldLabel htmlFor="thirdPartyDocumentNumber">Documento del tercero</FieldLabel>
                  <Input
                    id="thirdPartyDocumentNumber"
                    placeholder="Ej: 1022334455"
                    {...form.register('thirdPartyDocumentNumber')}
                  />
                  {form.formState.errors.thirdPartyDocumentNumber ? (
                    <FieldError errors={[form.formState.errors.thirdPartyDocumentNumber]} />
                  ) : null}
                </Field>

                <Button
                  type="submit"
                  className="self-end"
                  disabled={isGenerating || !thirdPartyDocumentNumberValue.trim()}
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
                <p className="text-muted-foreground text-xs">Documento</p>
                <p className="font-medium">{result.thirdPartyDocumentNumber}</p>
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
