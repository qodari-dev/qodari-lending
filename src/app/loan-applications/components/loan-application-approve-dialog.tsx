'use client';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { useCreditsSettings } from '@/hooks/queries/use-credits-settings-queries';
import {
  useApproveLoanApplication,
  useLoanApplicationActNumbers,
} from '@/hooks/queries/use-loan-application-queries';
import { usePaymentGuaranteeTypes } from '@/hooks/queries/use-payment-guarantee-type-queries';
import { useRepaymentMethods } from '@/hooks/queries/use-repayment-method-queries';
import { useThirdParties } from '@/hooks/queries/use-third-party-queries';
import { cn } from '@/lib/utils';
import {
  FinalApproveLoanApplicationBodySchema,
  LoanApplication,
} from '@/schemas/loan-application';
import { ThirdParty } from '@/schemas/third-party';
import { useHasPermission } from '@/stores/auth-store-provider';
import { formatDate } from '@/utils/formatters';
import { resolveSuggestedFirstCollectionDate } from '@/utils/payment-frequency';
import { getThirdPartyLabel } from '@/utils/third-party';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarIcon, ChevronDownIcon } from 'lucide-react';
import React from 'react';
import { Controller, type Resolver, useForm } from 'react-hook-form';
import { useDebounce } from 'use-debounce';
import { z } from 'zod';

type ApproveFormValues = z.infer<typeof FinalApproveLoanApplicationBodySchema>;

