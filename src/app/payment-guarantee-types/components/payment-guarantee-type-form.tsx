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
  useCreatePaymentGuaranteeType,
  useUpdatePaymentGuaranteeType,
} from '@/hooks/queries/use-payment-guarantee-type-queries';
import {
  CreatePaymentGuaranteeTypeBodySchema,
  PaymentGuaranteeType,
} from '@/schemas/payment-guarantee-type';
import { onSubmitError } from '@/utils/on-submit-error';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useId, useMemo } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { z } from 'zod';

type FormValues = z.infer<typeof CreatePaymentGuaranteeTypeBodySchema>;

export function PaymentGuaranteeTypeForm({
  paymentGuaranteeType,
  opened,
  onOpened,
}: {
  paymentGuaranteeType: PaymentGuaranteeType | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  const formId = useId();

  const form = useForm<FormValues>({
    resolver: zodResolver(CreatePaymentGuaranteeTypeBodySchema),
    defaultValues: {
      name: '',
      isActive: true,
    },
  });

  useEffect(() => {
    if (opened) {
      form.reset({
        name: paymentGuaranteeType?.name ?? '',
        isActive: paymentGuaranteeType?.isActive ?? true,
      });
    }
  }, [opened, paymentGuaranteeType, form]);

  const { mutateAsync: create, isPending: isCreating } = useCreatePaymentGuaranteeType();
  const { mutateAsync: update, isPending: isUpdating } = useUpdatePaymentGuaranteeType();

  const isLoading = useMemo(() => isCreating || isUpdating, [isCreating, isUpdating]);

  const onSubmit = useCallback(
    async (values: FormValues) => {
      if (paymentGuaranteeType) {
        await update({ params: { id: paymentGuaranteeType.id }, body: values });
      } else {
        await create({ body: values });
      }
      onOpened(false);
    },
    [paymentGuaranteeType, create, update, onOpened]
  );

  return (
    <Sheet open={opened} onOpenChange={onOpened}>
      <SheetContent className="overflow-y-scroll sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Garantía de Pago</SheetTitle>
          <SheetDescription>
            Define el soporte legal o documental que respalda el crédito (ej: Pagaré, Autorización
            de descuento por nómina).
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
