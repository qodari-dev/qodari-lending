'use client';

import { triggerDownload } from '@/components/data-table/export/download';
import { PageContent, PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { useGenerateBankFile } from '@/hooks/queries/use-bank-file-queries';
import { useBanks } from '@/hooks/queries/use-bank-queries';
import { GenerateBankFileBodySchema, GenerateBankFileResult } from '@/schemas/bank-file';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileDown } from 'lucide-react';
import React from 'react';
import { Controller, type Resolver, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const FormSchema = GenerateBankFileBodySchema;
type FormValues = z.infer<typeof FormSchema>;

export function BankFiles() {
  const [result, setResult] = React.useState<GenerateBankFileResult | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema) as Resolver<FormValues>,
    defaultValues: {
      bankId: undefined,
      liquidationDate: new Date(),
    },
  });

  const { data: banksData, isLoading: isLoadingBanks } = useBanks({
    limit: 1000,
    include: [],
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'name', order: 'asc' }],
  });

  const banks = React.useMemo(() => banksData?.body.data ?? [], [banksData]);

  const { mutateAsync: generateBankFile, isPending: isGenerating } = useGenerateBankFile();

  const onSubmit = async (values: FormValues) => {
    const response = await generateBankFile({ body: values });
    setResult(response.body);
    toast.success('Archivo generado');
  };

  const handleDownload = React.useCallback(() => {
    if (!result) return;

    const blob = new Blob([result.fileContent], { type: 'text/plain;charset=utf-8' });
    triggerDownload(blob, result.fileName);
    toast.success('Archivo descargado');
  }, [result]);

  return (
    <>
      <PageHeader
        title="Archivos para bancos"
        description="Seleccione banco y fecha de liquidacion para generar el archivo."
      />
      <PageContent>
        <Card>
          <CardHeader>
            <CardTitle>Parametros</CardTitle>
            <CardDescription>
              Cada banco tiene estructura propia y se resuelve internamente al generar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FieldGroup className="grid gap-4 md:grid-cols-2">
                <Controller
                  name="bankId"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="bankId">Banco</FieldLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value ? Number(value) : undefined)}
                        value={field.value ? String(field.value) : ''}
                        disabled={isLoadingBanks}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {banks.map((item) => (
                            <SelectItem key={item.id} value={String(item.id)}>
                              {item.name} {item.asobancariaCode ? `(${item.asobancariaCode})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  name="liquidationDate"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="liquidationDate">Fecha de liquidacion de creditos</FieldLabel>
                      <DatePicker
                        id="liquidationDate"
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
                  Generar archivo
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {result ? (
          <Card>
            <CardHeader>
              <CardTitle>Resultado de generacion</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-5">
              <div>
                <p className="text-muted-foreground text-xs">Banco</p>
                <p className="font-medium">{result.bankName}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Codigo</p>
                <p className="font-medium">{result.bankCode ?? '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Fecha liquidacion</p>
                <p className="font-medium">{formatDate(result.liquidationDate)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Numero de creditos</p>
                <p className="font-medium">{result.reviewedCredits}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Valor total</p>
                <p className="font-medium">{formatCurrency(result.totalAmount)}</p>
              </div>
              <div className="md:col-span-5">
                <p className="text-muted-foreground text-xs">Mensaje</p>
                <p className="font-medium">{result.message}</p>
              </div>
              <div className="md:col-span-5">
                <Button type="button" variant="outline" onClick={handleDownload}>
                  <FileDown />
                  Descargar archivo
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </PageContent>
    </>
  );
}

