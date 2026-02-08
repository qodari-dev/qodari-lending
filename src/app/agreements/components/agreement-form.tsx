'use client';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import {
  useCreateAgreement,
  useUpdateAgreement,
} from '@/hooks/queries/use-agreement-queries';
import { cn } from '@/lib/utils';
import { Agreement, CreateAgreementBodySchema } from '@/schemas/agreement';
import { City } from '@/schemas/city';
import { onSubmitError } from '@/utils/on-submit-error';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { CalendarIcon, ChevronDownIcon } from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useRef } from 'react';
import { Controller, FormProvider, type Resolver, useForm } from 'react-hook-form';
import { z } from 'zod';

type FormValues = z.infer<typeof CreateAgreementBodySchema>;

export function AgreementForm({
  agreement,
  opened,
  onOpened,
}: {
  agreement: Agreement | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  const formId = useId();
  const sheetContentRef = useRef<HTMLDivElement | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(CreateAgreementBodySchema) as Resolver<FormValues>,
    defaultValues: {
      agreementCode: '',
      documentNumber: '',
      businessName: '',
      cityId: undefined,
      address: null,
      phone: null,
      legalRepresentative: null,
      startDate: new Date(),
      endDate: null,
      note: null,
      isActive: true,
    },
  });

  const { data: citiesData } = useCities({
    limit: 2000,
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'name', order: 'asc' }],
  });

  const cities = useMemo(() => citiesData?.body?.data ?? [], [citiesData]);
  const findCity = useCallback(
    (id: number | undefined) => cities.find((city) => city.id === id) ?? null,
    [cities]
  );

  useEffect(() => {
    if (opened) {
      form.reset({
        agreementCode: agreement?.agreementCode ?? '',
        documentNumber: agreement?.documentNumber ?? '',
        businessName: agreement?.businessName ?? '',
        cityId: agreement?.cityId ?? undefined,
        address: agreement?.address ?? null,
        phone: agreement?.phone ?? null,
        legalRepresentative: agreement?.legalRepresentative ?? null,
        startDate: agreement?.startDate ? new Date(agreement.startDate) : new Date(),
        endDate: agreement?.endDate ? new Date(agreement.endDate) : null,
        note: agreement?.note ?? null,
        isActive: agreement?.isActive ?? true,
      });
    }
  }, [opened, agreement, form]);

  const { mutateAsync: create, isPending: isCreating } = useCreateAgreement();
  const { mutateAsync: update, isPending: isUpdating } = useUpdateAgreement();

  const isLoading = useMemo(() => isCreating || isUpdating, [isCreating, isUpdating]);

  const onSubmit = useCallback(
    async (values: FormValues) => {
      const payload = {
        ...values,
        agreementCode: values.agreementCode.trim().toUpperCase(),
        documentNumber: values.documentNumber.trim(),
        businessName: values.businessName.trim(),
        address: values.address?.trim() ? values.address.trim() : null,
        phone: values.phone?.trim() ? values.phone.trim() : null,
        legalRepresentative: values.legalRepresentative?.trim()
          ? values.legalRepresentative.trim()
          : null,
        note: values.note?.trim() ? values.note.trim() : null,
      };

      if (agreement) {
        await update({ params: { id: agreement.id }, body: payload });
      } else {
        await create({ body: payload });
      }

      onOpened(false);
    },
    [agreement, create, update, onOpened]
  );

  return (
    <Sheet open={opened} onOpenChange={onOpened}>
      <SheetContent ref={sheetContentRef} className="overflow-y-scroll sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>{agreement ? 'Editar Convenio' : 'Nuevo Convenio'}</SheetTitle>
          <SheetDescription>
            Registre los datos de la empresa pagaduria y su vigencia.
          </SheetDescription>
        </SheetHeader>
        <FormProvider {...form}>
          <form id={formId} onSubmit={form.handleSubmit(onSubmit, onSubmitError)} className="px-4">
            <FieldGroup>
              <Controller
                name="agreementCode"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="agreementCode">Codigo convenio</FieldLabel>
                    <Input
                      {...field}
                      maxLength={20}
                      value={field.value ?? ''}
                      onChange={(event) => field.onChange(event.target.value.toUpperCase())}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="documentNumber"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="documentNumber">NIT</FieldLabel>
                    <Input {...field} maxLength={17} aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="businessName"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="businessName">Empresa</FieldLabel>
                    <Input {...field} maxLength={80} aria-invalid={fieldState.invalid} />
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
                      items={cities}
                      value={findCity(field.value)}
                      onValueChange={(value: City | null) => field.onChange(value?.id ?? undefined)}
                      itemToStringValue={(item: City) => String(item.id)}
                      itemToStringLabel={(item: City) => item.name}
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
                        <ComboboxInput placeholder="Buscar ciudad..." showClear showTrigger={false} />
                        <ComboboxList>
                          <ComboboxEmpty>No se encontraron ciudades</ComboboxEmpty>
                          <ComboboxCollection>
                            {(item: City) => (
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
                name="address"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="address">Direccion</FieldLabel>
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      onChange={(event) => field.onChange(event.target.value || null)}
                      maxLength={120}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="phone"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="phone">Telefono</FieldLabel>
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      onChange={(event) => field.onChange(event.target.value || null)}
                      maxLength={20}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="legalRepresentative"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="legalRepresentative">Representante legal</FieldLabel>
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      onChange={(event) => field.onChange(event.target.value || null)}
                      maxLength={80}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="startDate"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="startDate">Fecha inicio</FieldLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="startDate"
                          type="button"
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                          aria-invalid={fieldState.invalid}
                        >
                          <CalendarIcon className="mr-2 size-4" />
                          {field.value ? format(field.value, 'PPP') : 'Seleccione fecha'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(value) => field.onChange(value ?? new Date())}
                          initialFocus
                          captionLayout="dropdown"
                        />
                      </PopoverContent>
                    </Popover>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="endDate"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="endDate">Fecha fin</FieldLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="endDate"
                          type="button"
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                          aria-invalid={fieldState.invalid}
                        >
                          <CalendarIcon className="mr-2 size-4" />
                          {field.value ? format(field.value, 'PPP') : 'Sin fecha fin'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ?? undefined}
                          onSelect={(value) => field.onChange(value ?? null)}
                          initialFocus
                          captionLayout="dropdown"
                        />
                      </PopoverContent>
                    </Popover>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="note"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="note">Nota</FieldLabel>
                    <Textarea
                      {...field}
                      value={field.value ?? ''}
                      onChange={(event) => field.onChange(event.target.value || null)}
                      maxLength={255}
                      aria-invalid={fieldState.invalid}
                    />
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
