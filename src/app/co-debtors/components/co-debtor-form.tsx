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
import { useCities } from '@/hooks/queries/use-city-queries';
import { useCreateCoDebtor, useUpdateCoDebtor } from '@/hooks/queries/use-co-debtor-queries';
import { useIdentificationTypes } from '@/hooks/queries/use-identification-type-queries';
import { CoDebtor, CreateCoDebtorBodySchema } from '@/schemas/co-debtor';
import { onSubmitError } from '@/utils/on-submit-error';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDownIcon } from 'lucide-react';
import { useCallback, useId, useMemo, useRef } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { z } from 'zod';

type FormValues = z.infer<typeof CreateCoDebtorBodySchema>;

export function CoDebtorForm({
  coDebtor,
  opened,
  onOpened,
}: {
  coDebtor: CoDebtor | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  const formId = useId();
  const sheetContentRef = useRef<HTMLDivElement | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(CreateCoDebtorBodySchema),
    defaultValues: {
      identificationTypeId: undefined,
      documentNumber: '',
      homeAddress: '',
      homeCityId: undefined,
      homePhone: '',
      companyName: '',
      workAddress: '',
      workCityId: undefined,
      workPhone: '',
    },
  });

  // Cargar tipos de identificación
  const { data: identificationTypesData } = useIdentificationTypes({
    limit: 100,
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'id', order: 'asc' }],
  });
  const identificationTypes = useMemo(() => {
    return identificationTypesData?.body?.data ?? [];
  }, [identificationTypesData]);

  // Preparar items para el Combobox de tipos de identificación
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

  // Cargar todas las ciudades activas (client-side filtering)
  const { data: citiesData } = useCities({
    limit: 2000,
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'name', order: 'asc' }],
  });
  const cities = useMemo(() => citiesData?.body?.data ?? [], [citiesData]);

  // Preparar items para el Combobox (array de IDs como strings)
  const cityItems = useMemo(() => cities.map((city) => String(city.id)), [cities]);

  // Map para buscar labels por ID
  const cityLabelsMap = useMemo(() => {
    const map = new Map<string, string>();
    cities.forEach((city) => {
      map.set(String(city.id), `${city.code} - ${city.name}`);
    });
    return map;
  }, [cities]);

  // Función para obtener el label de un valor
  const getCityLabel = useCallback(
    (value: string | null) => {
      if (!value) return '';
      return cityLabelsMap.get(value) ?? value;
    },
    [cityLabelsMap]
  );

  const handleOpenedChange = useCallback(
    (nextOpen: boolean) => {
      onOpened(nextOpen);
      if (!nextOpen) {
        return;
      }
      form.reset({
        identificationTypeId: coDebtor?.identificationTypeId ?? 0,
        documentNumber: coDebtor?.documentNumber ?? '',
        homeAddress: coDebtor?.homeAddress ?? '',
        homeCityId: coDebtor?.homeCityId ?? undefined,
        homePhone: coDebtor?.homePhone ?? '',
        companyName: coDebtor?.companyName ?? '',
        workAddress: coDebtor?.workAddress ?? '',
        workCityId: coDebtor?.workCityId ?? undefined,
        workPhone: coDebtor?.workPhone ?? '',
      });
    },
    [coDebtor, form, onOpened]
  );

  const { mutateAsync: create, isPending: isCreating } = useCreateCoDebtor();
  const { mutateAsync: update, isPending: isUpdating } = useUpdateCoDebtor();

  const isLoading = useMemo(() => isCreating || isUpdating, [isCreating, isUpdating]);

  const onSubmit = useCallback(
    async (values: FormValues) => {
      if (coDebtor) {
        await update({ params: { id: coDebtor.id }, body: values });
      } else {
        await create({ body: values });
      }
      onOpened(false);
    },
    [coDebtor, create, update, onOpened]
  );
  return (
    <Sheet open={opened} onOpenChange={handleOpenedChange}>
      <SheetContent ref={sheetContentRef} className="overflow-y-scroll sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Codeudor</SheetTitle>
          <SheetDescription>
            Maneja los datos de contacto y laborales del codeudor.
          </SheetDescription>
        </SheetHeader>
        <FormProvider {...form}>
          <form id={formId} onSubmit={form.handleSubmit(onSubmit, onSubmitError)} className="px-4">
            <FieldGroup>
              <h3 className="text-muted-foreground mb-2 text-sm font-semibold">Identificación</h3>
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
              </div>
            </FieldGroup>

            <FieldGroup className="mt-6">
              <h3 className="text-muted-foreground mb-2 text-sm font-semibold">
                Datos de Residencia
              </h3>
              <Controller
                name="homeAddress"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="homeAddress">Dirección</FieldLabel>
                    <Input {...field} aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <Controller
                  name="homeCityId"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="homeCityId">Ciudad</FieldLabel>
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
                  name="homePhone"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="homePhone">Teléfono</FieldLabel>
                      <Input {...field} aria-invalid={fieldState.invalid} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>
            </FieldGroup>

            <FieldGroup className="mt-6">
              <h3 className="text-muted-foreground mb-2 text-sm font-semibold">Datos Laborales</h3>
              <Controller
                name="companyName"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="companyName">Nombre Empresa</FieldLabel>
                    <Input {...field} aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="workAddress"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="workAddress">Dirección Trabajo</FieldLabel>
                    <Input {...field} aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <Controller
                  name="workCityId"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="workCityId">Ciudad Trabajo</FieldLabel>
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
                  name="workPhone"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="workPhone">Teléfono Trabajo</FieldLabel>
                      <Input {...field} aria-invalid={fieldState.invalid} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>
            </FieldGroup>
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
