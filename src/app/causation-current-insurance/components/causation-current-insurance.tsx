'use client';

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useCurrentInsuranceRunStatus,
  useProcessCausationCurrentInsurance,
} from '@/hooks/queries/use-causation-queries';
import { useCreditProducts } from '@/hooks/queries/use-credit-product-queries';
import { useLoans } from '@/hooks/queries/use-loan-queries';
import { ProcessCausationCurrentInsuranceBodySchema } from '@/schemas/causation';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { getThirdPartyLabel } from '@/utils/third-party';
import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import { Controller, type Resolver, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const FormSchema = ProcessCausationCurrentInsuranceBodySchema;
type FormValues = z.infer<typeof FormSchema>;

const scopeLabels: Record<FormValues['scopeType'], string> = {
  GENERAL: 'General',
  CREDIT_PRODUCT: 'Linea de credito',
  LOAN: 'Credito',
};

export function CausationCurrentInsurance() {
  const [runId, setRunId] = React.useState<number | null>(null);
  const [lastNotifiedStatus, setLastNotifiedStatus] = React.useState<string | null>(null);

  const today = React.useMemo(() => new Date(), []);

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema) as Resolver<FormValues>,
    defaultValues: {
      processDate: today,
      transactionDate: today,
      scopeType: 'GENERAL',
      creditProductId: undefined,
      loanId: undefined,
    },
  });

  const scopeType = useWatch({
    control: form.control,
    name: 'scopeType',
  });

  const { data: creditProductsData, isLoading: isLoadingCreditProducts } = useCreditProducts({
    limit: 1000,
    include: [],
    sort: [{ field: 'name', order: 'asc' }],
    where: { and: [{ isActive: true }] },
  });
  const { data: loansData, isLoading: isLoadingLoans } = useLoans({
    limit: 1000,
    include: ['borrower'],
    sort: [{ field: 'creditStartDate', order: 'desc' }],
    where: { and: [{ status: { in: ['ACTIVE', 'ACCOUNTED'] } }] },
  });

  const creditProductOptions = React.useMemo(
    () => creditProductsData?.body.data ?? [],
    [creditProductsData]
  );
  const loanOptions = React.useMemo(() => loansData?.body.data ?? [], [loansData]);

  React.useEffect(() => {
    if (scopeType === 'GENERAL') {
      form.setValue('creditProductId', undefined);
      form.setValue('loanId', undefined);
      return;
    }
    if (scopeType === 'CREDIT_PRODUCT') {
      form.setValue('loanId', undefined);
      return;
    }
    form.setValue('creditProductId', undefined);
  }, [form, scopeType]);

  const { mutateAsync: processCurrentInsurance, isPending: isProcessing } =
    useProcessCausationCurrentInsurance();
  const { data: runStatusData, isFetching: isFetchingRunStatus } = useCurrentInsuranceRunStatus(runId);
  const runStatus = runStatusData?.body;

  React.useEffect(() => {
    if (!runStatus) return;
    if (runStatus.status === lastNotifiedStatus) return;

    if (runStatus.status === 'COMPLETED') {
      toast.success(`Causacion finalizada. Creditos causados: ${runStatus.accruedCredits}`);
      setLastNotifiedStatus(runStatus.status);
      return;
    }

    if (runStatus.status === 'FAILED' || runStatus.status === 'CANCELED') {
      toast.error(runStatus.message || 'La causacion finalizo con error');
      setLastNotifiedStatus(runStatus.status);
    }
  }, [lastNotifiedStatus, runStatus]);

  const onSubmit = async (values: FormValues) => {
    const response = await processCurrentInsurance({
      body: {
        ...values,
        creditProductId: values.scopeType === 'CREDIT_PRODUCT' ? values.creditProductId : undefined,
        loanId: values.scopeType === 'LOAN' ? values.loanId : undefined,
      },
    });

    setRunId(response.body.processRunId);
    setLastNotifiedStatus(null);
    toast.success(`Corrida encolada. Run #${response.body.processRunId}`);
  };

  return (
    <>
      <PageHeader
        title="Causacion - Seguro"
        description="Defina alcance, fecha de proceso y fecha de movimiento para ejecutar la causacion."
      />
      <PageContent>
        <Card>
          <CardHeader>
            <CardTitle>Parametros</CardTitle>
            <CardDescription>Capture los datos para procesar causacion de seguro.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FieldGroup className="grid gap-4 md:grid-cols-3">
                <Controller
                  name="scopeType"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="scopeType">Alcance</FieldLabel>
                      <Select
                        value={field.value}
                        onValueChange={(value) =>
                          field.onChange(value as FormValues['scopeType'])
                        }
                      >
                        <SelectTrigger id="scopeType">
                          <SelectValue placeholder="Seleccione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(scopeLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                {scopeType === 'CREDIT_PRODUCT' ? (
                  <Controller
                    name="creditProductId"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="creditProductId">Linea de credito</FieldLabel>
                        <Select
                          value={field.value ? String(field.value) : ''}
                          onValueChange={(value) => field.onChange(value ? Number(value) : undefined)}
                          disabled={isLoadingCreditProducts}
                        >
                          <SelectTrigger id="creditProductId">
                            <SelectValue placeholder="Seleccione..." />
                          </SelectTrigger>
                          <SelectContent>
                            {creditProductOptions.map((item) => (
                              <SelectItem key={item.id} value={String(item.id)}>
                                {item.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                ) : null}

                {scopeType === 'LOAN' ? (
                  <Controller
                    name="loanId"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="loanId">Credito</FieldLabel>
                        <Select
                          value={field.value ? String(field.value) : ''}
                          onValueChange={(value) => field.onChange(value ? Number(value) : undefined)}
                          disabled={isLoadingLoans}
                        >
                          <SelectTrigger id="loanId">
                            <SelectValue placeholder="Seleccione..." />
                          </SelectTrigger>
                          <SelectContent>
                            {loanOptions.map((item) => (
                              <SelectItem key={item.id} value={String(item.id)}>
                                {item.creditNumber} - {getThirdPartyLabel(item.borrower)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                ) : null}

                <Controller
                  name="processDate"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="processDate">Fecha</FieldLabel>
                      <DatePicker
                        id="processDate"
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
                      <FieldLabel htmlFor="transactionDate">Fecha de movimiento</FieldLabel>
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
                  Encolar causacion
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {runId ? (
          <Card>
            <CardHeader>
              <CardTitle>Estado de ejecucion</CardTitle>
              <CardDescription>
                Run #{runId} {isFetchingRunStatus ? '- actualizando...' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {runStatus ? (
                <>
                  <div className="grid gap-3 md:grid-cols-6">
                    <div>
                      <p className="text-muted-foreground text-xs">Estado</p>
                      <p className="font-medium">{runStatus.status}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Alcance</p>
                      <p className="font-medium">{scopeLabels[runStatus.scopeType]}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Fecha</p>
                      <p className="font-medium">{formatDate(runStatus.processDate)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Fecha movimiento</p>
                      <p className="font-medium">{formatDate(runStatus.transactionDate)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Creditos revisados</p>
                      <p className="font-medium">{runStatus.reviewedCredits}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Creditos causados</p>
                      <p className="font-medium">{runStatus.accruedCredits}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Creditos con error</p>
                      <p className="font-medium">{runStatus.failedCredits}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Valor causado</p>
                      <p className="font-medium">{formatCurrency(runStatus.totalAccruedAmount)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Inicio ejecucion</p>
                      <p className="font-medium">{runStatus.startedAt ? formatDate(runStatus.startedAt) : '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Fin ejecucion</p>
                      <p className="font-medium">{runStatus.finishedAt ? formatDate(runStatus.finishedAt) : '-'}</p>
                    </div>
                    <div className="md:col-span-6">
                      <p className="text-muted-foreground text-xs">Mensaje</p>
                      <p className="font-medium">{runStatus.message}</p>
                    </div>
                  </div>

                  {runStatus.errors.length ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID credito</TableHead>
                          <TableHead>Numero credito</TableHead>
                          <TableHead>Motivo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {runStatus.errors.map((error, index) => (
                          <TableRow key={`${error.loanId}-${index}`}>
                            <TableCell>{error.loanId}</TableCell>
                            <TableCell>{error.creditNumber}</TableCell>
                            <TableCell>{error.reason}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : null}
                </>
              ) : (
                <div className="text-muted-foreground text-sm">Consultando estado de la corrida...</div>
              )}
            </CardContent>
          </Card>
        ) : null}
      </PageContent>
    </>
  );
}
