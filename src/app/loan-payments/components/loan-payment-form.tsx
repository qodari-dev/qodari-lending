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
import { DatePicker } from '@/components/ui/date-picker';
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
import { useGlAccounts } from '@/hooks/queries/use-gl-account-queries';
import { useLoanBalanceSummary, useLoans } from '@/hooks/queries/use-loan-queries';
import { useCreateLoanPayment } from '@/hooks/queries/use-loan-payment-queries';
import { usePaymentTenderTypes } from '@/hooks/queries/use-payment-tender-type-queries';
import { loanStatusLabels, Loan, LoanStatus } from '@/schemas/loan';
import { AvailableUserReceiptType, CreateLoanPaymentBodySchema } from '@/schemas/loan-payment';
import { PaymentTenderType } from '@/schemas/payment-tender-type';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { parseDecimalString, roundMoney } from '@/utils/number-utils';
import { onSubmitError } from '@/utils/on-submit-error';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDownIcon } from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useRef } from 'react';
import { Controller, FormProvider, type Resolver, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { useDebounce } from 'use-debounce';
import { z } from 'zod';
import { LoanPaymentAllocationsForm } from './loan-payment-allocations-form';

type FormValues = z.infer<typeof CreateLoanPaymentBodySchema>;
type GlAccountOption = { id: number; code: string; name: string };

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
      glAccountId: undefined,
      overpaidAmount: 0,
      note: null,
      loanPaymentMethodAllocations: [],
    },
  });

  const { mutateAsync: create, isPending: isCreating } = useCreateLoanPayment();

  const { data: loansData } = useLoans({
    limit: 1000,
    include: ['borrower', 'agreement', 'paymentFrequency', 'loanApplication'],
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

  const { data: glAccountsData } = useGlAccounts({
    limit: 1000,
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'code', order: 'asc' }],
  });
  const glAccountOptions = useMemo<GlAccountOption[]>(() => {
    const fetched = (glAccountsData?.body?.data ?? []).map((item) => ({
      id: item.id,
      code: item.code,
      name: item.name,
    }));
    if (fetched.length) return fetched;

    const mapped = new Map<number, GlAccountOption>();
    for (const item of availableReceiptTypes) {
      if (!mapped.has(item.glAccountId)) {
        mapped.set(item.glAccountId, {
          id: item.glAccountId,
          code: String(item.glAccountId),
          name: item.glAccountName,
        });
      }
    }
    return [...mapped.values()].sort((a, b) => a.code.localeCompare(b.code));
  }, [glAccountsData, availableReceiptTypes]);

  const findLoan = useCallback(
    (id: number | undefined) => loans.find((item) => item.id === id) ?? null,
    [loans]
  );

  const findReceiptType = useCallback(
    (id: number | undefined) =>
      availableReceiptTypes.find((item) => item.paymentReceiptTypeId === id) ?? null,
    [availableReceiptTypes]
  );
  const findGlAccount = useCallback(
    (id: number | undefined) => glAccountOptions.find((item) => item.id === id) ?? null,
    [glAccountOptions]
  );

  useEffect(() => {
    if (!opened) return;

    form.reset({
      receiptTypeId: availableReceiptTypes[0]?.paymentReceiptTypeId,
      paymentDate: new Date(),
      loanId: undefined,
      description: '',
      amount: '0',
      glAccountId: availableReceiptTypes[0]?.glAccountId,
      overpaidAmount: 0,
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

  const selectedLoanId = useWatch({
    control: form.control,
    name: 'loanId',
  });

  const selectedLoan = useMemo(() => findLoan(selectedLoanId), [findLoan, selectedLoanId]);

  const { data: balanceSummaryData, isLoading: isLoadingBalanceSummary } = useLoanBalanceSummary(
    selectedLoanId ?? 0,
    {
      enabled: opened && Boolean(selectedLoanId),
    }
  );

  const outstandingBalance = useMemo(() => {
    if (!selectedLoanId) return null;
    const rawCurrentBalance = balanceSummaryData?.body?.currentBalance;
    if (rawCurrentBalance === undefined || rawCurrentBalance === null) return null;

    const rawValue = Number(rawCurrentBalance);
    return Number.isFinite(rawValue) ? Math.max(0, roundMoney(rawValue)) : null;
  }, [selectedLoanId, balanceSummaryData?.body?.currentBalance]);

  const currentAmount = useWatch({
    control: form.control,
    name: 'amount',
  });

  const currentOverpaidAmount = useWatch({
    control: form.control,
    name: 'overpaidAmount',
  });

  const [debouncedAmount] = useDebounce(currentAmount ?? '', 350);

  useEffect(() => {
    if (!opened || !selectedLoanId || outstandingBalance === null) return;

    const parsedAmount = parseDecimalString(debouncedAmount ?? '');
    if (parsedAmount === null) return;

    if (parsedAmount - outstandingBalance > 0.01) {
      const clampedAmount = roundMoney(outstandingBalance);
      const overpaid = Math.max(0, Math.round(parsedAmount - clampedAmount));

      if ((currentAmount ?? '') !== String(clampedAmount)) {
        form.setValue('amount', String(clampedAmount), {
          shouldValidate: true,
          shouldDirty: true,
        });
      }

      if (Number(currentOverpaidAmount ?? 0) !== overpaid) {
        form.setValue('overpaidAmount', overpaid, {
          shouldValidate: true,
          shouldDirty: true,
        });
      }
    }
  }, [
    opened,
    selectedLoanId,
    debouncedAmount,
    currentOverpaidAmount,
    outstandingBalance,
    currentAmount,
    form,
  ]);

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
                <div className="bg-primary-foreground grid gap-3 rounded-lg border p-4 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <p className="text-muted-foreground text-xs">Saldo actual</p>
                    <p className="text-sm font-semibold">
                      {selectedLoanId
                        ? isLoadingBalanceSummary || outstandingBalance === null
                          ? 'Cargando...'
                          : formatCurrency(outstandingBalance)
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Titular</p>
                    <p className="truncate text-sm font-medium">
                      {selectedLoan ? getBorrowerLabel(selectedLoan) : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Linea de credito</p>
                    <p className="truncate text-sm font-medium">
                      {selectedLoan?.loanApplication?.creditProduct?.name ?? '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Convenio</p>
                    <p className="truncate text-sm font-medium">
                      {selectedLoan?.agreement
                        ? `${selectedLoan.agreement.agreementCode} - ${selectedLoan.agreement.businessName}`
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Estado credito</p>
                    <p className="text-sm font-medium">
                      {selectedLoan?.status
                        ? loanStatusLabels[selectedLoan.status as LoanStatus]
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Fecha inicio</p>
                    <p className="text-sm font-medium">
                      {selectedLoan ? formatDate(selectedLoan.creditStartDate) : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Periodicidad</p>
                    <p className="text-sm font-medium">
                      {selectedLoan?.paymentFrequency?.name ?? '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Credito</p>
                    <p className="text-sm font-medium">{selectedLoan?.creditNumber ?? '-'}</p>
                  </div>
                </div>

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
                          onValueChange={(value: Loan | null) => {
                            field.onChange(value?.id ?? undefined);
                            form.setValue('amount', '0', {
                              shouldValidate: true,
                              shouldDirty: true,
                            });
                            form.setValue('overpaidAmount', 0, {
                              shouldValidate: true,
                              shouldDirty: true,
                            });

                            const currentAllocations =
                              form.getValues('loanPaymentMethodAllocations') ?? [];
                            form.setValue(
                              'loanPaymentMethodAllocations',
                              currentAllocations.map((item) => ({
                                ...item,
                                amount: '0',
                              })),
                              { shouldValidate: true, shouldDirty: true }
                            );
                          }}
                          itemToStringValue={(item: Loan) => String(item.id)}
                          itemToStringLabel={(item: Loan) =>
                            `${item.creditNumber} - ${getBorrowerLabel(item)}`
                          }
                        >
                          <ComboboxTrigger
                            render={
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full justify-between font-normal"
                              >
                                <ComboboxValue placeholder="Seleccione..." />
                                <ChevronDownIcon className="text-muted-foreground size-4" />
                              </Button>
                            }
                          />
                          <ComboboxContent portalContainer={sheetContentRef}>
                            <ComboboxInput
                              placeholder="Buscar credito..."
                              showClear
                              showTrigger={false}
                            />
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
                          onValueChange={(value: AvailableUserReceiptType | null) => {
                            field.onChange(value?.paymentReceiptTypeId ?? undefined);
                            form.setValue('glAccountId', value?.glAccountId ?? undefined, {
                              shouldValidate: true,
                              shouldDirty: true,
                            });
                          }}
                          itemToStringValue={(item: AvailableUserReceiptType) =>
                            String(item.paymentReceiptTypeId)
                          }
                          itemToStringLabel={(item: AvailableUserReceiptType) => item.name}
                        >
                          <ComboboxTrigger
                            render={
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full justify-between font-normal"
                              >
                                <ComboboxValue placeholder="Seleccione..." />
                                <ChevronDownIcon className="text-muted-foreground size-4" />
                              </Button>
                            }
                          />
                          <ComboboxContent portalContainer={sheetContentRef}>
                            <ComboboxInput
                              placeholder="Buscar tipo..."
                              showClear
                              showTrigger={false}
                            />
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
                        <DatePicker
                          id="paymentDate"
                          value={field.value ?? null}
                          onChange={(value) => field.onChange(value ?? new Date())}
                          ariaInvalid={fieldState.invalid}
                        />
                        {fieldState.error && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />

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
                          onChange={(event) => {
                            field.onChange(event.target.value);
                            if (Number(currentOverpaidAmount ?? 0) > 0) {
                              form.setValue('overpaidAmount', 0, {
                                shouldValidate: true,
                                shouldDirty: true,
                              });
                            }
                          }}
                          aria-invalid={fieldState.invalid}
                        />
                        {currentOverpaidAmount && currentOverpaidAmount > 0 ? (
                          <p className="text-xs text-amber-700">
                            Se detecto excedente: {formatCurrency(currentOverpaidAmount)}. Se
                            registrara automaticamente.
                          </p>
                        ) : null}
                        {fieldState.error && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />

                  <Controller
                    name="glAccountId"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="glAccountId">Auxiliar contable</FieldLabel>
                        <Combobox
                          items={glAccountOptions}
                          value={findGlAccount(field.value)}
                          onValueChange={(value: GlAccountOption | null) =>
                            field.onChange(value?.id ?? undefined)
                          }
                          itemToStringValue={(item: GlAccountOption) => String(item.id)}
                          itemToStringLabel={(item: GlAccountOption) => `${item.code} - ${item.name}`}
                        >
                          <ComboboxTrigger
                            render={
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full justify-between font-normal"
                              >
                                <ComboboxValue placeholder="Seleccione..." />
                                <ChevronDownIcon className="text-muted-foreground size-4" />
                              </Button>
                            }
                          />
                          <ComboboxContent portalContainer={sheetContentRef}>
                            <ComboboxInput
                              placeholder="Buscar cuenta..."
                              showClear
                              showTrigger={false}
                            />
                            <ComboboxList>
                              <ComboboxEmpty>No se encontraron auxiliares</ComboboxEmpty>
                              <ComboboxCollection>
                                {(item: GlAccountOption) => (
                                  <ComboboxItem key={item.id} value={item}>
                                    {item.code} - {item.name}
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
                <LoanPaymentAllocationsForm
                  collectionMethods={collectionMethods as PaymentTenderType[]}
                />
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
