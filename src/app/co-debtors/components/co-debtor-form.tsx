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
import { City } from '@/schemas/city';
import { CoDebtor, CreateCoDebtorBodySchema } from '@/schemas/co-debtor';
import { IdentificationType } from '@/schemas/identification-type';
import { onSubmitError } from '@/utils/on-submit-error';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDownIcon } from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useRef } from 'react';
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
  const identificationTypes = useMemo(
    () => identificationTypesData?.body?.data ?? [],
    [identificationTypesData]
  );

  // Cargar todas las ciudades activas
  const { data: citiesData } = useCities({
    limit: 2000,
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'name', order: 'asc' }],
  });
  const cities = useMemo(() => citiesData?.body?.data ?? [], [citiesData]);

  // Helpers para encontrar objetos por ID
  const findIdentificationType = useCallback(
    (id: number | undefined) => identificationTypes.find((t) => t.id === id) ?? null,
    [identificationTypes]
  );
  const findCity = useCallback(
    (id: number | undefined) => cities.find((c) => c.id === id) ?? null,
    [cities]
  );

  useEffect(() => {
    if (opened) {
      form.reset({
        identificationTypeId: coDebtor?.identificationTypeId ?? undefined,
        documentNumber: coDebtor?.documentNumber ?? '',
        homeAddress: coDebtor?.homeAddress ?? '',
        homeCityId: coDebtor?.homeCityId ?? undefined,
        homePhone: coDebtor?.homePhone ?? '',
        companyName: coDebtor?.companyName ?? '',
        workAddress: coDebtor?.workAddress ?? '',
        workCityId: coDebtor?.workCityId ?? undefined,
        workPhone: coDebtor?.workPhone ?? '',
      });
    }
  }, [opened, coDebtor, form]);

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
    <Sheet open={opened} onOpenChange={onOpened}>
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
                        items={cities}
                        value={findCity(field.value)}
                        onValueChange={(val: City | null) => field.onChange(val?.id ?? undefined)}
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
                        items={cities}
                        value={findCity(field.value)}
                        onValueChange={(val: City | null) => field.onChange(val?.id ?? undefined)}
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
