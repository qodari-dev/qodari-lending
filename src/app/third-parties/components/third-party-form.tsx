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
import { Textarea } from '@/components/ui/textarea';
import { useCities } from '@/hooks/queries/use-city-queries';
import { useIdentificationTypes } from '@/hooks/queries/use-identification-type-queries';
import { useCreateThirdParty, useUpdateThirdParty } from '@/hooks/queries/use-third-party-queries';
import { useThirdPartyTypes } from '@/hooks/queries/use-third-party-type-queries';
import {
  CreateThirdPartyBodySchema,
  ThirdParty,
  PERSON_TYPE_OPTIONS,
  SEX_OPTIONS,
  TAXPAYER_TYPE_OPTIONS,
  personTypeLabels,
  sexLabels,
  taxpayerTypeLabels,
} from '@/schemas/third-party';
import { onSubmitError } from '@/utils/on-submit-error';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDownIcon } from 'lucide-react';
import { useCallback, useId, useMemo, useRef } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

type FormValues = z.infer<typeof CreateThirdPartyBodySchema>;

export function ThirdPartyForm({
  thirdParty,
  opened,
  onOpened,
}: {
  thirdParty: ThirdParty | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  const formId = useId();
  const sheetContentRef = useRef<HTMLDivElement | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(CreateThirdPartyBodySchema),
    defaultValues: {
      identificationTypeId: undefined,
      documentNumber: '',
      verificationDigit: '',
      personType: 'NATURAL',
      representativeIdNumber: '',
      firstLastName: '',
      secondLastName: '',
      firstName: '',
      secondName: '',
      businessName: '',
      sex: undefined,
      categoryCode: '',
      address: '',
      cityId: undefined,
      phone: '',
      mobilePhone: '',
      email: '',
      thirdPartyTypeId: undefined,
      taxpayerType: 'NATURAL_PERSON',
      hasRut: false,
      employerDocumentNumber: '',
      employerBusinessName: '',
      note: '',
    },
  });

  const personType = useWatch({ control: form.control, name: 'personType' });

  // Fetch identification types
  const { data: identificationTypesData } = useIdentificationTypes({
    limit: 100,
    where: { and: [{ isActive: true }] },
  });
  const identificationTypes = useMemo(
    () => identificationTypesData?.body?.data ?? [],
    [identificationTypesData]
  );

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

  // Fetch third party types for the select
  const { data: thirdPartyTypesData } = useThirdPartyTypes({ limit: 100 });
  const thirdPartyTypes = useMemo(
    () => thirdPartyTypesData?.body?.data ?? [],
    [thirdPartyTypesData]
  );

  // Cargar todas las ciudades activas (client-side filtering)
  const { data: citiesData } = useCities({
    limit: 2000,
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'name', order: 'asc' }],
  });
  const cities = useMemo(() => citiesData?.body?.data ?? [], [citiesData]);

  // Preparar items para el Combobox de ciudades
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

  const handleOpenedChange = useCallback(
    (nextOpen: boolean) => {
      onOpened(nextOpen);
      if (!nextOpen) {
        return;
      }
      form.reset({
        identificationTypeId: thirdParty?.identificationTypeId ?? 0,
        documentNumber: thirdParty?.documentNumber ?? '',
        verificationDigit: thirdParty?.verificationDigit ?? '',
        personType: thirdParty?.personType ?? 'NATURAL',
        representativeIdNumber: thirdParty?.representativeIdNumber ?? '',
        firstLastName: thirdParty?.firstLastName ?? '',
        secondLastName: thirdParty?.secondLastName ?? '',
        firstName: thirdParty?.firstName ?? '',
        secondName: thirdParty?.secondName ?? '',
        businessName: thirdParty?.businessName ?? '',
        sex: thirdParty?.sex ?? undefined,
        categoryCode: thirdParty?.categoryCode ?? '',
        address: thirdParty?.address ?? '',
        cityId: thirdParty?.cityId ?? 0,
        phone: thirdParty?.phone ?? '',
        mobilePhone: thirdParty?.mobilePhone ?? '',
        email: thirdParty?.email ?? '',
        thirdPartyTypeId: thirdParty?.thirdPartyTypeId ?? 0,
        taxpayerType: thirdParty?.taxpayerType ?? 'NATURAL_PERSON',
        hasRut: thirdParty?.hasRut ?? false,
        employerDocumentNumber: thirdParty?.employerDocumentNumber ?? '',
        employerBusinessName: thirdParty?.employerBusinessName ?? '',
        note: thirdParty?.note ?? '',
      });
    },
    [thirdParty, form, onOpened]
  );

  const { mutateAsync: create, isPending: isCreating } = useCreateThirdParty();
  const { mutateAsync: update, isPending: isUpdating } = useUpdateThirdParty();

  const isLoading = useMemo(() => isCreating || isUpdating, [isCreating, isUpdating]);

  const onSubmit = useCallback(
    async (values: FormValues) => {
      if (thirdParty) {
        await update({ params: { id: thirdParty.id }, body: values });
      } else {
        await create({ body: values });
      }
      onOpened(false);
    },
    [thirdParty, create, update, onOpened]
  );

  return (
    <Sheet open={opened} onOpenChange={handleOpenedChange}>
      <SheetContent ref={sheetContentRef} className="overflow-y-scroll sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Tercero</SheetTitle>
          <SheetDescription>Maneja la informacion del tercero.</SheetDescription>
        </SheetHeader>
        <FormProvider {...form}>
          <form id={formId} onSubmit={form.handleSubmit(onSubmit, onSubmitError)} className="px-4">
            {/* Identificacion */}
            <FieldGroup>
              <h3 className="text-muted-foreground mb-2 text-sm font-semibold">Identificacion</h3>
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
                      <FieldLabel htmlFor="documentNumber">Numero de Documento</FieldLabel>
                      <Input {...field} aria-invalid={fieldState.invalid} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Controller
                  name="verificationDigit"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="verificationDigit">Digito Verificacion</FieldLabel>
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        maxLength={1}
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  name="personType"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="personType">Tipo de Persona</FieldLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {PERSON_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>
                              {personTypeLabels[option]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>
            </FieldGroup>

            {/* Datos Persona Natural */}
            {personType === 'NATURAL' && (
              <FieldGroup className="mt-6">
                <h3 className="text-muted-foreground mb-2 text-sm font-semibold">
                  Datos Persona Natural
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <Controller
                    name="firstName"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="firstName">Primer Nombre</FieldLabel>
                        <Input
                          {...field}
                          value={field.value ?? ''}
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                  <Controller
                    name="secondName"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="secondName">Segundo Nombre</FieldLabel>
                        <Input
                          {...field}
                          value={field.value ?? ''}
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Controller
                    name="firstLastName"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="firstLastName">Primer Apellido</FieldLabel>
                        <Input
                          {...field}
                          value={field.value ?? ''}
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                  <Controller
                    name="secondLastName"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="secondLastName">Segundo Apellido</FieldLabel>
                        <Input
                          {...field}
                          value={field.value ?? ''}
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                </div>
                <Controller
                  name="sex"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="sex">Sexo</FieldLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ''}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {SEX_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>
                              {sexLabels[option]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </FieldGroup>
            )}

            {/* Datos Persona Juridica */}
            {personType === 'LEGAL' && (
              <FieldGroup className="mt-6">
                <h3 className="text-muted-foreground mb-2 text-sm font-semibold">
                  Datos Persona Juridica
                </h3>
                <Controller
                  name="businessName"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="businessName">Razon Social</FieldLabel>
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  name="representativeIdNumber"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="representativeIdNumber">
                        Cedula Representante Legal
                      </FieldLabel>
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </FieldGroup>
            )}

            {/* Contacto */}
            <FieldGroup className="mt-6">
              <h3 className="text-muted-foreground mb-2 text-sm font-semibold">Contacto</h3>
              <Controller
                name="address"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="address">Direccion</FieldLabel>
                    <Input {...field} value={field.value ?? ''} aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
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
              <div className="grid grid-cols-2 gap-4">
                <Controller
                  name="phone"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="phone">Telefono</FieldLabel>
                      <Input {...field} aria-invalid={fieldState.invalid} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  name="mobilePhone"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="mobilePhone">Celular</FieldLabel>
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>
              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="email">Correo Electronico</FieldLabel>
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      type="email"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </FieldGroup>

            {/* Clasificacion */}
            <FieldGroup className="mt-6">
              <h3 className="text-muted-foreground mb-2 text-sm font-semibold">Clasificacion</h3>
              <div className="grid grid-cols-2 gap-4">
                <Controller
                  name="thirdPartyTypeId"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="thirdPartyTypeId">Tipo de Tercero</FieldLabel>
                      <Select
                        onValueChange={(val) => field.onChange(Number(val))}
                        value={field.value ? String(field.value) : ''}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {thirdPartyTypes.map((type) => (
                            <SelectItem key={type.id} value={String(type.id)}>
                              {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  name="taxpayerType"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="taxpayerType">Tipo de Contribuyente</FieldLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {TAXPAYER_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>
                              {taxpayerTypeLabels[option]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Controller
                  name="categoryCode"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="categoryCode">Codigo Categoria</FieldLabel>
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        maxLength={1}
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  name="hasRut"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="hasRut">¿Tiene RUT?</FieldLabel>
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

            {/* Datos Empleador */}
            <FieldGroup className="mt-6">
              <h3 className="text-muted-foreground mb-2 text-sm font-semibold">
                Datos Empleador (Opcional)
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <Controller
                  name="employerDocumentNumber"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="employerDocumentNumber">NIT Empleador</FieldLabel>
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  name="employerBusinessName"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="employerBusinessName">Razon Social Empleador</FieldLabel>
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>
            </FieldGroup>

            {/* Notas */}
            <FieldGroup className="mt-6">
              <h3 className="text-muted-foreground mb-2 text-sm font-semibold">Notas</h3>
              <Controller
                name="note"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="note">Observaciones</FieldLabel>
                    <Textarea
                      {...field}
                      value={field.value ?? ''}
                      rows={3}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
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
