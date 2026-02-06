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
import {
  useCreateAccountingPeriod,
  useUpdateAccountingPeriod,
} from '@/hooks/queries/use-accounting-period-queries';
import {
  AccountingPeriod,
  CreateAccountingPeriodBodySchema,
  MONTH_LABELS,
} from '@/schemas/accounting-period';
import { onSubmitError } from '@/utils/on-submit-error';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useId, useMemo } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { z } from 'zod';

type FormValues = z.infer<typeof CreateAccountingPeriodBodySchema>;

export function AccountingPeriodForm({
  accountingPeriod,
  opened,
  onOpened,
}: {
  accountingPeriod: AccountingPeriod | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  const formId = useId();

  const form = useForm<FormValues>({
    resolver: zodResolver(CreateAccountingPeriodBodySchema),
    defaultValues: {
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
    },
  });

  useEffect(() => {
    if (opened) {
      form.reset({
        year: accountingPeriod?.year ?? new Date().getFullYear(),
        month: accountingPeriod?.month ?? new Date().getMonth() + 1,
      });
    }
  }, [opened, accountingPeriod, form]);

  const { mutateAsync: create, isPending: isCreating } = useCreateAccountingPeriod();
  const { mutateAsync: update, isPending: isUpdating } = useUpdateAccountingPeriod();

  const isLoading = useMemo(() => isCreating || isUpdating, [isCreating, isUpdating]);

  const onSubmit = useCallback(
    async (values: FormValues) => {
      if (accountingPeriod) {
        await update({ params: { id: accountingPeriod.id }, body: values });
      } else {
        await create({ body: values });
      }
      onOpened(false);
    },
    [accountingPeriod, create, update, onOpened]
  );

  return (
    <Sheet open={opened} onOpenChange={onOpened}>
      <SheetContent className="overflow-y-scroll sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {accountingPeriod ? 'Editar Periodo Contable' : 'Nuevo Periodo Contable'}
          </SheetTitle>
          <SheetDescription>
            Define el año y mes del periodo contable.
          </SheetDescription>
        </SheetHeader>
        <FormProvider {...form}>
          <form id={formId} onSubmit={form.handleSubmit(onSubmit, onSubmitError)} className="px-4">
            <FieldGroup>
              <div className="grid grid-cols-2 gap-4">
                <Controller
                  name="year"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="year">Año</FieldLabel>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        min={2000}
                        max={2100}
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  name="month"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="month">Mes</FieldLabel>
                      <Select
                        onValueChange={(val) => field.onChange(Number(val))}
                        value={String(field.value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(MONTH_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
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
