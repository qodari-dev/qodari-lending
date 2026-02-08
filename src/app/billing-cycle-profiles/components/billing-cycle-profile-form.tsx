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
import { useAgreements } from '@/hooks/queries/use-agreement-queries';
import {
  useCreateBillingCycleProfile,
  useUpdateBillingCycleProfile,
} from '@/hooks/queries/use-billing-cycle-profile-queries';
import { useCreditProducts } from '@/hooks/queries/use-credit-product-queries';
import {
  BillingCycleProfile,
  CreateBillingCycleProfileBodySchema,
  WEEKEND_POLICY_OPTIONS,
  weekendPolicyLabels,
} from '@/schemas/billing-cycle-profile';
import { Agreement } from '@/schemas/agreement';
import { CreditProduct } from '@/schemas/credit-product';
import { onSubmitError } from '@/utils/on-submit-error';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDownIcon } from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useRef } from 'react';
import { Controller, FormProvider, type Resolver, useForm } from 'react-hook-form';
import { z } from 'zod';
import { BillingCycleProfileCyclesForm } from './billing-cycle-profile-cycles-form';

type FormValues = z.infer<typeof CreateBillingCycleProfileBodySchema>;

export function BillingCycleProfileForm({
  billingCycleProfile,
  opened,
  onOpened,
}: {
  billingCycleProfile: BillingCycleProfile | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  const formId = useId();
  const sheetContentRef = useRef<HTMLDivElement | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(CreateBillingCycleProfileBodySchema) as Resolver<FormValues>,
    defaultValues: {
      name: '',
      creditProductId: undefined,
      agreementId: null,
      cyclesPerMonth: 1,
      weekendPolicy: 'NEXT_BUSINESS_DAY',
      isActive: true,
      billingCycleProfileCycles: [],
    },
  });

  const { data: creditProductsData } = useCreditProducts({
    limit: 1000,
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'name', order: 'asc' }],
  });
  const creditProducts = useMemo(() => creditProductsData?.body?.data ?? [], [creditProductsData]);
  const findCreditProduct = useCallback(
    (id: number | undefined) => creditProducts.find((item) => item.id === id) ?? null,
    [creditProducts]
  );

  const { data: agreementsData } = useAgreements({
    limit: 1000,
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'businessName', order: 'asc' }],
  });
  const agreements = useMemo(() => agreementsData?.body?.data ?? [], [agreementsData]);
  const findAgreement = useCallback(
    (id: number | null | undefined) => agreements.find((item) => item.id === id) ?? null,
    [agreements]
  );

  useEffect(() => {
    if (opened) {
      form.reset({
        name: billingCycleProfile?.name ?? '',
        creditProductId: billingCycleProfile?.creditProductId ?? undefined,
        agreementId: billingCycleProfile?.agreementId ?? null,
        cyclesPerMonth: billingCycleProfile?.cyclesPerMonth ?? 1,
        weekendPolicy: billingCycleProfile?.weekendPolicy ?? 'NEXT_BUSINESS_DAY',
        isActive: billingCycleProfile?.isActive ?? true,
        billingCycleProfileCycles:
          billingCycleProfile?.billingCycleProfileCycles?.map((cycle) => ({
            cycleInMonth: cycle.cycleInMonth,
            cutoffDay: cycle.cutoffDay,
            runDay: cycle.runDay,
            expectedPayDay: cycle.expectedPayDay,
            isActive: cycle.isActive,
          })) ?? [],
      });
    }
  }, [opened, billingCycleProfile, form]);

  const { mutateAsync: create, isPending: isCreating } = useCreateBillingCycleProfile();
  const { mutateAsync: update, isPending: isUpdating } = useUpdateBillingCycleProfile();

  const isLoading = useMemo(() => isCreating || isUpdating, [isCreating, isUpdating]);

  const onSubmit = useCallback(
    async (values: FormValues) => {
      const payload = {
        ...values,
        name: values.name.trim(),
      };

      if (billingCycleProfile) {
        await update({ params: { id: billingCycleProfile.id }, body: payload });
      } else {
        await create({ body: payload });
      }

      onOpened(false);
    },
    [billingCycleProfile, create, update, onOpened]
  );

  return (
    <Sheet open={opened} onOpenChange={onOpened}>
      <SheetContent ref={sheetContentRef} className="overflow-y-scroll sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>
            {billingCycleProfile ? 'Editar Perfil de Facturacion' : 'Nuevo Perfil de Facturacion'}
          </SheetTitle>
          <SheetDescription>
            Defina el perfil y los ciclos de corte/generacion para el recaudo.
          </SheetDescription>
        </SheetHeader>
        <FormProvider {...form}>
          <form id={formId} onSubmit={form.handleSubmit(onSubmit, onSubmitError)} className="px-4">
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="mb-4 w-full">
                <TabsTrigger value="profile">Perfil</TabsTrigger>
                <TabsTrigger value="cycles">Ciclos</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-4 pt-2">
                <FieldGroup>
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
                    name="creditProductId"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="creditProductId">Tipo de credito</FieldLabel>
                        <Combobox
                          items={creditProducts}
                          value={findCreditProduct(field.value)}
                          onValueChange={(value: CreditProduct | null) =>
                            field.onChange(value?.id ?? undefined)
                          }
                          itemToStringValue={(item: CreditProduct) => String(item.id)}
                          itemToStringLabel={(item: CreditProduct) => item.name}
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
                              placeholder="Buscar tipo credito..."
                              showClear
                              showTrigger={false}
                            />
                            <ComboboxList>
                              <ComboboxEmpty>No se encontraron tipos de credito</ComboboxEmpty>
                              <ComboboxCollection>
                                {(item: CreditProduct) => (
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
                    name="agreementId"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="agreementId">Convenio (opcional)</FieldLabel>
                        <div className="space-y-2">
                          <Combobox
                            items={agreements}
                            value={findAgreement(field.value)}
                            onValueChange={(value: Agreement | null) => field.onChange(value?.id ?? null)}
                            itemToStringValue={(item: Agreement) => String(item.id)}
                            itemToStringLabel={(item: Agreement) =>
                              `${item.agreementCode} - ${item.businessName}`
                            }
                          >
                            <ComboboxTrigger
                              render={
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="w-full justify-between font-normal"
                                >
                                  <ComboboxValue placeholder="Default por producto" />
                                  <ChevronDownIcon className="text-muted-foreground size-4" />
                                </Button>
                              }
                            />
                            <ComboboxContent portalContainer={sheetContentRef}>
                              <ComboboxInput
                                placeholder="Buscar convenio..."
                                showClear
                                showTrigger={false}
                              />
                              <ComboboxList>
                                <ComboboxEmpty>No se encontraron convenios</ComboboxEmpty>
                                <ComboboxCollection>
                                  {(item: Agreement) => (
                                    <ComboboxItem key={item.id} value={item}>
                                      {item.agreementCode} - {item.businessName}
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
                            Usar default del producto
                          </Button>
                        </div>
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />

                  <Controller
                    name="cyclesPerMonth"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="cyclesPerMonth">Ciclos por mes</FieldLabel>
                        <Input
                          id="cyclesPerMonth"
                          type="number"
                          min={1}
                          value={field.value ?? ''}
                          onChange={(event) => {
                            const value = event.target.value;
                            field.onChange(value === '' ? undefined : Number(value));
                          }}
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />

                  <Controller
                    name="weekendPolicy"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="weekendPolicy">Politica fin de semana</FieldLabel>
                        <select
                          id="weekendPolicy"
                          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                          value={field.value}
                          onChange={(event) => field.onChange(event.target.value)}
                          aria-invalid={fieldState.invalid}
                        >
                          {WEEKEND_POLICY_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {weekendPolicyLabels[option]}
                            </option>
                          ))}
                        </select>
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
                </FieldGroup>
              </TabsContent>

              <TabsContent value="cycles" className="pt-2">
                <BillingCycleProfileCyclesForm />
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
