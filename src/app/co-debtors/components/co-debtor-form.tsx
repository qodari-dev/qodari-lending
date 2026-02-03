'use client';

import { Button } from '@/components/ui/button';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
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
import { useCities } from '@/hooks/queries/use-city-queries';
import { useCreateCoDebtor, useUpdateCoDebtor } from '@/hooks/queries/use-co-debtor-queries';
import { useIdentificationTypes } from '@/hooks/queries/use-identification-type-queries';
import { CoDebtor, CreateCoDebtorBodySchema } from '@/schemas/co-debtor';
import { onSubmitError } from '@/utils/on-submit-error';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { useDebounce } from 'use-debounce';
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

  const form = useForm<FormValues>({
    resolver: zodResolver(CreateCoDebtorBodySchema),
    defaultValues: {
      identificationTypeId: 0,
      documentNumber: '',
      homeAddress: '',
      homeCityId: 0,
      homePhone: '',
      companyName: '',
      workAddress: '',
      workCityId: 0,
      workPhone: '',
    },
  });

  // Cargar tipos de identificación
  const { data: identificationTypesData } = useIdentificationTypes({
    limit: 100,
    where: { and: [{ isActive: true }] },
  });
  const identificationTypes = identificationTypesData?.body?.data ?? [];

  // Estado para búsqueda de ciudades
  const [homeCitySearch, setHomeCitySearch] = useState('');
  const [workCitySearch, setWorkCitySearch] = useState('');
  const [debouncedHomeCitySearch] = useDebounce(homeCitySearch, 300);
  const [debouncedWorkCitySearch] = useDebounce(workCitySearch, 300);

  // Cargar ciudades con búsqueda
  const { data: homeCitiesData } = useCities({
    search: debouncedHomeCitySearch,
    limit: 50,
    where: { and: [{ isActive: true }] },
  });
  const { data: workCitiesData } = useCities({
    search: debouncedWorkCitySearch,
    limit: 50,
    where: { and: [{ isActive: true }] },
  });

  const homeCities = homeCitiesData?.body?.data ?? [];
  const workCities = workCitiesData?.body?.data ?? [];

  useEffect(() => {
    if (opened) {
      form.reset({
        identificationTypeId: coDebtor?.identificationTypeId ?? 0,
        documentNumber: coDebtor?.documentNumber ?? '',
        homeAddress: coDebtor?.homeAddress ?? '',
        homeCityId: coDebtor?.homeCityId ?? 0,
        homePhone: coDebtor?.homePhone ?? '',
        companyName: coDebtor?.companyName ?? '',
        workAddress: coDebtor?.workAddress ?? '',
        workCityId: coDebtor?.workCityId ?? 0,
        workPhone: coDebtor?.workPhone ?? '',
      });
      // Reset search states
      setHomeCitySearch('');
      setWorkCitySearch('');
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
      <SheetContent className="overflow-y-scroll sm:max-w-2xl">
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
                      <Select
                        onValueChange={(val) => field.onChange(Number(val))}
                        value={field.value ? String(field.value) : ''}
                      >
                        <SelectTrigger aria-invalid={fieldState.invalid}>
                          <SelectValue placeholder="Seleccione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {identificationTypes.map((type) => (
                            <SelectItem key={type.id} value={String(type.id)}>
                              {type.code} - {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                        value={field.value}
                        onValueChange={field.onChange}
                        onInputValueChange={setHomeCitySearch}
                      >
                        <ComboboxInput placeholder="Buscar ciudad..." showClear />
                        <ComboboxContent>
                          <ComboboxList>
                            {homeCities.map((city) => (
                              <ComboboxItem key={city.id} value={city.id}>
                                {city.code} - {city.name}
                              </ComboboxItem>
                            ))}
                          </ComboboxList>
                          <ComboboxEmpty>No se encontraron ciudades</ComboboxEmpty>
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
                        value={field.value}
                        onValueChange={field.onChange}
                        onInputValueChange={setWorkCitySearch}
                      >
                        <ComboboxInput placeholder="Buscar ciudad..." showClear />
                        <ComboboxContent>
                          <ComboboxList>
                            {workCities.map((city) => (
                              <ComboboxItem key={city.id} value={city.id}>
                                {city.code} - {city.name}
                              </ComboboxItem>
                            ))}
                          </ComboboxList>
                          <ComboboxEmpty>No se encontraron ciudades</ComboboxEmpty>
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
