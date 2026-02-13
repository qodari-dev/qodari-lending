'use client';

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useCreatePaymentAllocationPolicy,
  useUpdatePaymentAllocationPolicy,
} from '@/hooks/queries/use-payment-allocation-policy-queries';
import {
  CreatePaymentAllocationPolicyBodySchema,
  overpaymentHandlingLabels,
  OVERPAYMENT_HANDLING_OPTIONS,
  PaymentAllocationPolicy,
} from '@/schemas/payment-allocation-policy';
import { onSubmitError } from '@/utils/on-submit-error';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useId, useMemo } from 'react';
import { Controller, FormProvider, type Resolver, useForm } from 'react-hook-form';
import { z } from 'zod';
import { PaymentAllocationPolicyRulesForm } from './payment-allocation-policy-rules-form';

type FormValues = z.infer<typeof CreatePaymentAllocationPolicyBodySchema>;

export function PaymentAllocationPolicyForm({
  paymentAllocationPolicy,
  opened,
  onOpened,
}: {
  paymentAllocationPolicy: PaymentAllocationPolicy | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  const formId = useId();

  const form = useForm<FormValues>({
    resolver: zodResolver(CreatePaymentAllocationPolicyBodySchema) as Resolver<FormValues>,
    defaultValues: {
      name: '',
      overpaymentHandling: 'EXCESS_BALANCE',
      isActive: true,
      note: null,
      paymentAllocationPolicyRules: [],
    },
  });

  useEffect(() => {
    if (opened) {
      form.reset({
        name: paymentAllocationPolicy?.name ?? '',
        overpaymentHandling:
          paymentAllocationPolicy?.overpaymentHandling ?? 'EXCESS_BALANCE',
        isActive: paymentAllocationPolicy?.isActive ?? true,
        note: paymentAllocationPolicy?.note ?? null,
        paymentAllocationPolicyRules:
          paymentAllocationPolicy?.paymentAllocationPolicyRules?.map((rule) => ({
            priority: rule.priority,
            billingConceptId: rule.billingConceptId,
            scope: rule.scope,
          })) ?? [],
      });
    }
  }, [opened, paymentAllocationPolicy, form]);

  const { mutateAsync: create, isPending: isCreating } = useCreatePaymentAllocationPolicy();
  const { mutateAsync: update, isPending: isUpdating } = useUpdatePaymentAllocationPolicy();

  const isLoading = useMemo(() => isCreating || isUpdating, [isCreating, isUpdating]);

  const onSubmit = useCallback(
    async (values: FormValues) => {
      const payload = {
        ...values,
        name: values.name.trim(),
        note: values.note?.trim() ? values.note.trim() : null,
      };

      if (paymentAllocationPolicy) {
        await update({ params: { id: paymentAllocationPolicy.id }, body: payload });
      } else {
        await create({ body: payload });
      }

      onOpened(false);
    },
    [create, onOpened, paymentAllocationPolicy, update]
  );

  return (
    <Sheet open={opened} onOpenChange={onOpened}>
      <SheetContent className="overflow-y-scroll sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>
            {paymentAllocationPolicy ? 'Editar Politica de Aplicacion' : 'Nueva Politica de Aplicacion'}
          </SheetTitle>
          <SheetDescription>
            Defina como se aplica el abono y su prelacion de conceptos.
          </SheetDescription>
        </SheetHeader>

        <FormProvider {...form}>
          <form id={formId} onSubmit={form.handleSubmit(onSubmit, onSubmitError)} className="px-4">
            <Tabs defaultValue="policy" className="w-full">
              <TabsList className="mb-4 w-full">
                <TabsTrigger value="policy">Politica</TabsTrigger>
                <TabsTrigger value="rules">Reglas</TabsTrigger>
              </TabsList>

              <TabsContent value="policy" className="space-y-4 pt-2">
                <FieldGroup>
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
                    name="overpaymentHandling"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="overpaymentHandling">Manejo excedente</FieldLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione..." />
                          </SelectTrigger>
                          <SelectContent>
                            {OVERPAYMENT_HANDLING_OPTIONS.map((option) => (
                              <SelectItem key={option} value={option}>
                                {overpaymentHandlingLabels[option]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                        <Input
                          id="note"
                          value={field.value ?? ''}
                          onChange={(event) => field.onChange(event.target.value || null)}
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
              </TabsContent>

              <TabsContent value="rules" className="pt-2">
                <PaymentAllocationPolicyRulesForm />
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
