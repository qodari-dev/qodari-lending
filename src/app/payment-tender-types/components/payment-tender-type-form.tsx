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
  useCreatePaymentTenderType,
  useUpdatePaymentTenderType,
} from '@/hooks/queries/use-payment-tender-type-queries';
import {
  CreatePaymentTenderTypeBodySchema,
  PaymentTenderType,
  PAYMENT_TENDER_TYPE_VALUES,
  PaymentTenderTypeLabels,
} from '@/schemas/payment-tender-type';
import { onSubmitError } from '@/utils/on-submit-error';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useId, useMemo } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { z } from 'zod';

type FormValues = z.infer<typeof CreatePaymentTenderTypeBodySchema>;

export function PaymentTenderTypeForm({
  paymentTenderType,
  opened,
  onOpened,
}: {
  paymentTenderType: PaymentTenderType | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  const formId = useId();

  const form = useForm<FormValues>({
    resolver: zodResolver(CreatePaymentTenderTypeBodySchema),
    defaultValues: {
      name: '',
      type: 'TRANSFER',
      isActive: true,
    },
  });

  useEffect(() => {
    if (opened) {
      form.reset({
        name: paymentTenderType?.name ?? '',
        type: (paymentTenderType?.type as FormValues['type']) ?? 'TRANSFER',
        isActive: paymentTenderType?.isActive ?? true,
      });
    }
  }, [opened, paymentTenderType, form]);

  const { mutateAsync: create, isPending: isCreating } = useCreatePaymentTenderType();
  const { mutateAsync: update, isPending: isUpdating } = useUpdatePaymentTenderType();

  const isLoading = useMemo(() => isCreating || isUpdating, [isCreating, isUpdating]);

  const onSubmit = useCallback(
    async (values: FormValues) => {
      if (paymentTenderType) {
        await update({ params: { id: paymentTenderType.id }, body: values });
      } else {
        await create({ body: values });
      }
      onOpened(false);
    },
    [paymentTenderType, create, update, onOpened]
  );

  return (
    <Sheet open={opened} onOpenChange={onOpened}>
      <SheetContent className="overflow-y-scroll sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Medio de Pago</SheetTitle>
          <SheetDescription>
            Define los medios de pago utilizados al registrar abonos en tesorería (Transferencia,
            Cheque, Efectivo).
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
                name="type"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="type">Tipo</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger aria-invalid={fieldState.invalid}>
                        <SelectValue placeholder="Seleccione un tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_TENDER_TYPE_VALUES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {PaymentTenderTypeLabels[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
