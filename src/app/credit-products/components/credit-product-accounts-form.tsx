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
import { Field, FieldLabel } from '@/components/ui/field';
import { useGlAccounts } from '@/hooks/queries/use-gl-account-queries';
import { CreateCreditProductBodySchema, CreditProductAccountInput } from '@/schemas/credit-product';
import { GlAccount } from '@/schemas/gl-account';
import { ChevronDownIcon } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { z } from 'zod';

type FormValues = z.infer<typeof CreateCreditProductBodySchema>;
type AccountFieldKey = keyof CreditProductAccountInput;

export function CreditProductAccountsForm() {
  const form = useFormContext<FormValues>();
  const accountValues = useWatch({
    control: form.control,
    name: 'creditProductAccounts',
  }) as Partial<CreditProductAccountInput>[] | undefined;
  const account = accountValues?.[0] ?? {};

  const { data: glAccountsData } = useGlAccounts({
    limit: 1000,
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'code', order: 'asc' }],
  });
  const glAccounts = useMemo(() => glAccountsData?.body?.data ?? [], [glAccountsData]);

  const findGlAccount = useCallback(
    (id: number | undefined) => glAccounts.find((item) => item.id === id) ?? null,
    [glAccounts]
  );

  const accountErrors = form.formState.errors.creditProductAccounts?.[0] as
    | Partial<Record<AccountFieldKey, { message?: string }>>
    | undefined;

  const setAccountField = useCallback(
    (fieldKey: AccountFieldKey, selected: GlAccount | null) => {
      const nextAccount: Partial<CreditProductAccountInput> = {
        capitalGlAccountId: account.capitalGlAccountId,
        interestGlAccountId: account.interestGlAccountId,
        lateInterestGlAccountId: account.lateInterestGlAccountId,
        [fieldKey]: selected?.id,
      };

      form.setValue('creditProductAccounts', [nextAccount as CreditProductAccountInput], {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    },
    [account.capitalGlAccountId, account.interestGlAccountId, account.lateInterestGlAccountId, form]
  );

  const clearAccounts = useCallback(() => {
    form.setValue('creditProductAccounts', [], {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    form.clearErrors('creditProductAccounts');
  }, [form]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">Cuentas contables</p>
          <p className="text-muted-foreground text-sm">
            Configure auxiliares para capital, interes y mora.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={clearAccounts}>
          Limpiar
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Field data-invalid={Boolean(accountErrors?.capitalGlAccountId)}>
          <FieldLabel htmlFor="capitalGlAccountId">Cuenta capital</FieldLabel>
          <Combobox
            items={glAccounts}
            value={findGlAccount(account.capitalGlAccountId)}
            onValueChange={(value: GlAccount | null) => setAccountField('capitalGlAccountId', value)}
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
            <ComboboxContent>
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
          {accountErrors?.capitalGlAccountId?.message ? (
            <p className="text-destructive text-xs">{accountErrors.capitalGlAccountId.message}</p>
          ) : null}
        </Field>

        <Field data-invalid={Boolean(accountErrors?.interestGlAccountId)}>
          <FieldLabel htmlFor="interestGlAccountId">Cuenta interes</FieldLabel>
          <Combobox
            items={glAccounts}
            value={findGlAccount(account.interestGlAccountId)}
            onValueChange={(value: GlAccount | null) => setAccountField('interestGlAccountId', value)}
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
            <ComboboxContent>
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
          {accountErrors?.interestGlAccountId?.message ? (
            <p className="text-destructive text-xs">{accountErrors.interestGlAccountId.message}</p>
          ) : null}
        </Field>

        <Field data-invalid={Boolean(accountErrors?.lateInterestGlAccountId)}>
          <FieldLabel htmlFor="lateInterestGlAccountId">Cuenta mora</FieldLabel>
          <Combobox
            items={glAccounts}
            value={findGlAccount(account.lateInterestGlAccountId)}
            onValueChange={(value: GlAccount | null) =>
              setAccountField('lateInterestGlAccountId', value)
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
            <ComboboxContent>
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
          {accountErrors?.lateInterestGlAccountId?.message ? (
            <p className="text-destructive text-xs">{accountErrors.lateInterestGlAccountId.message}</p>
          ) : null}
        </Field>
      </div>
    </div>
  );
}
