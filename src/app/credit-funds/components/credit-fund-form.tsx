'use client';

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCreateCreditFund, useUpdateCreditFund } from '@/hooks/queries/use-credit-fund-queries';
import { CreditFund, CreateCreditFundBodySchema } from '@/schemas/credit-fund';
import { onSubmitError } from '@/utils/on-submit-error';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useId, useMemo } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { z } from 'zod';
import { CreditFundBudgetsForm } from './credit-fund-budgets-form';

type FormValues = z.infer<typeof CreateCreditFundBodySchema>;

export function CreditFundForm({
  creditFund,
  opened,
  onOpened,
}: {
  creditFund: CreditFund | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  const formId = useId();

  const form = useForm<FormValues>({
    resolver: zodResolver(CreateCreditFundBodySchema),
    defaultValues: {
      name: '',
      isControlled: true,
      isActive: true,
      creditFundBudgets: [],
    },
  });

  useEffect(() => {
    if (opened) {
      form.reset({
        name: creditFund?.name ?? '',
        isControlled: creditFund?.isControlled ?? true,
        isActive: creditFund?.isActive ?? true,
        creditFundBudgets:
          creditFund?.creditFundBudgets?.map((budget) => ({
            accountingPeriodId: budget.accountingPeriodId,
            fundAmount: budget.fundAmount,
            reinvestmentAmount: budget.reinvestmentAmount,
            expenseAmount: budget.expenseAmount,
          })) ?? [],
      });
    }
  }, [opened, creditFund, form]);

  const { mutateAsync: create, isPending: isCreating } = useCreateCreditFund();
  const { mutateAsync: update, isPending: isUpdating } = useUpdateCreditFund();

  const isLoading = useMemo(() => isCreating || isUpdating, [isCreating, isUpdating]);

  const onSubmit = useCallback(
    async (values: FormValues) => {
      if (creditFund) {
        await update({ params: { id: creditFund.id }, body: values });
      } else {
        await create({ body: values });
      }
      onOpened(false);
    },
    [creditFund, create, update, onOpened]
  );

  return (
    <Sheet open={opened} onOpenChange={onOpened}>
      <SheetContent className="overflow-y-scroll sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>{creditFund ? 'Editar Fondo de Credito' : 'Nuevo Fondo de Credito'}</SheetTitle>
          <SheetDescription>
            Define el fondo de credito y sus presupuestos por periodo.
          </SheetDescription>
        </SheetHeader>
        <FormProvider {...form}>
          <form id={formId} onSubmit={form.handleSubmit(onSubmit, onSubmitError)} className="px-4">
            <Tabs defaultValue="fund" className="w-full">
              <TabsList className="mb-4 w-full">
                <TabsTrigger value="fund">Fondo</TabsTrigger>
                <TabsTrigger value="budgets">Presupuestos</TabsTrigger>
              </TabsList>

              <TabsContent value="fund" className="space-y-4 pt-2">
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
                    name="isControlled"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="isControlled">Controla presupuesto?</FieldLabel>
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

              <TabsContent value="budgets" className="pt-2">
                <CreditFundBudgetsForm />
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
