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
import {
  useCreateAccountingDistribution,
  useUpdateAccountingDistribution,
} from '@/hooks/queries/use-accounting-distribution-queries';
import {
  AccountingDistribution,
  CreateAccountingDistributionBodySchema,
} from '@/schemas/accounting-distribution';
import { onSubmitError } from '@/utils/on-submit-error';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useId, useMemo } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { AccountingDistributionLinesForm } from './accounting-distribution-lines-form';

type FormValues = z.infer<typeof CreateAccountingDistributionBodySchema>;

export function AccountingDistributionForm({
  accountingDistribution,
  opened,
  onOpened,
}: {
  accountingDistribution: AccountingDistribution | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  const formId = useId();

  const form = useForm<FormValues>({
    resolver: zodResolver(CreateAccountingDistributionBodySchema),
    defaultValues: {
      name: '',
      isActive: true,
      accountingDistributionLines: [],
    },
  });

  useEffect(() => {
    if (opened) {
      form.reset({
        name: accountingDistribution?.name ?? '',
        isActive: accountingDistribution?.isActive ?? true,
        accountingDistributionLines:
          accountingDistribution?.accountingDistributionLines?.map((line) => ({
            glAccountId: line.glAccountId,
            percentage: line.percentage,
            nature: line.nature,
          })) ?? [],
      });
    }
  }, [opened, accountingDistribution, form]);

  const { mutateAsync: create, isPending: isCreating } = useCreateAccountingDistribution();
  const { mutateAsync: update, isPending: isUpdating } = useUpdateAccountingDistribution();

  const isLoading = useMemo(() => isCreating || isUpdating, [isCreating, isUpdating]);

  const onSubmit = useCallback(
    async (values: FormValues) => {
      const lines = values.accountingDistributionLines ?? [];
      if (lines.length > 0) {
        const totals = lines.reduce(
          (acc, line) => {
            const value = Number(line.percentage) || 0;
            if (line.nature === 'DEBIT') acc.debit += value;
            if (line.nature === 'CREDIT') acc.credit += value;
            return acc;
          },
          { debit: 0, credit: 0 }
        );

        const epsilon = 0.01;
        const debitOk = Math.abs(totals.debit - 100) <= epsilon;
        const creditOk = Math.abs(totals.credit - 100) <= epsilon;

        if (!debitOk || !creditOk) {
          toast.error('El total de debito y credito debe ser 100');
          return;
        }
      }

      if (accountingDistribution) {
        await update({ params: { id: accountingDistribution.id }, body: values });
      } else {
        await create({ body: values });
      }
      onOpened(false);
    },
    [accountingDistribution, create, update, onOpened]
  );

  return (
    <Sheet open={opened} onOpenChange={onOpened}>
      <SheetContent className="overflow-y-scroll sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>
            {accountingDistribution
              ? 'Editar Distribucion Contable'
              : 'Nueva Distribucion Contable'}
          </SheetTitle>
          <SheetDescription>
            Define como se reparte un valor entre auxiliares.
          </SheetDescription>
        </SheetHeader>
        <FormProvider {...form}>
          <form id={formId} onSubmit={form.handleSubmit(onSubmit, onSubmitError)} className="px-4">
            <Tabs defaultValue="distribution" className="w-full">
              <TabsList className="mb-4 w-full">
                <TabsTrigger value="distribution">Distribucion</TabsTrigger>
                <TabsTrigger value="lines">Lineas</TabsTrigger>
              </TabsList>

              <TabsContent value="distribution" className="space-y-4 pt-2">
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

              <TabsContent value="lines" className="pt-2">
                <AccountingDistributionLinesForm />
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
