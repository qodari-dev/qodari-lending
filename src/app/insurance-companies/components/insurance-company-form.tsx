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
import { Textarea } from '@/components/ui/textarea';
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
import { useAccountingDistributions } from '@/hooks/queries/use-accounting-distribution-queries';
import { useCities } from '@/hooks/queries/use-city-queries';
import { useIdentificationTypes } from '@/hooks/queries/use-identification-type-queries';
import {
  useCreateInsuranceCompany,
  useUpdateInsuranceCompany,
} from '@/hooks/queries/use-insurance-company-queries';
import { AccountingDistribution } from '@/schemas/accounting-distribution';
import { City } from '@/schemas/city';
import { IdentificationType } from '@/schemas/identification-type';
import { CreateInsuranceCompanyBodySchema, InsuranceCompany } from '@/schemas/insurance-company';
import { onSubmitError } from '@/utils/on-submit-error';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDownIcon } from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useRef } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { z } from 'zod';
import { InsuranceCompanyRateRangesForm } from './insurance-company-rate-ranges-form';

type FormValues = z.infer<typeof CreateInsuranceCompanyBodySchema>;

export function InsuranceCompanyForm({
  insuranceCompany,
  opened,
  onOpened,
}: {
  insuranceCompany: InsuranceCompany | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  const formId = useId();
  const sheetContentRef = useRef<HTMLDivElement | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(CreateInsuranceCompanyBodySchema),
    defaultValues: {
      identificationTypeId: undefined,
      documentNumber: '',
      verificationDigit: null,
      businessName: '',
      cityId: undefined,
      address: '',
      phone: null,
      mobileNumber: null,
      email: null,
      minimumValue: null,
      distributionId: undefined,
      note: null,
      isActive: true,
      insuranceRateRanges: [],
    },
  });

  // Fetch identification types
  const { data: identificationTypesData } = useIdentificationTypes({
    limit: 100,
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'id', order: 'asc' }],
  });
  const identificationTypes = useMemo(
    () => identificationTypesData?.body?.data ?? [],
    [identificationTypesData]
  );

  // Fetch cities
  const { data: citiesData } = useCities({
    limit: 2000,
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'name', order: 'asc' }],
  });
  const cities = useMemo(() => citiesData?.body?.data ?? [], [citiesData]);

  // Fetch accounting distributions
  const { data: accountingDistributionsData } = useAccountingDistributions({
    limit: 1000,
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'name', order: 'asc' }],
  });
  const accountingDistributions = useMemo(
    () => accountingDistributionsData?.body?.data ?? [],
    [accountingDistributionsData]
  );

  // Helpers para encontrar objetos por ID
  const findIdentificationType = useCallback(
    (id: number | undefined) => identificationTypes.find((t) => t.id === id) ?? null,
    [identificationTypes]
  );
  const findCity = useCallback(
    (id: number | undefined) => cities.find((c) => c.id === id) ?? null,
    [cities]
  );
  const findAccountingDistribution = useCallback(
    (id: number | undefined) =>
      accountingDistributions.find((distribution) => distribution.id === id) ?? null,
    [accountingDistributions]
  );

  useEffect(() => {
    if (opened) {
      form.reset({
        identificationTypeId: insuranceCompany?.identificationTypeId ?? undefined,
        documentNumber: insuranceCompany?.documentNumber ?? '',
        verificationDigit: insuranceCompany?.verificationDigit ?? null,
        businessName: insuranceCompany?.businessName ?? '',
        cityId: insuranceCompany?.cityId ?? undefined,
        address: insuranceCompany?.address ?? '',
        phone: insuranceCompany?.phone ?? null,
        mobileNumber: insuranceCompany?.mobileNumber ?? null,
        email: insuranceCompany?.email ?? null,
        minimumValue: insuranceCompany?.minimumValue ?? null,
        distributionId: insuranceCompany?.distributionId ?? undefined,
        note: insuranceCompany?.note ?? null,
        isActive: insuranceCompany?.isActive ?? true,
        insuranceRateRanges:
          insuranceCompany?.insuranceRateRanges?.map((r) => ({
            rangeMetric: r.rangeMetric,
            valueFrom: r.valueFrom,
            valueTo: r.valueTo,
            rateType: r.rateType,
            rateValue: r.rateValue,
            fixedAmount: r.fixedAmount,
          })) ?? [],
      });
    }
  }, [opened, insuranceCompany, form]);

  const { mutateAsync: create, isPending: isCreating } = useCreateInsuranceCompany();
  const { mutateAsync: update, isPending: isUpdating } = useUpdateInsuranceCompany();

  const isLoading = useMemo(() => isCreating || isUpdating, [isCreating, isUpdating]);

  const onSubmit = useCallback(
    async (values: FormValues) => {
      if (insuranceCompany) {
        await update({ params: { id: insuranceCompany.id }, body: values });
      } else {
        await create({ body: values });
      }
      onOpened(false);
    },
    [insuranceCompany, create, update, onOpened]
  );

  return (
    <Sheet open={opened} onOpenChange={onOpened}>
      <SheetContent ref={sheetContentRef} className="overflow-y-scroll sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>
            {insuranceCompany ? 'Editar Empresa de Seguros' : 'Nueva Empresa de Seguros'}
          </SheetTitle>
          <SheetDescription>
            Define la aseguradora y sus rangos de tasas de seguro.
          </SheetDescription>
        </SheetHeader>
        <FormProvider {...form}>
          <form id={formId} onSubmit={form.handleSubmit(onSubmit, onSubmitError)} className="px-4">
            <Tabs defaultValue="company" className="w-full">
              <TabsList className="mb-4 w-full">
                <TabsTrigger value="company">Empresa</TabsTrigger>
                <TabsTrigger value="rateRanges">Rangos de Tasas</TabsTrigger>
              </TabsList>

              <TabsContent value="company" className="space-y-4 pt-2">
                {/* Identificación */}
                <FieldGroup>
                  <h3 className="text-muted-foreground mb-2 text-sm font-semibold">
                    Identificación
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Controller
                      name="identificationTypeId"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="identificationTypeId">Tipo de Documento</FieldLabel>
                          <Combobox
                            items={identificationTypes}
                            value={findIdentificationType(field.value)}
                            onValueChange={(val: IdentificationType | null) =>
                              field.onChange(val?.id ?? undefined)
                            }
                            itemToStringValue={(item: IdentificationType) => String(item.id)}
                            itemToStringLabel={(item: IdentificationType) =>
                              `${item.code} - ${item.name}`
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
                            <ComboboxContent portalContainer={sheetContentRef}>
                              <ComboboxInput
                                placeholder="Buscar tipo..."
                                showClear
                                showTrigger={false}
                              />
                              <ComboboxList>
                                <ComboboxEmpty>No se encontraron tipos</ComboboxEmpty>
                                <ComboboxCollection>
                                  {(item: IdentificationType) => (
                                    <ComboboxItem key={item.id} value={item}>
                                      {item.code} - {item.name}
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
                      name="documentNumber"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="documentNumber">Número de Documento</FieldLabel>
                          <Input {...field} aria-invalid={fieldState.invalid} />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                    <Controller
                      name="verificationDigit"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="verificationDigit">
                            Dígito de Verificación
                          </FieldLabel>
                          <Input
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value || null)}
                            maxLength={1}
                            aria-invalid={fieldState.invalid}
                          />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                    <Controller
                      name="businessName"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="col-span-2">
                          <FieldLabel htmlFor="businessName">Razón Social</FieldLabel>
                          <Input {...field} aria-invalid={fieldState.invalid} />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                  </div>
                </FieldGroup>

                {/* Contacto */}
                <FieldGroup>
                  <h3 className="text-muted-foreground mb-2 text-sm font-semibold">Contacto</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Controller
                      name="cityId"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="cityId">Ciudad</FieldLabel>
                          <Combobox
                            items={cities}
                            value={findCity(field.value)}
                            onValueChange={(val: City | null) =>
                              field.onChange(val?.id ?? undefined)
                            }
                            itemToStringValue={(item: City) => String(item.id)}
                            itemToStringLabel={(item: City) => `${item.code} - ${item.name}`}
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
                                placeholder="Buscar ciudad..."
                                showClear
                                showTrigger={false}
                              />
                              <ComboboxList>
                                <ComboboxEmpty>No se encontraron ciudades</ComboboxEmpty>
                                <ComboboxCollection>
                                  {(item: City) => (
                                    <ComboboxItem key={item.id} value={item}>
                                      {item.code} - {item.name}
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
                      name="address"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="address">Dirección</FieldLabel>
                          <Input {...field} aria-invalid={fieldState.invalid} />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                    <Controller
                      name="phone"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="phone">Teléfono</FieldLabel>
                          <Input
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value || null)}
                            aria-invalid={fieldState.invalid}
                          />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                    <Controller
                      name="mobileNumber"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="mobileNumber">Celular</FieldLabel>
                          <Input
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value || null)}
                            aria-invalid={fieldState.invalid}
                          />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                    <Controller
                      name="email"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="col-span-2">
                          <FieldLabel htmlFor="email">Email</FieldLabel>
                          <Input
                            type="email"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value || null)}
                            aria-invalid={fieldState.invalid}
                          />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                  </div>
                </FieldGroup>

                {/* Parámetros de Seguro */}
                <FieldGroup>
                  <h3 className="text-muted-foreground mb-2 text-sm font-semibold">
                    Parámetros de Seguro
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Controller
                      name="minimumValue"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="minimumValue">Valor Mínimo</FieldLabel>
                          <Input
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value || null)}
                            aria-invalid={fieldState.invalid}
                          />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                  </div>
                </FieldGroup>

                {/* Distribuciones Contables */}
                <FieldGroup>
                  <h3 className="text-muted-foreground mb-2 text-sm font-semibold">
                    Distribuciones Contables
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Controller
                      name="distributionId"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="col-span-2">
                          <FieldLabel htmlFor="distributionId">
                            Distribución
                          </FieldLabel>
                          <Combobox
                            items={accountingDistributions}
                            value={findAccountingDistribution(field.value)}
                            onValueChange={(value: AccountingDistribution | null) =>
                              field.onChange(value?.id ?? undefined)
                            }
                            itemToStringValue={(item: AccountingDistribution) => String(item.id)}
                            itemToStringLabel={(item: AccountingDistribution) => item.name}
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
                                placeholder="Buscar distribucion..."
                                showClear
                                showTrigger={false}
                              />
                              <ComboboxList>
                                <ComboboxEmpty>No se encontraron distribuciones</ComboboxEmpty>
                                <ComboboxCollection>
                                  {(item: AccountingDistribution) => (
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
                  </div>
                </FieldGroup>

                {/* Estado y Nota */}
                <FieldGroup>
                  <h3 className="text-muted-foreground mb-2 text-sm font-semibold">Estado</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Controller
                      name="isActive"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="isActive">Activo</FieldLabel>
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
                      name="note"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="col-span-2">
                          <FieldLabel htmlFor="note">Nota</FieldLabel>
                          <Textarea
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value || null)}
                            aria-invalid={fieldState.invalid}
                            className="min-h-20"
                          />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                  </div>
                </FieldGroup>
              </TabsContent>

              <TabsContent value="rateRanges" className="pt-2">
                <InsuranceCompanyRateRangesForm />
              </TabsContent>
            </Tabs>
          </form>
        </FormProvider>

        <SheetFooter>
          <Button type="submit" form={formId} disabled={isLoading}>
            {isLoading && <Spinner />}
            Guardar
          </Button>
          <SheetClose asChild>
            <Button variant="outline">Cerrar</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
