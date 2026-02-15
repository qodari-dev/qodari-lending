'use client';

import { PageContent, PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { useProcessCausationCurrentInterest } from '@/hooks/queries/use-causation-queries';
import {
  ProcessCausationCurrentInterestBodySchema,
  ProcessCausationCurrentInterestResult,
} from '@/schemas/causation';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import { Controller, type Resolver, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const FormSchema = ProcessCausationCurrentInterestBodySchema;
type FormValues = z.infer<typeof FormSchema>;

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function CausationCurrentInterest() {
  const [result, setResult] = React.useState<ProcessCausationCurrentInterestResult | null>(null);

  const today = React.useMemo(() => new Date(), []);
  const monthStart = React.useMemo(() => getMonthStart(today), [today]);

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema) as Resolver<FormValues>,
    defaultValues: {
      startDate: monthStart,
      endDate: today,
      transactionDate: today,
    },
  });

  const { mutateAsync: processCurrentInterest, isPending: isProcessing } =
    useProcessCausationCurrentInterest();

  const onSubmit = async (values: FormValues) => {
    const response = await processCurrentInterest({ body: values });
    setResult(response.body);
    toast.success('Causacion enviada al backend');
  };

  return (
    <>
      <PageHeader
        title="Causacion - Interes corriente"
        description="Defina rango de fechas y fecha de transaccion para ejecutar la causacion."
      />
      <PageContent>
        <Card>
          <CardHeader>
            <CardTitle>Parametros</CardTitle>
            <CardDescription>Capture los datos para procesar causacion de interes corriente.</CardDescription>
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
                <Controller
                  name="transactionDate"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="transactionDate">Fecha de transaccion</FieldLabel>
                      <DatePicker
                        id="transactionDate"
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
                <Button type="submit" disabled={isProcessing}>
                  {isProcessing ? <Spinner /> : null}
                  Procesar causacion
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {result ? (
          <Card>
            <CardHeader>
              <CardTitle>Resultado</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-6">
              <div>
                <p className="text-muted-foreground text-xs">Tipo</p>
                <p className="font-medium">{result.processType}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Fecha inicial</p>
                <p className="font-medium">{formatDate(result.periodStartDate)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Fecha final</p>
                <p className="font-medium">{formatDate(result.periodEndDate)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Fecha transaccion</p>
                <p className="font-medium">{formatDate(result.transactionDate)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Creditos revisados</p>
                <p className="font-medium">{result.reviewedCredits}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Creditos causados</p>
                <p className="font-medium">{result.accruedCredits}</p>
              </div>
              <div className="md:col-span-6">
                <p className="text-muted-foreground text-xs">Valor causado</p>
                <p className="font-medium">{formatCurrency(result.totalAccruedAmount)}</p>
              </div>
              <div className="md:col-span-6">
                <p className="text-muted-foreground text-xs">Mensaje</p>
                <p className="font-medium">{result.message}</p>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </PageContent>
    </>
  );
}
