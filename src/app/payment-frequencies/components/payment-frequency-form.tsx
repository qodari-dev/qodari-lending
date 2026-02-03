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
import { Switch } from '@/components/ui/switch';
import {
  useCreatePaymentFrequency,
  useUpdatePaymentFrequency,
} from '@/hooks/queries/use-payment-frequency-queries';
import {
  CreatePaymentFrequencyBodySchema,
  PaymentFrequency,
} from '@/schemas/payment-frequency';
import { onSubmitError } from '@/utils/on-submit-error';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useId, useMemo } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
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
      daysInterval: 30,
      isActive: true,
    },
  });

  useEffect(() => {
    if (opened) {
      form.reset({
        name: paymentFrequency?.name ?? '',
        daysInterval: paymentFrequency?.daysInterval ?? 30,
        isActive: paymentFrequency?.isActive ?? true,
      });
    }
  }, [opened, paymentFrequency, form]);

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
            Define cada cuánto se paga el crédito (ej: Mensual = 30 días, Quincenal = 15 días).
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
                name="daysInterval"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="daysInterval">Intervalo de días</FieldLabel>
                    <Input
                      {...field}
                      type="number"
                      min={1}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
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