export function LoanApplicationApproveDialog({
  loanApplication,
  opened,
  onOpened,
  onApproved,
}: {
  loanApplication: LoanApplication | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
  onApproved?(): void;
}) {
  const canReadCreditsSettings = useHasPermission('credits-settings:read');
  const dialogContentRef = React.useRef<HTMLDivElement | null>(null);
  const [thirdPartySearch, setThirdPartySearch] = React.useState('');
  const [debouncedThirdPartySearch] = useDebounce(thirdPartySearch.trim(), 350);
  const [pinnedThirdParty, setPinnedThirdParty] = React.useState<ThirdParty | null>(null);

  const form = useForm<ApproveFormValues>({
    resolver: zodResolver(FinalApproveLoanApplicationBodySchema) as Resolver<ApproveFormValues>,
    mode: 'onChange',
    defaultValues: {
      mode: 'FINAL',
      repaymentMethodId: undefined,
      paymentGuaranteeTypeId: undefined,
      isInsuranceApproved: false,
      approvedInstallments: 1,
      approvedAmount: '0',
      actNumber: '',
      payeeThirdPartyId: undefined,
      firstCollectionDate: new Date(),
    },
  });

  const { mutateAsync: approveLoanApplication, isPending: isApproving } =
    useApproveLoanApplication();
  const { data: creditsSettingsData } = useCreditsSettings({
    enabled: opened && canReadCreditsSettings,
  });

  const { data: repaymentMethodsData } = useRepaymentMethods({
    limit: 1000,
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'name', order: 'asc' }],
  });
  const repaymentMethods = React.useMemo(
    () => repaymentMethodsData?.body?.data ?? [],
    [repaymentMethodsData]
  );

  const { data: paymentGuaranteeTypesData } = usePaymentGuaranteeTypes({
    limit: 1000,
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'name', order: 'asc' }],
  });
  const paymentGuaranteeTypes = React.useMemo(
    () => paymentGuaranteeTypesData?.body?.data ?? [],
    [paymentGuaranteeTypesData]
  );

  const { data: thirdPartiesData } = useThirdParties({
    limit: 20,
    sort: [{ field: 'createdAt', order: 'desc' }],
    search: debouncedThirdPartySearch || undefined,
  });
  const thirdParties = React.useMemo(() => {
    const base = thirdPartiesData?.body?.data ?? [];
    if (!pinnedThirdParty) return base;
    if (base.some((item) => item.id === pinnedThirdParty.id)) return base;
    return [pinnedThirdParty, ...base];
  }, [thirdPartiesData, pinnedThirdParty]);

  const { data: actNumbersData, isLoading: isLoadingActNumbers } = useLoanApplicationActNumbers({
    affiliationOfficeId: loanApplication?.affiliationOfficeId ?? 0,
    limit: 100,
  });
  const actNumbers = React.useMemo(() => actNumbersData?.body ?? [], [actNumbersData]);
  const minimumDaysBeforeFirstCollection = React.useMemo(
    () => creditsSettingsData?.body?.minDaysBeforeFirstCollection ?? 7,
    [creditsSettingsData?.body?.minDaysBeforeFirstCollection]
  );
  const suggestedFirstCollectionDate = React.useMemo(
    () =>
      resolveSuggestedFirstCollectionDate({
        minimumDaysBeforeCollection: minimumDaysBeforeFirstCollection,
        scheduleMode: loanApplication?.paymentFrequency?.scheduleMode,
        intervalDays: loanApplication?.paymentFrequency?.intervalDays,
        dayOfMonth: loanApplication?.paymentFrequency?.dayOfMonth,
        semiMonthDay1: loanApplication?.paymentFrequency?.semiMonthDay1,
        semiMonthDay2: loanApplication?.paymentFrequency?.semiMonthDay2,
        useEndOfMonthFallback: loanApplication?.paymentFrequency?.useEndOfMonthFallback,
      }),
    [
      loanApplication?.paymentFrequency?.dayOfMonth,
      loanApplication?.paymentFrequency?.intervalDays,
      loanApplication?.paymentFrequency?.scheduleMode,
      loanApplication?.paymentFrequency?.semiMonthDay1,
      loanApplication?.paymentFrequency?.semiMonthDay2,
      loanApplication?.paymentFrequency?.useEndOfMonthFallback,
      minimumDaysBeforeFirstCollection,
    ]
  );

  React.useEffect(() => {
    if (!opened || !loanApplication) return;

    // Pin the loan application's third party so it always shows in combobox
    if (loanApplication.thirdParty) {
      setPinnedThirdParty(loanApplication.thirdParty as ThirdParty);
    }

    form.reset({
      mode: 'FINAL',
      repaymentMethodId: loanApplication.repaymentMethodId ?? undefined,
      paymentGuaranteeTypeId: loanApplication.paymentGuaranteeTypeId ?? undefined,
      isInsuranceApproved: loanApplication.creditProduct?.paysInsurance ?? false,
      approvedInstallments: loanApplication.installments ?? 1,
      approvedAmount: String(loanApplication.requestedAmount ?? '0'),
      actNumber: '',
      payeeThirdPartyId: loanApplication.thirdPartyId ?? undefined,
      firstCollectionDate: suggestedFirstCollectionDate,
    });
  }, [form, loanApplication, opened, suggestedFirstCollectionDate]);

  React.useEffect(() => {
    if (!opened || !loanApplication) return;
    if (form.getFieldState('firstCollectionDate').isDirty) return;

    form.setValue('firstCollectionDate', suggestedFirstCollectionDate, {
      shouldDirty: false,
      shouldValidate: true,
    });
  }, [form, loanApplication, opened, suggestedFirstCollectionDate]);

  React.useEffect(() => {
    if (!opened || !actNumbers.length) return;
    const current = form.getValues('actNumber');
    if (current?.trim()) return;
    form.setValue('actNumber', actNumbers[0].actNumber, { shouldValidate: true });
  }, [actNumbers, form, opened]);

  async function onSubmit(values: ApproveFormValues) {
    if (!loanApplication?.id) return;

    await approveLoanApplication({
      params: { id: loanApplication.id },
      body: {
        ...values,
        mode: 'FINAL',
        approvedAmount: values.approvedAmount.trim(),
        actNumber: values.actNumber.trim(),
      },
    });

    onOpened(false);
    onApproved?.();
  }

  const open = opened && !!loanApplication;

  return (
    <Dialog open={open} onOpenChange={onOpened}>
      <DialogContent ref={dialogContentRef} className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Aprobar solicitud</DialogTitle>
          <DialogDescription>
            Complete los datos de aprobacion para generar el credito y su tabla de amortizacion.
          </DialogDescription>
        </DialogHeader>

        {loanApplication?.agreement ? (
          <div className="rounded-md border px-3 py-2 text-sm">
            <span className="font-medium">Convenio:</span>{' '}
            {loanApplication.agreement.agreementCode} - {loanApplication.agreement.businessName}
          </div>
        ) : null}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Controller
              name="repaymentMethodId"
              control={form.control}
              render={({ field, fieldState }) => (
                <div className="space-y-2">
                  <Label htmlFor="approveRepaymentMethodId">Forma de pago</Label>
                  <Select
                    value={field.value ? String(field.value) : ''}
                    onValueChange={(value) => field.onChange(value ? Number(value) : undefined)}
                  >
                    <SelectTrigger id="approveRepaymentMethodId">
                      <SelectValue placeholder="Seleccione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {repaymentMethods.map((item) => (
                        <SelectItem key={item.id} value={String(item.id)}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.error ? (
                    <p className="text-destructive text-xs">{fieldState.error.message}</p>
                  ) : null}
                </div>
              )}
            />

            <Controller
              name="paymentGuaranteeTypeId"
              control={form.control}
              render={({ field, fieldState }) => (
                <div className="space-y-2">
                  <Label htmlFor="approvePaymentGuaranteeTypeId">Garantia de pago</Label>
                  <Select
                    value={field.value ? String(field.value) : ''}
                    onValueChange={(value) => field.onChange(value ? Number(value) : undefined)}
                  >
                    <SelectTrigger id="approvePaymentGuaranteeTypeId">
                      <SelectValue placeholder="Seleccione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentGuaranteeTypes.map((item) => (
                        <SelectItem key={item.id} value={String(item.id)}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.error ? (
                    <p className="text-destructive text-xs">{fieldState.error.message}</p>
                  ) : null}
                </div>
              )}
            />

            <Controller
              name="actNumber"
              control={form.control}
              render={({ field, fieldState }) => (
                <div className="space-y-2">
                  <Label htmlFor="approveActNumber">Acta</Label>
                  <Select
                    value={field.value}
                    onValueChange={(value) => field.onChange(value)}
                    disabled={isLoadingActNumbers}
                  >
                    <SelectTrigger id="approveActNumber">
                      <SelectValue
                        placeholder={isLoadingActNumbers ? 'Cargando...' : 'Seleccione...'}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {actNumbers.map((item) => (
                        <SelectItem key={item.id} value={item.actNumber}>
                          {item.actNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.error ? (
                    <p className="text-destructive text-xs">{fieldState.error.message}</p>
                  ) : null}
                </div>
              )}
            />

            {loanApplication?.creditProduct?.paysInsurance ? (
              <Controller
                name="isInsuranceApproved"
                control={form.control}
                render={({ field }) => (
                  <div className="col-span-2 flex items-center justify-between rounded-md border px-3 py-3">
                    <div className="space-y-1">
                      <Label htmlFor="approveInsuranceApproved">Seguro aprobado</Label>
                      <p className="text-muted-foreground text-xs">
                        Si no se aprueba, el crédito se genera sin cobro de seguro.
                      </p>
                    </div>
                    <Switch
                      id="approveInsuranceApproved"
                      checked={Boolean(field.value)}
                      onCheckedChange={field.onChange}
                    />
                  </div>
                )}
              />
            ) : null}

            <Controller
              name="approvedInstallments"
              control={form.control}
              render={({ field, fieldState }) => (
                <div className="space-y-2">
                  <Label htmlFor="approveInstallments">Numero cuotas aprobadas</Label>
                  <Input
                    id="approveInstallments"
                    type="number"
                    min={1}
                    value={field.value ?? ''}
                    onChange={(event) =>
                      field.onChange(
                        event.target.value === ''
                          ? undefined
                          : Number.parseInt(event.target.value, 10)
                      )
                    }
                    placeholder="0"
                  />
                  {fieldState.error ? (
                    <p className="text-destructive text-xs">{fieldState.error.message}</p>
                  ) : null}
                </div>
              )}
            />

            <Controller
              name="approvedAmount"
              control={form.control}
              render={({ field, fieldState }) => (
                <div className="space-y-2">
                  <Label htmlFor="approveApprovedAmount">Valor aprobado</Label>
                  <Input
                    id="approveApprovedAmount"
                    value={field.value}
                    onChange={(event) => field.onChange(event.target.value)}
                    placeholder="0"
                  />
                  {fieldState.error ? (
                    <p className="text-destructive text-xs">{fieldState.error.message}</p>
                  ) : null}
                </div>
              )}
            />

            <Controller
              name="payeeThirdPartyId"
              control={form.control}
              render={({ field, fieldState }) => (
                <div className="col-span-2 space-y-2">
                  <Label>Tercero desembolso</Label>
                  <Combobox
                    items={thirdParties}
                    value={thirdParties.find((item) => item.id === field.value) ?? null}
                    filter={null}
                    onOpenChange={(isOpen) => {
                      if (!isOpen) setThirdPartySearch('');
                    }}
                    onInputValueChange={(value, details) => {
                      if (
                        details.reason === 'input-change' ||
                        details.reason === 'input-clear'
                      ) {
                        setThirdPartySearch(value);
                      }
                    }}
                    onValueChange={(value: ThirdParty | null) => {
                      field.onChange(value?.id ?? undefined);
                      if (value) setPinnedThirdParty(value);
                    }}
                    itemToStringValue={(item: ThirdParty) => String(item.id)}
                    itemToStringLabel={(item: ThirdParty) =>
                      `${getThirdPartyLabel(item)} (${item.documentNumber})`
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
                    <ComboboxContent portalContainer={dialogContentRef}>
                      <ComboboxInput
                        placeholder="Buscar tercero..."
                        showClear
                        showTrigger={false}
                      />
                      <ComboboxList>
                        <ComboboxEmpty>No se encontraron terceros</ComboboxEmpty>
                        <ComboboxCollection>
                          {(item: ThirdParty) => (
                            <ComboboxItem key={item.id} value={item}>
                              {getThirdPartyLabel(item)} ({item.documentNumber})
                            </ComboboxItem>
                          )}
                        </ComboboxCollection>
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                  {fieldState.error ? (
                    <p className="text-destructive text-xs">{fieldState.error.message}</p>
                  ) : null}
                </div>
              )}
            />

            <Controller
              name="firstCollectionDate"
              control={form.control}
              render={({ field, fieldState }) => (
                <div className="space-y-2">
                  <Label htmlFor="approveFirstCollectionDate">Fecha primer recaudo</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="approveFirstCollectionDate"
                        type="button"
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 size-4" />
                        {field.value ? formatDate(field.value) : 'Seleccione fecha'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(value) => field.onChange(value)}
                        disabled={(date) => date < suggestedFirstCollectionDate}
                        captionLayout="dropdown"
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-muted-foreground text-xs">
                    Sugerida desde {formatDate(suggestedFirstCollectionDate)} (mínimo{' '}
                    {minimumDaysBeforeFirstCollection} días).
                  </p>
                  {fieldState.error ? (
                    <p className="text-destructive text-xs">{fieldState.error.message}</p>
                  ) : null}
                </div>
              )}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpened(false)}>
              Cerrar
            </Button>
            <Button type="submit" disabled={isApproving || !form.formState.isValid}>
              {isApproving && <Spinner />}
              Aprobar solicitud
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
