'use client';

import { PageContent, PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { triggerDownload } from '@/components/data-table/export/download';
import React from 'react';
import { toast } from 'sonner';
import { FileDown } from 'lucide-react';

type Props = {
  title: string;
  description: string;
  endpoint: string;
  filenamePrefix: string;
};

export function CollectionLetterForm({ title, description, endpoint, filenamePrefix }: Props) {
  const [creditNumber, setCreditNumber] = React.useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = React.useState(false);

  const handleGeneratePdf = React.useCallback(async () => {
    const normalizedCreditNumber = creditNumber.trim();
    if (!normalizedCreditNumber) {
      toast.error('Debe ingresar el numero de credito');
      return;
    }

    try {
      setIsGeneratingPdf(true);
      const params = new URLSearchParams({ creditNumber: normalizedCreditNumber });
      const response = await fetch(`${endpoint}?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        let message = 'No fue posible generar el PDF';
        try {
          const body = (await response.json()) as { message?: string };
          if (body?.message) message = body.message;
        } catch {
          // keep fallback
        }
        toast.error(message);
        return;
      }

      const blob = await response.blob();
      triggerDownload(blob, `${filenamePrefix}-${normalizedCreditNumber}.pdf`);
      toast.success('PDF generado correctamente');
    } catch {
      toast.error('No fue posible descargar el PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [creditNumber, endpoint, filenamePrefix]);

  return (
    <>
      <PageHeader title={title} description={description} />
      <PageContent>
        <Card>
          <CardHeader>
            <CardTitle>Filtro</CardTitle>
            <CardDescription>Digite el numero de credito para generar la carta en PDF.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup className="grid gap-3 md:grid-cols-[1fr_auto]">
              <Field>
                <FieldLabel htmlFor="creditNumber">Numero de credito</FieldLabel>
                <Input
                  id="creditNumber"
                  value={creditNumber}
                  onChange={(event) => setCreditNumber(event.target.value)}
                  placeholder="Ej: CR2501010001"
                />
              </Field>

              <Button
                type="button"
                className="self-end"
                disabled={!creditNumber.trim() || isGeneratingPdf}
                onClick={handleGeneratePdf}
              >
                {isGeneratingPdf ? <Spinner /> : <FileDown />}
                Generar carta PDF
              </Button>
            </FieldGroup>
          </CardContent>
        </Card>
      </PageContent>
    </>
  );
}
