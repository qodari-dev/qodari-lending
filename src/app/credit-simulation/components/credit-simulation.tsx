'use client';

import { PageContent, PageHeader } from '@/components/layout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from '@/components/ui/combobox';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
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
import { useCalculateCreditSimulation } from '@/hooks/queries/use-credit-simulation-queries';
import { useCreditProducts } from '@/hooks/queries/use-credit-product-queries';
import { useInsuranceCompanies } from '@/hooks/queries/use-insurance-company-queries';
import { usePaymentFrequencies } from '@/hooks/queries/use-payment-frequency-queries';
import { CategoryCode, categoryCodeLabels } from '@/schemas/category';
import {
  CalculateCreditSimulationBodySchema,
  CreditSimulationResult,
} from '@/schemas/credit-simulation';
import { formatPaymentFrequencyRule } from '@/utils/payment-frequency';
import { formatCurrency, formatNumber, formatPercent } from '@/utils/formatters';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, ChevronDownIcon, Info } from 'lucide-react';
import React from 'react';
import { Controller, type Resolver, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { financingTypeLabels } from '@/schemas/credit-product';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';

const FormSchema = CalculateCreditSimulationBodySchema;
type FormValues = z.infer<typeof FormSchema>;

export function CreditSimulation() {
  const [result, setResult] = React.useState<CreditSimulationResult | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema) as Resolver<FormValues>,
    defaultValues: {
      creditProductId: undefined,
      categoryCode: undefined,
      installments: 12,
      creditAmount: 0,
      firstPaymentDate: new Date(),
      income: 0,
      expenses: 0,
      paymentFrequencyId: undefined,
      insuranceCompanyId: null,
    },
  });

  const selectedCreditProductId = useWatch({
    control: form.control,
    name: 'creditProductId',
  });
  const selectedCategoryCode = useWatch({
    control: form.control,
    name: 'categoryCode',
  });

  const { data: creditProductsData, isLoading: isLoadingCreditProducts } = useCreditProducts({
    limit: 1000,
    include: ['creditProductCategories'],
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'name', order: 'asc' }],
  });
  const { data: paymentFrequenciesData, isLoading: isLoadingPaymentFrequencies } =
    usePaymentFrequencies({
      limit: 1000,
      where: { and: [{ isActive: true }] },
      sort: [{ field: 'name', order: 'asc' }],
    });
  const { data: insuranceCompaniesData, isLoading: isLoadingInsuranceCompanies } =
    useInsuranceCompanies({
      limit: 1000,
      include: [],
      where: { and: [{ isActive: true }] },
      sort: [{ field: 'businessName', order: 'asc' }],
    });

  const { mutateAsync: calculateSimulation, isPending: isCalculating } =
    useCalculateCreditSimulation();

  const isLoadingFormData =
    isLoadingCreditProducts || isLoadingPaymentFrequencies || isLoadingInsuranceCompanies;

  const creditProducts = React.useMemo(
    () => creditProductsData?.body.data ?? [],
    [creditProductsData]
  );
  const paymentFrequencies = React.useMemo(
    () => paymentFrequenciesData?.body.data ?? [],
    [paymentFrequenciesData]
  );
  const insuranceCompanies = React.useMemo(
    () => insuranceCompaniesData?.body.data ?? [],
    [insuranceCompaniesData]
  );

  const selectedProduct = React.useMemo(
    () => creditProducts.find((item) => item.id === selectedCreditProductId),
    [creditProducts, selectedCreditProductId]
  );

  const categories = React.useMemo(
    () => selectedProduct?.creditProductCategories ?? [],
    [selectedProduct]
  );

  const categoryOptions = React.useMemo(() => {
    const map = new Set<CategoryCode>();
    for (const category of categories) {
      map.add(category.categoryCode);
    }
    return Array.from(map);
  }, [categories]);

  const maxInstallmentsForCategory = React.useMemo(() => {
    if (!selectedCategoryCode) return selectedProduct?.maxInstallments ?? null;

    const rows = categories.filter((item) => item.categoryCode === selectedCategoryCode);
    if (!rows.length) return selectedProduct?.maxInstallments ?? null;

    const categoryMax = Math.max(...rows.map((item) => item.installmentsTo));
    if (selectedProduct?.maxInstallments) {
      return Math.min(selectedProduct.maxInstallments, categoryMax);
    }
    return categoryMax;
  }, [categories, selectedCategoryCode, selectedProduct]);

  React.useEffect(() => {
    form.resetField('categoryCode');

    if (!selectedProduct?.paysInsurance) {
      form.setValue('insuranceCompanyId', null);
    }
  }, [form, selectedCreditProductId, selectedProduct?.paysInsurance]);

  const onSubmit = async (values: FormValues) => {
    try {
      if (maxInstallmentsForCategory && values.installments > maxInstallmentsForCategory) {
        toast.error(`El maximo de cuotas permitido es ${maxInstallmentsForCategory}`);
        return;
      }

      const response = await calculateSimulation({
        body: values,
      });

      setResult(response.body);
    } catch (error) {
      toast.error(getTsRestErrorMessage(error));
    }
  };

  return (
    <>
      <PageHeader
        title="Simulacion de Credito"
        description="Calcule capacidad de pago, resumen y tabla de amortizacion sin guardar informacion."
      />
      <PageContent>
        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Parametros</CardTitle>
              <CardDescription>Complete los datos para calcular la simulacion.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingFormData ? (
                <div className="flex items-center gap-2 text-sm">
                  <Spinner />
                  Cargando catalogos...
                </div>
              ) : (
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FieldGroup>
                    <Controller
                      name="creditProductId"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="creditProductId">Linea de credito</FieldLabel>
                          <Combobox
                            items={creditProducts}
                            value={creditProducts.find((item) => item.id === field.value) ?? null}
                            onValueChange={(value) => field.onChange(value?.id ?? undefined)}
                            itemToStringValue={(item) => String(item.id)}
                            itemToStringLabel={(item) => item.name}
                          >
                            <ComboboxTrigger
                              render={
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="w-full justify-between font-normal"
                                >
                                  <ComboboxValue placeholder="Seleccione..." />
                                  <ChevronDownIcon className="text-muted-foreground size-4" />
                                </Button>
                              }
                            />
                            <ComboboxContent>
                              <ComboboxInput
                                placeholder="Buscar linea..."
                                showClear
                                showTrigger={false}
                              />
                              <ComboboxList>
                                <ComboboxEmpty>No se encontraron lineas</ComboboxEmpty>
                                <ComboboxCollection>
                                  {(item) => (
                                    <ComboboxItem key={item.id} value={item}>
                                      {item.name}
                                    </ComboboxItem>
                                  )}
                                </ComboboxCollection>
                              </ComboboxList>
                            </ComboboxContent>
                          </Combobox>
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller
                      name="categoryCode"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="categoryCode">Categoria</FieldLabel>
                          <Select
                            onValueChange={(value) => field.onChange(value || undefined)}
                            value={field.value ?? ''}
                            disabled={!selectedCreditProductId}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {categoryOptions.map((code) => (
                                <SelectItem key={code} value={code}>
                                  {categoryCodeLabels[code]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller
                      name="installments"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="installments">Numero de cuotas</FieldLabel>
                          <Input
                            id="installments"
                            type="number"
                            min={1}
                            value={field.value ?? ''}
                            onChange={(event) => field.onChange(Number(event.target.value))}
                            aria-invalid={fieldState.invalid}
                          />
                          {maxInstallmentsForCategory ? (
                            <p className="text-muted-foreground text-xs">
                              Maximo permitido: {formatNumber(maxInstallmentsForCategory, 0)}
                            </p>
                          ) : null}
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller
                      name="creditAmount"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="creditAmount">Valor del credito</FieldLabel>
                          <Input
                            id="creditAmount"
                            type="number"
                            min={0}
                            step="0.01"
                            value={field.value ?? ''}
                            onChange={(event) => field.onChange(Number(event.target.value))}
                            aria-invalid={fieldState.invalid}
                          />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller
                      name="firstPaymentDate"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="firstPaymentDate">Fecha primer pago</FieldLabel>
                          <DatePicker
                            id="firstPaymentDate"
                            value={field.value ?? null}
                            onChange={(value) => field.onChange(value ?? new Date())}
                            ariaInvalid={fieldState.invalid}
                          />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller
                      name="paymentFrequencyId"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="paymentFrequencyId">Periodicidad de pago</FieldLabel>
                          <Combobox
                            items={paymentFrequencies}
                            value={
                              paymentFrequencies.find((item) => item.id === field.value) ?? null
                            }
                            onValueChange={(value) => field.onChange(value?.id ?? undefined)}
                            itemToStringValue={(item) => String(item.id)}
                            itemToStringLabel={(item) =>
                              `${item.name} (${formatPaymentFrequencyRule({
                                scheduleMode: item.scheduleMode,
                                intervalDays: item.intervalDays,
                                dayOfMonth: item.dayOfMonth,
                                semiMonthDay1: item.semiMonthDay1,
                                semiMonthDay2: item.semiMonthDay2,
                              })})`
                            }
                          >
                            <ComboboxTrigger
                              render={
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="w-full justify-between font-normal"
                                >
                                  <ComboboxValue placeholder="Seleccione..." />
                                  <ChevronDownIcon className="text-muted-foreground size-4" />
                                </Button>
                              }
                            />
                            <ComboboxContent>
                              <ComboboxInput
                                placeholder="Buscar periodicidad..."
                                showClear
                                showTrigger={false}
                              />
                              <ComboboxList>
                                <ComboboxEmpty>No se encontraron periodicidades</ComboboxEmpty>
                                <ComboboxCollection>
                                  {(item) => (
                                    <ComboboxItem key={item.id} value={item}>
                                      {item.name} (
                                      {formatPaymentFrequencyRule({
                                        scheduleMode: item.scheduleMode,
                                        intervalDays: item.intervalDays,
                                        dayOfMonth: item.dayOfMonth,
                                        semiMonthDay1: item.semiMonthDay1,
                                        semiMonthDay2: item.semiMonthDay2,
                                      })}
                                      )
                                    </ComboboxItem>
                                  )}
                                </ComboboxCollection>
                              </ComboboxList>
                            </ComboboxContent>
                          </Combobox>
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller
                      name="income"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="income">Ingreso</FieldLabel>
                          <Input
                            id="income"
                            type="number"
                            min={0}
                            step="0.01"
                            value={field.value ?? ''}
                            onChange={(event) => field.onChange(Number(event.target.value))}
                            aria-invalid={fieldState.invalid}
                          />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller
                      name="expenses"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="expenses">Egresos</FieldLabel>
                          <Input
                            id="expenses"
                            type="number"
                            min={0}
                            step="0.01"
                            value={field.value ?? ''}
                            onChange={(event) => field.onChange(Number(event.target.value))}
                            aria-invalid={fieldState.invalid}
                          />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller
                      name="insuranceCompanyId"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="insuranceCompanyId">Aseguradora</FieldLabel>
                          <Combobox
                            items={insuranceCompanies}
                            value={
                              insuranceCompanies.find((item) => item.id === field.value) ?? null
                            }
                            onValueChange={(value) => field.onChange(value?.id ?? null)}
                            itemToStringValue={(item) => String(item.id)}
                            itemToStringLabel={(item) => item.businessName}
                            disabled={!selectedProduct?.paysInsurance}
                          >
                            <ComboboxTrigger
                              render={
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="w-full justify-between font-normal"
                                  disabled={!selectedProduct?.paysInsurance}
                                >
                                  <ComboboxValue placeholder="Seleccione..." />
                                  <ChevronDownIcon className="text-muted-foreground size-4" />
                                </Button>
                              }
                            />
                            <ComboboxContent>
                              <ComboboxInput
                                placeholder="Buscar aseguradora..."
                                showClear
                                showTrigger={false}
                              />
                              <ComboboxList>
                                <ComboboxEmpty>No se encontraron aseguradoras</ComboboxEmpty>
                                <ComboboxCollection>
                                  {(item) => (
                                    <ComboboxItem key={item.id} value={item}>
                                      {item.businessName}
                                    </ComboboxItem>
                                  )}
                                </ComboboxCollection>
                              </ComboboxList>
                            </ComboboxContent>
                          </Combobox>
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                  </FieldGroup>

                  <Button type="submit" className="w-full" disabled={isCalculating}>
                    {isCalculating && <Spinner />}
                    Calcular simulacion
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6 lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Resumen</CardTitle>
                <CardDescription>Resultado de la simulacion y capacidad de pago.</CardDescription>
              </CardHeader>
              <CardContent>
                {result ? (
                  <div className="space-y-4">
                    {result.capacity.warningMessage ? (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Capacidad de pago insuficiente</AlertTitle>
                        <AlertDescription>{result.capacity.warningMessage}</AlertDescription>
                      </Alert>
                    ) : (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>Capacidad de pago valida</AlertTitle>
                        <AlertDescription>
                          La cuota maxima se encuentra dentro del limite calculado.
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="grid gap-3 md:grid-cols-2">
                      <Stat
                        label="Tipo de financiamiento"
                        value={financingTypeLabels[result.financingType]}
                      />
                      <Stat
                        label="Tasa financiera"
                        value={formatPercent(result.financingFactor, 4)}
                      />
                      <Stat
                        label={
                          result.insuranceRateType === 'FIXED_AMOUNT'
                            ? 'Seguro (valor fijo)'
                            : 'Factor de seguro'
                        }
                        value={
                          result.insuranceRateType === 'FIXED_AMOUNT'
                            ? formatCurrency(result.insuranceFactor)
                            : formatPercent(result.insuranceFactor, 4)
                        }
                      />
                      <Stat
                        label="Capacidad de pago"
                        value={formatCurrency(result.capacity.paymentCapacity)}
                      />
                      <Stat
                        label="Total intereses"
                        value={formatCurrency(result.summary.totalInterest)}
                      />
                      <Stat
                        label="Total seguro"
                        value={formatCurrency(result.summary.totalInsurance)}
                      />
                      <Stat
                        label="Total a pagar"
                        value={formatCurrency(result.summary.totalPayment)}
                      />
                      <Stat
                        label="Cuota maxima"
                        value={formatCurrency(result.summary.maxInstallmentPayment)}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-muted-foreground text-sm">
                    Ejecute una simulacion para ver el resumen.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tabla de amortizacion</CardTitle>
                <CardDescription>
                  Detalle de cuotas, capital, interes, seguro y saldo.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {result ? (
                  <div className="max-h-120 overflow-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cuota</TableHead>
                          <TableHead>Vencimiento</TableHead>
                          <TableHead>Saldo inicial</TableHead>
                          <TableHead>Capital</TableHead>
                          <TableHead>Interes</TableHead>
                          <TableHead>Seguro</TableHead>
                          <TableHead>Pago</TableHead>
                          <TableHead>Saldo final</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.installments.map((item) => (
                          <TableRow key={item.installmentNumber}>
                            <TableCell>{item.installmentNumber}</TableCell>
                            <TableCell>{item.dueDate}</TableCell>
                            <TableCell>{formatCurrency(item.openingBalance)}</TableCell>
                            <TableCell>{formatCurrency(item.principal)}</TableCell>
                            <TableCell>{formatCurrency(item.interest)}</TableCell>
                            <TableCell>{formatCurrency(item.insurance)}</TableCell>
                            <TableCell>{formatCurrency(item.payment)}</TableCell>
                            <TableCell>{formatCurrency(item.closingBalance)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-muted-foreground text-sm">
                    Ejecute una simulacion para ver la tabla de amortizacion.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </PageContent>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
