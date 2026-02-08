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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useLoans } from '@/hooks/queries/use-loan-queries';
import { useCreateLoanPayment } from '@/hooks/queries/use-loan-payment-queries';
import { usePaymentTenderTypes } from '@/hooks/queries/use-payment-tender-type-queries';
import { Loan } from '@/schemas/loan';
import {
  AvailableUserReceiptType,
  CreateLoanPaymentBodySchema,
  paymentReceiptMovementTypeLabels,
} from '@/schemas/loan-payment';
import { PaymentTenderType } from '@/schemas/payment-tender-type';
import { formatDateISO } from '@/utils/formatters';
import { onSubmitError } from '@/utils/on-submit-error';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDownIcon } from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useRef } from 'react';
import { Controller, FormProvider, type Resolver, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { LoanPaymentAllocationsForm } from './loan-payment-allocations-form';

type FormValues = z.infer<typeof CreateLoanPaymentBodySchema>;

function getBorrowerLabel(loan: Loan): string {
  const borrower = loan.borrower;
  if (!borrower) return loan.creditNumber;

  if (borrower.personType === 'LEGAL') {
    return borrower.businessName ?? borrower.documentNumber;
  }

  const fullName = [
    borrower.firstName,
    borrower.secondName,
    borrower.firstLastName,
    borrower.secondLastName,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return fullName || borrower.documentNumber;
}

export function LoanPaymentForm({
  opened,
  onOpened,
  availableReceiptTypes,
}: {
  opened: boolean;
  onOpened(opened: boolean): void;
  availableReceiptTypes: AvailableUserReceiptType[];
}) {
  const formId = useId();
  const sheetContentRef = useRef<HTMLDivElement | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(CreateLoanPaymentBodySchema) as Resolver<FormValues>,
    defaultValues: {
      receiptTypeId: undefined,
      paymentDate: new Date(),
      loanId: undefined,
      description: '',
      amount: '0',
      note: null,
      loanPaymentMethodAllocations: [],
    },
  });

  const { mutateAsync: create, isPending: isCreating } = useCreateLoanPayment();

  const { data: loansData } = useLoans({
    limit: 1000,
    include: ['borrower'],
    sort: [{ field: 'createdAt', order: 'desc' }],
  });
  const loans = useMemo(() => loansData?.body?.data ?? [], [loansData]);

  const { data: collectionMethodsData } = usePaymentTenderTypes({
    limit: 1000,
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'name', order: 'asc' }],
  });
  const collectionMethods = useMemo(
    () => collectionMethodsData?.body?.data ?? [],
    [collectionMethodsData]
  );

  const findLoan = useCallback((id: number | undefined) => loans.find((item) => item.id === id) ?? null, [loans]);

  const findReceiptType = useCallback(
    (id: number | undefined) =>
      availableReceiptTypes.find((item) => item.paymentReceiptTypeId === id) ?? null,
    [availableReceiptTypes]
  );

  useEffect(() => {
    if (!opened) return;

    form.reset({
      receiptTypeId: availableReceiptTypes[0]?.paymentReceiptTypeId,
      paymentDate: new Date(),
      loanId: undefined,
      description: '',
      amount: '0',
      note: null,
      loanPaymentMethodAllocations: collectionMethods[0]
        ? [
            {
              collectionMethodId: collectionMethods[0].id,
              tenderReference: null,
              amount: '0',
            },
          ]
        : [],
    });
  }, [opened, form, availableReceiptTypes, collectionMethods]);

  const selectedReceiptTypeId = useWatch({
    control: form.control,
    name: 'receiptTypeId',
  });

  const selectedReceiptType = useMemo(
    () => findReceiptType(selectedReceiptTypeId),
    [findReceiptType, selectedReceiptTypeId]
  );

  const onSubmit = useCallback(
    async (values: FormValues) => {
      if (!availableReceiptTypes.length) {
        toast.error('No tiene tipos de recibo habilitados para registrar abonos');
        return;
      }

      if (!collectionMethods.length) {
        toast.error('No hay formas de pago activas para registrar abonos');
        return;
      }

      await create({ body: values });
      onOpened(false);
    },
    [availableReceiptTypes.length, collectionMethods.length, create, onOpened]
  );

  return (
    <Sheet open={opened} onOpenChange={onOpened}>
      <SheetContent ref={sheetContentRef} className="overflow-y-scroll sm:max-w-4xl">
        <SheetHeader>
          <SheetTitle>Nuevo abono</SheetTitle>
          <SheetDescription>
            Registre el abono y distribuya el recaudo por forma de pago.
          </SheetDescription>
        </SheetHeader>

        <FormProvider {...form}>
          <form id={formId} onSubmit={form.handleSubmit(onSubmit, onSubmitError)} className="px-4">
            <Tabs defaultValue="payment" className="w-full">
              <TabsList className="mb-4 w-full">
                <TabsTrigger value="payment">Abono</TabsTrigger>
                <TabsTrigger value="allocations">Formas de pago</TabsTrigger>
              </TabsList>

              <TabsContent value="payment" className="space-y-4 pt-2">
                <FieldGroup>
                  <Controller
                    name="loanId"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="loanId">Credito</FieldLabel>
                        <Combobox
                          items={loans}
                          value={findLoan(field.value)}
                          onValueChange={(value: Loan | null) => field.onChange(value?.id ?? undefined)}
                          itemToStringValue={(item: Loan) => String(item.id)}
                          itemToStringLabel={(item: Loan) => `${item.creditNumber} - ${getBorrowerLabel(item)}`}
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
                            <ComboboxInput placeholder="Buscar credito..." showClear showTrigger={false} />
                            <ComboboxList>
                              <ComboboxEmpty>No se encontraron creditos</ComboboxEmpty>
                              <ComboboxCollection>
                                {(item: Loan) => (
                                  <ComboboxItem key={item.id} value={item}>
                                    {item.creditNumber} - {getBorrowerLabel(item)}
                                  </ComboboxItem>
                                )}
                              </ComboboxCollection>
                            </ComboboxList>
                          </ComboboxContent>
                        </Combobox>
                        {fieldState.error && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />

                  <Controller
                    name="receiptTypeId"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="receiptTypeId">Tipo de recibo</FieldLabel>
                        <Combobox
                          items={availableReceiptTypes}
                          value={findReceiptType(field.value)}
                          onValueChange={(value: AvailableUserReceiptType | null) =>
                            field.onChange(value?.paymentReceiptTypeId ?? undefined)
                          }
                          itemToStringValue={(item: AvailableUserReceiptType) =>
                            String(item.paymentReceiptTypeId)
                          }
                          itemToStringLabel={(item: AvailableUserReceiptType) => item.name}
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
                            <ComboboxInput placeholder="Buscar tipo..." showClear showTrigger={false} />
                            <ComboboxList>
                              <ComboboxEmpty>No hay tipos de recibo habilitados</ComboboxEmpty>
                              <ComboboxCollection>
                                {(item: AvailableUserReceiptType) => (
                                  <ComboboxItem key={item.assignmentId} value={item}>
                                    {item.name}
                                  </ComboboxItem>
                                )}
                              </ComboboxCollection>
                            </ComboboxList>
                          </ComboboxContent>
                        </Combobox>
                        {fieldState.error && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />

                  <Controller
                    name="paymentDate"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="paymentDate">Fecha pago</FieldLabel>
                        <Input
                          id="paymentDate"
                          type="date"
                          value={field.value ? formatDateISO(field.value) : ''}
                          onChange={(event) => field.onChange(event.target.value)}
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.error && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />

                  <Field>
                    <FieldLabel>Tipo de movimiento</FieldLabel>
                    <Input
                      value={
                        selectedReceiptType?.movementType
                          ? paymentReceiptMovementTypeLabels[selectedReceiptType.movementType]
                          : '-'
                      }
                      readOnly
                    />
                  </Field>

                  <Controller
                    name="amount"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="amount">Valor abono</FieldLabel>
                        <Input
                          id="amount"
                          inputMode="decimal"
                          value={field.value ?? ''}
                          onChange={(event) => field.onChange(event.target.value)}
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.error && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />

                  <Field>
                    <FieldLabel>Cuenta contable</FieldLabel>
                    <Input
                      value={
                        selectedReceiptType
                          ? `${selectedReceiptType.glAccountName} (#${selectedReceiptType.glAccountId})`
                          : '-'
                      }
                      readOnly
                    />
                  </Field>

                  <Controller
                    name="description"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid} className="col-span-2">
                        <FieldLabel htmlFor="description">Descripcion</FieldLabel>
                        <Textarea
                          id="description"
                          value={field.value ?? ''}
                          onChange={(event) => field.onChange(event.target.value)}
                          aria-invalid={fieldState.invalid}
                          rows={3}
                        />
                        {fieldState.error && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />

                  <Controller
                    name="note"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid} className="col-span-2">
                        <FieldLabel htmlFor="note">Nota (opcional)</FieldLabel>
                        <Textarea
                          id="note"
                          value={field.value ?? ''}
                          onChange={(event) => field.onChange(event.target.value)}
                          aria-invalid={fieldState.invalid}
                          rows={2}
                        />
                        {fieldState.error && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                </FieldGroup>
              </TabsContent>

              <TabsContent value="allocations" className="pt-2">
                <LoanPaymentAllocationsForm collectionMethods={collectionMethods as PaymentTenderType[]} />
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
          <Button
            type="submit"
            form={formId}
            disabled={isCreating || !availableReceiptTypes.length || !collectionMethods.length}
          >
            {isCreating && <Spinner />}
            Guardar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
