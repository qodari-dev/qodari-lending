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
import { useGlAccounts } from '@/hooks/queries/use-gl-account-queries';
import {
  useCreatePaymentReceiptType,
  useUpdatePaymentReceiptType,
} from '@/hooks/queries/use-payment-receipt-type-queries';
import {
  CreatePaymentReceiptTypeBodySchema,
  PAYMENT_RECEIPT_MOVEMENT_TYPE_OPTIONS,
  paymentReceiptMovementTypeLabels,
  PaymentReceiptType,
} from '@/schemas/payment-receipt-type';
import { GlAccount } from '@/schemas/gl-account';
import { onSubmitError } from '@/utils/on-submit-error';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDownIcon } from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useRef } from 'react';
import { Controller, FormProvider, type Resolver, useForm } from 'react-hook-form';
import { z } from 'zod';
import { PaymentReceiptTypeUsersForm } from './payment-receipt-type-users-form';

type FormValues = z.infer<typeof CreatePaymentReceiptTypeBodySchema>;

export function PaymentReceiptTypeForm({
  paymentReceiptType,
  opened,
  onOpened,
}: {
  paymentReceiptType: PaymentReceiptType | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  const formId = useId();
  const sheetContentRef = useRef<HTMLDivElement | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(CreatePaymentReceiptTypeBodySchema) as Resolver<FormValues>,
    defaultValues: {
      code: '',
      name: '',
      movementType: 'RECEIPT',
      glAccountId: undefined,
      isActive: true,
      userPaymentReceiptTypes: [],
    },
  });

  const { data: glAccountsData } = useGlAccounts({
    limit: 500,
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'code', order: 'asc' }],
  });
  const glAccounts = useMemo(() => glAccountsData?.body?.data ?? [], [glAccountsData]);
  const findGlAccount = useCallback(
    (id: number | undefined) => glAccounts.find((acc) => acc.id === id) ?? null,
    [glAccounts]
  );

  useEffect(() => {
    if (opened) {
      form.reset({
        code: paymentReceiptType?.code ?? '',
        name: paymentReceiptType?.name ?? '',
        movementType: paymentReceiptType?.movementType ?? 'RECEIPT',
        glAccountId: paymentReceiptType?.glAccountId ?? undefined,
        isActive: paymentReceiptType?.isActive ?? true,
        userPaymentReceiptTypes:
          paymentReceiptType?.userPaymentReceiptTypes?.map((user) => ({
            userId: user.userId,
            userName: user.userName,
            isDefault: user.isDefault,
          })) ?? [],
      });
    }
  }, [opened, paymentReceiptType, form]);

  const { mutateAsync: create, isPending: isCreating } = useCreatePaymentReceiptType();
  const { mutateAsync: update, isPending: isUpdating } = useUpdatePaymentReceiptType();

  const isLoading = useMemo(() => isCreating || isUpdating, [isCreating, isUpdating]);

  const onSubmit = useCallback(
    async (values: FormValues) => {
      if (paymentReceiptType) {
        await update({ params: { id: paymentReceiptType.id }, body: values });
      } else {
        await create({ body: values });
      }
      onOpened(false);
    },
    [paymentReceiptType, create, update, onOpened]
  );

  return (
    <Sheet open={opened} onOpenChange={onOpened}>
      <SheetContent ref={sheetContentRef} className="overflow-y-scroll sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>
            {paymentReceiptType ? 'Editar Tipo de Recibo de Abonos' : 'Nuevo Tipo de Recibo de Abonos'}
          </SheetTitle>
          <SheetDescription>
            Configure el tipo de recibo, cuenta contable y usuarios habilitados.
          </SheetDescription>
        </SheetHeader>
        <FormProvider {...form}>
          <form id={formId} onSubmit={form.handleSubmit(onSubmit, onSubmitError)} className="px-4">
            <Tabs defaultValue="receiptType" className="w-full">
              <TabsList className="mb-4 w-full">
                <TabsTrigger value="receiptType">Tipo</TabsTrigger>
                <TabsTrigger value="users">Usuarios</TabsTrigger>
              </TabsList>

              <TabsContent value="receiptType" className="space-y-4 pt-2">
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
                    name="movementType"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="movementType">Tipo de movimiento</FieldLabel>
                        <select
                          id="movementType"
                          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          aria-invalid={fieldState.invalid}
                        >
                          {PAYMENT_RECEIPT_MOVEMENT_TYPE_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {paymentReceiptMovementTypeLabels[option]}
                            </option>
                          ))}
                        </select>
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />

                  <Controller
                    name="glAccountId"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="glAccountId">Cuenta contable</FieldLabel>
                        <Combobox
                          items={glAccounts}
                          value={findGlAccount(field.value)}
                          onValueChange={(val: GlAccount | null) =>
                            field.onChange(val?.id ?? undefined)
                          }
                          itemToStringValue={(item: GlAccount) => String(item.id)}
                          itemToStringLabel={(item: GlAccount) => `${item.code} - ${item.name}`}
                        >
                          <ComboboxTrigger
                            render={
                              <Button type="button" variant="outline" className="w-full justify-between font-normal">
                                <ComboboxValue placeholder="Seleccione..." />
                                <ChevronDownIcon className="text-muted-foreground size-4" />
                              </Button>
                              }
                            />
                          <ComboboxContent portalContainer={sheetContentRef}>
                            <ComboboxInput placeholder="Buscar cuenta..." showClear showTrigger={false} />
                            <ComboboxList>
                              <ComboboxEmpty>No se encontraron cuentas</ComboboxEmpty>
                              <ComboboxCollection>
                                {(item: GlAccount) => (
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
                <PaymentReceiptTypeUsersForm />
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
