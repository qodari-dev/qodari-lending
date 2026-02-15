'use client';

import { PageContent, PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useGeneratePledgePaymentVoucher } from '@/hooks/queries/use-subsidy-queries';
import {
  GeneratePledgePaymentVoucherBodySchema,
  GeneratePledgePaymentVoucherResult,
} from '@/schemas/subsidy';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import { Controller, type Resolver, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const FormSchema = GeneratePledgePaymentVoucherBodySchema;
type FormValues = z.infer<typeof FormSchema>;

export function SubsidyPledgePaymentVoucher() {
  const [result, setResult] = React.useState<GeneratePledgePaymentVoucherResult | null>(null);

  const today = React.useMemo(() => new Date(), []);

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema) as Resolver<FormValues>,
    defaultValues: {
      period: '',
      movementGenerationDate: today,
    },
  });

  const { mutateAsync: generateVoucher, isPending: isGenerating } = useGeneratePledgePaymentVoucher();

  const onSubmit = async (values: FormValues) => {
    const response = await generateVoucher({
      body: values,
    });
    setResult(response.body);
    toast.success('Comprobante generado');
  };

  return (
    <>
      <PageHeader
        title="Genera comprobante de abonos de pignoracion"
        description="Capture periodo y fecha de generacion de movimientos para ejecutar el proceso."
      />
      <PageContent>
        <Card>
          <CardHeader>
            <CardTitle>Parametros</CardTitle>
            <CardDescription>
              El periodo se recibe como texto desde subsidio y la fecha de movimientos se usa para los
              registros en cartera.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FieldGroup className="grid gap-4 md:grid-cols-2">
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

                <Controller
                  name="movementGenerationDate"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="movementGenerationDate">
                        Fecha de generacion de movimientos
                      </FieldLabel>
                      <DatePicker
                        id="movementGenerationDate"
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
                  Generar comprobante
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
            <CardContent className="grid gap-3 md:grid-cols-6">
              <div>
                <p className="text-muted-foreground text-xs">Periodo</p>
                <p className="font-medium">{result.period}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Fecha movimientos</p>
                <p className="font-medium">{formatDate(result.movementGenerationDate)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Creditos</p>
                <p className="font-medium">{result.processedCredits}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Abonos</p>
                <p className="font-medium">{result.processedPayments}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Valor descontado</p>
                <p className="font-medium">{formatCurrency(result.totalDiscountedAmount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Valor abonado credito</p>
                <p className="font-medium">{formatCurrency(result.totalAppliedAmount)}</p>
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
