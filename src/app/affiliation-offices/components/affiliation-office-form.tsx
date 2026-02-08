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
import { useCities } from '@/hooks/queries/use-city-queries';
import { useCostCenters } from '@/hooks/queries/use-cost-center-queries';
import {
  useCreateAffiliationOffice,
  useUpdateAffiliationOffice,
} from '@/hooks/queries/use-affiliation-office-queries';
import { AffiliationOffice, CreateAffiliationOfficeBodySchema } from '@/schemas/affiliation-office';
import { City } from '@/schemas/city';
import { CostCenter } from '@/schemas/cost-center';
import { onSubmitError } from '@/utils/on-submit-error';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDownIcon } from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useRef } from 'react';
import { Controller, FormProvider, type Resolver, useForm } from 'react-hook-form';
import { z } from 'zod';
import { AffiliationOfficeUsersForm } from './affiliation-office-users-form';

type FormValues = z.infer<typeof CreateAffiliationOfficeBodySchema>;

export function AffiliationOfficeForm({
  affiliationOffice,
  opened,
  onOpened,
}: {
  affiliationOffice: AffiliationOffice | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  const formId = useId();
  const sheetContentRef = useRef<HTMLDivElement | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(CreateAffiliationOfficeBodySchema) as Resolver<FormValues>,
    defaultValues: {
      code: '',
      name: '',
      cityId: undefined,
      address: '',
      phone: null,
      representativeName: '',
      email: null,
      costCenterId: null,
      isActive: true,
      userAffiliationOffices: [],
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

  const { data: costCentersData } = useCostCenters({
    limit: 1000,
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'code', order: 'asc' }],
  });
  const costCenters = useMemo(() => costCentersData?.body?.data ?? [], [costCentersData]);
  const findCostCenter = useCallback(
    (id: number | null | undefined) => costCenters.find((center) => center.id === id) ?? null,
    [costCenters]
  );

  useEffect(() => {
    if (opened) {
      form.reset({
        code: affiliationOffice?.code ?? '',
        name: affiliationOffice?.name ?? '',
        cityId: affiliationOffice?.cityId ?? undefined,
        address: affiliationOffice?.address ?? '',
        phone: affiliationOffice?.phone ?? null,
        representativeName: affiliationOffice?.representativeName ?? '',
        email: affiliationOffice?.email ?? null,
        costCenterId: affiliationOffice?.costCenterId ?? null,
        isActive: affiliationOffice?.isActive ?? true,
        userAffiliationOffices:
          affiliationOffice?.userAffiliationOffices?.map((user) => ({
            userId: user.userId,
            userName: user.userName,
            isPrimary: user.isPrimary,
          })) ?? [],
      });
    }
  }, [opened, affiliationOffice, form]);

  const { mutateAsync: create, isPending: isCreating } = useCreateAffiliationOffice();
  const { mutateAsync: update, isPending: isUpdating } = useUpdateAffiliationOffice();

  const isLoading = useMemo(() => isCreating || isUpdating, [isCreating, isUpdating]);

  const onSubmit = useCallback(
    async (values: FormValues) => {
      const body = {
        ...values,
        phone: values.phone?.trim() ? values.phone.trim() : null,
        email: values.email?.trim() ? values.email.trim() : null,
      };

      if (affiliationOffice) {
        await update({ params: { id: affiliationOffice.id }, body });
      } else {
        await create({ body });
      }

      onOpened(false);
    },
    [affiliationOffice, create, update, onOpened]
  );

  return (
    <Sheet open={opened} onOpenChange={onOpened}>
      <SheetContent ref={sheetContentRef} className="overflow-y-scroll sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>
            {affiliationOffice ? 'Editar Oficina de Afiliacion' : 'Nueva Oficina de Afiliacion'}
          </SheetTitle>
          <SheetDescription>
            Configure la informacion de la oficina y los usuarios habilitados.
          </SheetDescription>
        </SheetHeader>
        <FormProvider {...form}>
          <form id={formId} onSubmit={form.handleSubmit(onSubmit, onSubmitError)} className="px-4">
            <Tabs defaultValue="office" className="w-full">
              <TabsList className="mb-4 w-full">
                <TabsTrigger value="office">Oficina</TabsTrigger>
                <TabsTrigger value="users">Usuarios</TabsTrigger>
              </TabsList>

              <TabsContent value="office" className="space-y-4 pt-2">
                <FieldGroup>
                  <Controller
                    name="code"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="code">Codigo</FieldLabel>
                        <Input
                          {...field}
                          maxLength={5}
                          value={field.value ?? ''}
                          onChange={(event) => field.onChange(event.target.value.toUpperCase())}
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
                    name="cityId"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="cityId">Ciudad</FieldLabel>
                        <Combobox
                          items={cities}
                          value={findCity(field.value)}
                          onValueChange={(value: City | null) =>
                            field.onChange(value?.id ?? undefined)
                          }
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
                        <FieldLabel htmlFor="phone">Telefono</FieldLabel>
                        <Input
                          {...field}
                          value={field.value ?? ''}
                          onChange={(event) => field.onChange(event.target.value || null)}
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />

                  <Controller
                    name="representativeName"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="representativeName">Representante</FieldLabel>
                        <Input {...field} aria-invalid={fieldState.invalid} />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />

                  <Controller
                    name="email"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="email">Email</FieldLabel>
                        <Input
                          type="email"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(event) => field.onChange(event.target.value || null)}
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />

                  <Controller
                    name="costCenterId"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="costCenterId">Centro de costo</FieldLabel>
                        <Combobox
                          items={costCenters}
                          value={findCostCenter(field.value)}
                          onValueChange={(value: CostCenter | null) =>
                            field.onChange(value?.id ?? null)
                          }
                          itemToStringValue={(item: CostCenter) => String(item.id)}
                          itemToStringLabel={(item: CostCenter) => `${item.code} - ${item.name}`}
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
                              placeholder="Buscar centro..."
                              showClear
                              showTrigger={false}
                            />
                            <ComboboxList>
                              <ComboboxEmpty>No se encontraron centros</ComboboxEmpty>
                              <ComboboxCollection>
                                {(item: CostCenter) => (
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

              <TabsContent value="users" className="pt-2">
                <AffiliationOfficeUsersForm />
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
