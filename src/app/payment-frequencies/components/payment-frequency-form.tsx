import { Button } from '@/components/ui/button';
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
import {
  useCreatePaymentFrequency,
  useUpdatePaymentFrequency,
} from '@/hooks/queries/use-payment-frequency-queries';
import {
  CreatePaymentFrequencyBodySchema,
  PaymentFrequency,
  PAYMENT_SCHEDULE_MODE_OPTIONS,
  paymentScheduleModeLabels,
} from '@/schemas/payment-frequency';
import { onSubmitError } from '@/utils/on-submit-error';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useId, useMemo } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

type FormValues = z.infer<typeof CreatePaymentFrequencyBodySchema>;

export function PaymentFrequencyForm({
  paymentFrequency,
  opened,
  onOpened,
}: {
  paymentFrequency: PaymentFrequency | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  const formId = useId();

  const form = useForm<FormValues>({
    resolver: zodResolver(CreatePaymentFrequencyBodySchema),
    defaultValues: {
      name: '',
      scheduleMode: 'MONTHLY_CALENDAR',
      intervalDays: null,
      dayOfMonth: 15,
      semiMonthDay1: null,
      semiMonthDay2: null,
      useEndOfMonthFallback: true,
      isActive: true,
    },
  });
  const scheduleMode = useWatch({ control: form.control, name: 'scheduleMode' });

  useEffect(() => {
    if (opened) {
      form.reset({
        name: paymentFrequency?.name ?? '',
        scheduleMode: paymentFrequency?.scheduleMode ?? 'MONTHLY_CALENDAR',
        intervalDays: paymentFrequency?.intervalDays ?? null,
        dayOfMonth: paymentFrequency?.dayOfMonth ?? null,
        semiMonthDay1: paymentFrequency?.semiMonthDay1 ?? null,
        semiMonthDay2: paymentFrequency?.semiMonthDay2 ?? null,
        useEndOfMonthFallback: paymentFrequency?.useEndOfMonthFallback ?? true,
        isActive: paymentFrequency?.isActive ?? true,
      });
    }
  }, [opened, paymentFrequency, form]);

  useEffect(() => {
    if (scheduleMode === 'INTERVAL_DAYS') {
      form.setValue('dayOfMonth', null);
      form.setValue('semiMonthDay1', null);
      form.setValue('semiMonthDay2', null);
    }
    if (scheduleMode === 'MONTHLY_CALENDAR') {
      form.setValue('intervalDays', null);
      form.setValue('semiMonthDay1', null);
      form.setValue('semiMonthDay2', null);
    }
    if (scheduleMode === 'SEMI_MONTHLY') {
      form.setValue('intervalDays', null);
      form.setValue('dayOfMonth', null);
    }
  }, [form, scheduleMode]);

  const { mutateAsync: create, isPending: isCreating } = useCreatePaymentFrequency();
  const { mutateAsync: update, isPending: isUpdating } = useUpdatePaymentFrequency();

  const isLoading = useMemo(() => isCreating || isUpdating, [isCreating, isUpdating]);

  const onSubmit = useCallback(
    async (values: FormValues) => {
      if (paymentFrequency) {
        await update({ params: { id: paymentFrequency.id }, body: values });
      } else {
        await create({ body: values });
      }
      onOpened(false);
    },
    [paymentFrequency, create, update, onOpened]
  );

  return (
    <Sheet open={opened} onOpenChange={onOpened}>
      <SheetContent className="overflow-y-scroll sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Periodicidad de Pago</SheetTitle>
          <SheetDescription>
            Define la regla de calendario o intervalo para los vencimientos del crédito.
          </SheetDescription>
        </SheetHeader>
        <FormProvider {...form}>
          <form id={formId} onSubmit={form.handleSubmit(onSubmit, onSubmitError)} className="px-4">
            <FieldGroup className="">
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
                name="scheduleMode"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="scheduleMode">Modo de periodicidad</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_SCHEDULE_MODE_OPTIONS.map((mode) => (
                          <SelectItem key={mode} value={mode}>
                            {paymentScheduleModeLabels[mode]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              {scheduleMode === 'INTERVAL_DAYS' ? (
                <Controller
                  name="intervalDays"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="intervalDays">Intervalo de días</FieldLabel>
                      <Input
                        id="intervalDays"
                        type="number"
                        min={1}
                        value={field.value ?? ''}
                        onChange={(event) =>
                          field.onChange(event.target.value ? Number(event.target.value) : null)
                        }
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              ) : null}
              {scheduleMode === 'MONTHLY_CALENDAR' ? (
                <Controller
                  name="dayOfMonth"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="dayOfMonth">Día del mes</FieldLabel>
                      <Input
                        id="dayOfMonth"
                        type="number"
                        min={1}
                        max={31}
                        value={field.value ?? ''}
                        onChange={(event) =>
                          field.onChange(event.target.value ? Number(event.target.value) : null)
                        }
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              ) : null}
              {scheduleMode === 'SEMI_MONTHLY' ? (
                <>
                  <Controller
                    name="semiMonthDay1"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="semiMonthDay1">Día semimensual 1</FieldLabel>
                        <Input
                          id="semiMonthDay1"
                          type="number"
                          min={1}
                          max={31}
                          value={field.value ?? ''}
                          onChange={(event) =>
                            field.onChange(event.target.value ? Number(event.target.value) : null)
                          }
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                  <Controller
                    name="semiMonthDay2"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="semiMonthDay2">Día semimensual 2</FieldLabel>
                        <Input
                          id="semiMonthDay2"
                          type="number"
                          min={1}
                          max={31}
                          value={field.value ?? ''}
                          onChange={(event) =>
                            field.onChange(event.target.value ? Number(event.target.value) : null)
                          }
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                </>
              ) : null}
              {scheduleMode !== 'INTERVAL_DAYS' ? (
                <Controller
                  name="useEndOfMonthFallback"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="useEndOfMonthFallback">
                        Ajustar a fin de mes si el día no existe
                      </FieldLabel>
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
              ) : null}
              <Controller
                name="isActive"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="isActive">¿Está Activo?</FieldLabel>
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
