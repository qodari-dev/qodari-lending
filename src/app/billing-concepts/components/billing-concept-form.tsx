'use client';

import { Button } from '@/components/ui/button';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useCreateBillingConcept,
  useUpdateBillingConcept,
} from '@/hooks/queries/use-billing-concept-queries';
import { useGlAccounts } from '@/hooks/queries/use-gl-account-queries';
import { GlAccount } from '@/schemas/gl-account';
import {
  BILLING_CONCEPT_BASE_AMOUNT_OPTIONS,
  BILLING_CONCEPT_CALC_METHOD_OPTIONS,
  BILLING_CONCEPT_FINANCING_MODE_OPTIONS,
  BILLING_CONCEPT_FREQUENCY_OPTIONS,
  BILLING_CONCEPT_RANGE_METRIC_OPTIONS,
  BILLING_CONCEPT_ROUNDING_MODE_OPTIONS,
  BILLING_CONCEPT_TYPE_OPTIONS,
  BillingConcept,
  billingConceptBaseAmountLabels,
  billingConceptCalcMethodLabels,
  billingConceptFinancingModeLabels,
  billingConceptFrequencyLabels,
  billingConceptRangeMetricLabels,
  billingConceptRoundingModeLabels,
  billingConceptTypeLabels,
  CreateBillingConceptBodySchema,
} from '@/schemas/billing-concept';
import { onSubmitError } from '@/utils/on-submit-error';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDownIcon } from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useRef } from 'react';
import { Controller, FormProvider, type Resolver, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { BillingConceptRulesForm } from './billing-concept-rules-form';

type FormValues = z.infer<typeof CreateBillingConceptBodySchema>;

export function BillingConceptForm({
  billingConcept,
  opened,
  onOpened,
}: {
  billingConcept: BillingConcept | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  const formId = useId();
  const sheetContentRef = useRef<HTMLDivElement | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(CreateBillingConceptBodySchema) as Resolver<FormValues>,
    defaultValues: {
      code: '',
      name: '',
      isSystem: false,
      conceptType: 'FEE',
      defaultFrequency: 'ONE_TIME',
      defaultFinancingMode: 'BILLED_SEPARATELY',
      calcMethod: 'FIXED_AMOUNT',
      baseAmount: null,
      rangeMetric: null,
      minAmount: null,
      maxAmount: null,
      roundingMode: 'NEAREST',
      roundingDecimals: 2,
      defaultGlAccountId: null,
      isActive: true,
      description: null,
      billingConceptRules: [],
    },
  });
  const calcMethod = useWatch({ control: form.control, name: 'calcMethod' });
  const isTieredMethod =
    calcMethod === 'TIERED_FIXED_AMOUNT' || calcMethod === 'TIERED_PERCENTAGE';
  const requiresBaseAmount = calcMethod === 'PERCENTAGE' || calcMethod === 'TIERED_PERCENTAGE';

  const { data: glAccountsData } = useGlAccounts({
    limit: 1000,
    where: { and: [{ detailType: 'RECEIVABLE', isActive: true }] },
    sort: [{ field: 'code', order: 'asc' }],
  });
  const glAccounts = useMemo(() => glAccountsData?.body?.data ?? [], [glAccountsData]);
  const findGlAccount = useCallback(
    (id: number | null | undefined) => glAccounts.find((item) => item.id === id) ?? null,
    [glAccounts]
  );

  useEffect(() => {
    if (opened) {
      form.reset({
        code: billingConcept?.code ?? '',
        name: billingConcept?.name ?? '',
        isSystem: billingConcept?.isSystem ?? false,
        conceptType: billingConcept?.conceptType ?? 'FEE',
        defaultFrequency: billingConcept?.defaultFrequency ?? 'ONE_TIME',
        defaultFinancingMode: billingConcept?.defaultFinancingMode ?? 'BILLED_SEPARATELY',
        calcMethod: billingConcept?.calcMethod ?? 'FIXED_AMOUNT',
        baseAmount: billingConcept?.baseAmount ?? null,
        rangeMetric: billingConcept?.rangeMetric ?? null,
        minAmount: billingConcept?.minAmount ?? null,
        maxAmount: billingConcept?.maxAmount ?? null,
        roundingMode: billingConcept?.roundingMode ?? 'NEAREST',
        roundingDecimals: billingConcept?.roundingDecimals ?? 2,
        defaultGlAccountId: billingConcept?.defaultGlAccountId ?? null,
        isActive: billingConcept?.isActive ?? true,
        description: billingConcept?.description ?? null,
        billingConceptRules:
          billingConcept?.billingConceptRules?.map((rule) => ({
            rate: rule.rate ?? null,
            amount: rule.amount ?? null,
            valueFrom: rule.valueFrom ?? null,
            valueTo: rule.valueTo ?? null,
            effectiveFrom: rule.effectiveFrom ? new Date(rule.effectiveFrom) : null,
            effectiveTo: rule.effectiveTo ? new Date(rule.effectiveTo) : null,
            isActive: rule.isActive,
          })) ?? [],
      });
    }
  }, [opened, billingConcept, form]);

  const { mutateAsync: create, isPending: isCreating } = useCreateBillingConcept();
  const { mutateAsync: update, isPending: isUpdating } = useUpdateBillingConcept();

  const isLoading = useMemo(() => isCreating || isUpdating, [isCreating, isUpdating]);

  const onSubmit = useCallback(
    async (values: FormValues) => {
      const payload = {
        ...values,
        code: values.code.trim().toUpperCase(),
        name: values.name.trim(),
        description: values.description?.trim() ? values.description.trim() : null,
      };

      if (billingConcept) {
        await update({ params: { id: billingConcept.id }, body: payload });
      } else {
        await create({ body: payload });
      }
      onOpened(false);
    },
    [billingConcept, create, update, onOpened]
  );

  return (
    <Sheet open={opened} onOpenChange={onOpened}>
      <SheetContent ref={sheetContentRef} className="overflow-y-scroll sm:max-w-4xl">
        <SheetHeader>
          <SheetTitle>
            {billingConcept ? 'Editar Concepto de Facturacion' : 'Nuevo Concepto de Facturacion'}
          </SheetTitle>
          <SheetDescription>
            Defina el concepto y sus reglas de calculo para usarlo en cobros y prelacion.
          </SheetDescription>
        </SheetHeader>

        <FormProvider {...form}>
          <form id={formId} onSubmit={form.handleSubmit(onSubmit, onSubmitError)} className="px-4">
            <Tabs defaultValue="concept" className="w-full">
              <TabsList className="mb-4 w-full">
                <TabsTrigger value="concept">Concepto</TabsTrigger>
                <TabsTrigger value="rules">Reglas</TabsTrigger>
              </TabsList>

              <TabsContent value="concept" className="space-y-4 pt-2">
                <FieldGroup>
                  <div className="grid grid-cols-2 gap-4">
                    <Controller
                      name="code"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="code">Codigo</FieldLabel>
                          <Input
                            id="code"
                            value={field.value}
                            maxLength={50}
                            onChange={(event) =>
                              field.onChange(
                                event.target.value
                                  .toUpperCase()
                                  .replace(/[^A-Z0-9_]/g, '')
                              )
                            }
                            aria-invalid={fieldState.invalid}
                          />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller
                      name="name"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="name">Nombre</FieldLabel>
                          <Input {...field} aria-invalid={fieldState.invalid} />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller
                      name="conceptType"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="conceptType">Tipo</FieldLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {BILLING_CONCEPT_TYPE_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {billingConceptTypeLabels[option]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller
                      name="defaultFrequency"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="defaultFrequency">Frecuencia default</FieldLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {BILLING_CONCEPT_FREQUENCY_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {billingConceptFrequencyLabels[option]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller
                      name="defaultFinancingMode"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="defaultFinancingMode">
                            Modo financiacion default
                          </FieldLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {BILLING_CONCEPT_FINANCING_MODE_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {billingConceptFinancingModeLabels[option]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller
                      name="calcMethod"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="calcMethod">Metodo calculo</FieldLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {BILLING_CONCEPT_CALC_METHOD_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {billingConceptCalcMethodLabels[option]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    {requiresBaseAmount && (
                      <Controller
                        name="baseAmount"
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor="baseAmount">Base</FieldLabel>
                            <Select
                              value={field.value ?? ''}
                              onValueChange={(value) => field.onChange(value || null)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccione..." />
                              </SelectTrigger>
                              <SelectContent>
                                {BILLING_CONCEPT_BASE_AMOUNT_OPTIONS.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {billingConceptBaseAmountLabels[option]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )}
                      />
                    )}

                    {isTieredMethod && (
                      <Controller
                        name="rangeMetric"
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor="rangeMetric">Metrica rango</FieldLabel>
                            <Select
                              value={field.value ?? ''}
                              onValueChange={(value) => field.onChange(value || null)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccione..." />
                              </SelectTrigger>
                              <SelectContent>
                                {BILLING_CONCEPT_RANGE_METRIC_OPTIONS.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {billingConceptRangeMetricLabels[option]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )}
                      />
                    )}

                    <Controller
                      name="minAmount"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="minAmount">Valor minimo</FieldLabel>
                          <Input
                            id="minAmount"
                            value={field.value ?? ''}
                            onChange={(event) => field.onChange(event.target.value || null)}
                            aria-invalid={fieldState.invalid}
                          />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller
                      name="maxAmount"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="maxAmount">Valor maximo</FieldLabel>
                          <Input
                            id="maxAmount"
                            value={field.value ?? ''}
                            onChange={(event) => field.onChange(event.target.value || null)}
                            aria-invalid={fieldState.invalid}
                          />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller
                      name="roundingMode"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="roundingMode">Redondeo</FieldLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {BILLING_CONCEPT_ROUNDING_MODE_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {billingConceptRoundingModeLabels[option]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller
                      name="roundingDecimals"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="roundingDecimals">Decimales</FieldLabel>
                          <Input
                            id="roundingDecimals"
                            type="number"
                            min={0}
                            max={6}
                            value={field.value ?? ''}
                            onChange={(event) => field.onChange(Number(event.target.value))}
                            aria-invalid={fieldState.invalid}
                          />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller
                      name="defaultGlAccountId"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="defaultGlAccountId">Cuenta default</FieldLabel>
                          <div className="space-y-2">
                            <Combobox
                              items={glAccounts}
                              value={findGlAccount(field.value)}
                              onValueChange={(value: GlAccount | null) =>
                                field.onChange(value?.id ?? null)
                              }
                              itemToStringValue={(item: GlAccount) => String(item.id)}
                              itemToStringLabel={(item: GlAccount) => `${item.code} - ${item.name}`}
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
                              <ComboboxContent portalContainer={sheetContentRef}>
                                <ComboboxInput
                                  placeholder="Buscar cuenta..."
                                  showClear
                                  showTrigger={false}
                                />
                                <ComboboxList>
                                  <ComboboxEmpty>No se encontraron cuentas</ComboboxEmpty>
                                  <ComboboxCollection>
                                    {(item: GlAccount) => (
                                      <ComboboxItem key={item.id} value={item}>
                                        {item.code} - {item.name}
                                      </ComboboxItem>
                                    )}
                                  </ComboboxCollection>
                                </ComboboxList>
                              </ComboboxContent>
                            </Combobox>

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2"
                              onClick={() => field.onChange(null)}
                            >
                              Sin cuenta default
                            </Button>
                          </div>
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                  </div>

                  <Controller
                    name="description"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="description">Descripcion</FieldLabel>
                        <Input
                          id="description"
                          value={field.value ?? ''}
                          onChange={(event) => field.onChange(event.target.value || null)}
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <Controller
                      name="isSystem"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="isSystem">Concepto sistema?</FieldLabel>
                          <div>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              aria-invalid={fieldState.invalid}
                            />
                          </div>
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller
                      name="isActive"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="isActive">Activo?</FieldLabel>
                          <div>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              aria-invalid={fieldState.invalid}
                            />
                          </div>
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                  </div>
                </FieldGroup>
              </TabsContent>

              <TabsContent value="rules" className="pt-2">
                <BillingConceptRulesForm />
              </TabsContent>
            </Tabs>
          </form>
        </FormProvider>

        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline" type="button">
              Cancelar
            </Button>
          </SheetClose>
          <Button type="submit" form={formId} disabled={isLoading}>
            {isLoading && <Spinner />}
            Guardar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
