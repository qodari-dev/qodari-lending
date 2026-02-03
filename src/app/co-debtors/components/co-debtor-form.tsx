import { Button } from '@/components/ui/button';
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
import {
  useCreateCoDebtor,
  useUpdateCoDebtor,
} from '@/hooks/queries/use-co-debtor-queries';
import { CreateCoDebtorBodySchema, CoDebtor } from '@/schemas/co-debtor';
import { onSubmitError } from '@/utils/on-submit-error';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useId, useMemo } from 'react';
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

  const form = useForm<FormValues>({
    resolver: zodResolver(CreateCoDebtorBodySchema),
    defaultValues: {
      documentType: '',
      documentNumber: '',
      homeAddress: '',
      homeCityCode: '',
      homePhone: '',
      companyName: '',
      workAddress: '',
      workCityCode: '',
      workPhone: '',
    },
  });

  useEffect(() => {
    if (opened) {
      form.reset({
        documentType: coDebtor?.documentType ?? '',
        documentNumber: coDebtor?.documentNumber ?? '',
        homeAddress: coDebtor?.homeAddress ?? '',
        homeCityCode: coDebtor?.homeCityCode ?? '',
        homePhone: coDebtor?.homePhone ?? '',
        companyName: coDebtor?.companyName ?? '',
        workAddress: coDebtor?.workAddress ?? '',
        workCityCode: coDebtor?.workCityCode ?? '',
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
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Identificacion</h3>
              <div className="grid grid-cols-2 gap-4">
                <Controller
                  name="documentType"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="documentType">Tipo de Documento</FieldLabel>
                      <Input {...field} placeholder="CC, NIT, CE..." aria-invalid={fieldState.invalid} />
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
            </FieldGroup>

            <FieldGroup className="mt-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Datos de Residencia</h3>
              <Controller
                name="homeAddress"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="homeAddress">Direccion</FieldLabel>
                    <Input {...field} aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <Controller
                  name="homeCityCode"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="homeCityCode">Codigo Ciudad</FieldLabel>
                      <Input {...field} aria-invalid={fieldState.invalid} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  name="homePhone"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="homePhone">Telefono</FieldLabel>
                      <Input {...field} aria-invalid={fieldState.invalid} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>
            </FieldGroup>

            <FieldGroup className="mt-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Datos Laborales</h3>
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
                    <FieldLabel htmlFor="workAddress">Direccion Trabajo</FieldLabel>
                    <Input {...field} aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <Controller
                  name="workCityCode"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="workCityCode">Codigo Ciudad</FieldLabel>
                      <Input {...field} aria-invalid={fieldState.invalid} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  name="workPhone"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="workPhone">Telefono Trabajo</FieldLabel>
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
