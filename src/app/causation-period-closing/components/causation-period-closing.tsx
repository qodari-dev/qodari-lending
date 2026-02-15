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
import { useAccountingPeriods } from '@/hooks/queries/use-accounting-period-queries';
import { useCloseCausationPeriod } from '@/hooks/queries/use-causation-queries';
import { CloseCausationPeriodBodySchema, CloseCausationPeriodResult } from '@/schemas/causation';
import { formatDate } from '@/utils/formatters';
import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import { Controller, type Resolver, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const FormSchema = CloseCausationPeriodBodySchema;
type FormValues = z.infer<typeof FormSchema>;

function periodLabel(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function CausationPeriodClosing() {
  const [result, setResult] = React.useState<CloseCausationPeriodResult | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema) as Resolver<FormValues>,
    defaultValues: {
      accountingPeriodId: undefined,
    },
  });

  const { data: periodsData, isLoading: isLoadingPeriods } = useAccountingPeriods({
    limit: 200,
    include: [],
    where: { and: [{ isClosed: false }] },
    sort: [{ field: 'year', order: 'desc' }, { field: 'month', order: 'desc' }],
  });

  const openPeriods = React.useMemo(() => periodsData?.body.data ?? [], [periodsData]);

  const { mutateAsync: closePeriod, isPending: isClosing } = useCloseCausationPeriod();

  const onSubmit = async (values: FormValues) => {
    const response = await closePeriod({ body: values });
    setResult(response.body);
    toast.success('Cierre de periodo enviado al backend');
  };

  return (
    <>
      <PageHeader
        title="Causacion - Cierre de periodo"
        description="Seleccione el periodo abierto y ejecute el cierre para generar snapshots."
      />
      <PageContent>
        <Card>
          <CardHeader>
            <CardTitle>Parametros</CardTitle>
            <CardDescription>El cierre inserta snapshots de cartera/provision/causacion.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FieldGroup className="grid gap-4 md:grid-cols-[1fr_auto]">
                <Controller
                  name="accountingPeriodId"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="accountingPeriodId">Periodo abierto</FieldLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value ? Number(value) : undefined)}
                        value={field.value ? String(field.value) : ''}
                        disabled={isLoadingPeriods}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              isLoadingPeriods ? 'Cargando periodos...' : 'Seleccione...'
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {openPeriods.map((period) => (
                            <SelectItem key={period.id} value={String(period.id)}>
                              {periodLabel(period.year, period.month)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Button
                  type="submit"
                  className="self-end"
                  disabled={isClosing || isLoadingPeriods || openPeriods.length === 0}
                >
                  {isClosing ? <Spinner /> : null}
                  Cerrar periodo
                </Button>
              </FieldGroup>
              {openPeriods.length === 0 ? (
                <p className="text-muted-foreground text-xs">No hay periodos abiertos para cerrar.</p>
              ) : null}
            </form>
          </CardContent>
        </Card>

        {result ? (
          <Card>
            <CardHeader>
              <CardTitle>Resultado de cierre</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-5">
              <div>
                <p className="text-muted-foreground text-xs">Periodo</p>
                <p className="font-medium">{result.periodLabel}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Fecha cierre</p>
                <p className="font-medium">{formatDate(result.closedAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Snapshots cartera</p>
                <p className="font-medium">{result.insertedAgingSnapshots}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Snapshots provision</p>
                <p className="font-medium">{result.insertedProvisionSnapshots}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Snapshots causacion</p>
                <p className="font-medium">{result.insertedAccrualSnapshots}</p>
              </div>
              <div className="md:col-span-5">
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
