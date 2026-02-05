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
import { useCities } from '@/hooks/queries/use-city-queries';
import { useIdentificationTypes } from '@/hooks/queries/use-identification-type-queries';
import {
  useCreateInsuranceCompany,
  useUpdateInsuranceCompany,
} from '@/hooks/queries/use-insurance-company-queries';
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
      factor: '',
      minimumValue: null,
      totalChargeDistributionId: null,
      monthlyDistributionId: undefined,
      note: null,
      isActive: true,
      insuranceRateRanges: [],
    },
  });

  // Fetch identification types
  const { data: identificationTypesData } = useIdentificationTypes({
    limit: 100,
    where: { and: [{ isActive: true }] },
  });
  const identificationTypes = useMemo(
    () => identificationTypesData?.body?.data ?? [],
    [identificationTypesData]
  );
  const identificationTypeItems = useMemo(
    () => identificationTypes.map((type) => String(type.id)),
    [identificationTypes]
  );
  const identificationTypeLabelsMap = useMemo(() => {
    const map = new Map<string, string>();
    identificationTypes.forEach((type) => {
      map.set(String(type.id), `${type.code} - ${type.name}`);
    });
    return map;
  }, [identificationTypes]);
  const getIdentificationTypeLabel = useCallback(
    (value: string | null) => {
      if (!value) return '';
      return identificationTypeLabelsMap.get(value) ?? value;
    },
    [identificationTypeLabelsMap]
  );

  // Fetch cities
  const { data: citiesData } = useCities({
    limit: 2000,
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'name', order: 'asc' }],
  });
  const cities = useMemo(() => citiesData?.body?.data ?? [], [citiesData]);
  const cityItems = useMemo(() => cities.map((city) => String(city.id)), [cities]);
  const cityLabelsMap = useMemo(() => {
    const map = new Map<string, string>();
    cities.forEach((city) => {
      map.set(String(city.id), `${city.code} - ${city.name}`);
    });
    return map;
  }, [cities]);
  const getCityLabel = useCallback(
    (value: string | null) => {
      if (!value) return '';
      return cityLabelsMap.get(value) ?? value;
    },
    [cityLabelsMap]
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
        factor: insuranceCompany?.factor ?? '',
        minimumValue: insuranceCompany?.minimumValue ?? null,
        totalChargeDistributionId: insuranceCompany?.totalChargeDistributionId ?? null,
        monthlyDistributionId: insuranceCompany?.monthlyDistributionId ?? undefined,
        note: insuranceCompany?.note ?? null,
        isActive: insuranceCompany?.isActive ?? true,
        insuranceRateRanges:
          insuranceCompany?.insuranceRateRanges?.map((r) => ({
            rangeMetric: r.rangeMetric,
            valueFrom: r.valueFrom,
            valueTo: r.valueTo,
            rateValue: r.rateValue,
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
                            items={identificationTypeItems}
                            value={field.value ? String(field.value) : null}
                            onValueChange={(val) => field.onChange(val ? Number(val) : undefined)}
                            itemToStringLabel={getIdentificationTypeLabel}
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
                                  {(value) => (
                                    <ComboboxItem key={value} value={value}>
                                      {getIdentificationTypeLabel(value)}
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
                            items={cityItems}
                            value={field.value ? String(field.value) : null}
                            onValueChange={(val) => field.onChange(val ? Number(val) : undefined)}
                            itemToStringLabel={getCityLabel}
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
                                  {(value) => (
                                    <ComboboxItem key={value} value={value}>
                                      {getCityLabel(value)}
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
                      name="factor"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="factor">Factor</FieldLabel>
                          <Input {...field} aria-invalid={fieldState.invalid} />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
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
                      name="totalChargeDistributionId"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="totalChargeDistributionId">
                            Distribución Cobro Total
                          </FieldLabel>
                          <Input
                            type="number"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) =>
                              field.onChange(e.target.value ? Number(e.target.value) : null)
                            }
                            aria-invalid={fieldState.invalid}
                          />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                    <Controller
                      name="monthlyDistributionId"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="monthlyDistributionId">
                            Distribución Mensual
                          </FieldLabel>
                          <Input
                            type="number"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) =>
                              field.onChange(e.target.value ? Number(e.target.value) : undefined)
                            }
                            aria-invalid={fieldState.invalid}
                          />
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
