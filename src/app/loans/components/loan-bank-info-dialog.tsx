'use client';

import { useMemo, useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { useBanks } from '@/hooks/queries/use-bank-queries';
import { useUpdateLoanBankInfo } from '@/hooks/queries/use-loan-queries';
import { Loan } from '@/schemas/loan';
import {
  BANK_ACCOUNT_TYPE_OPTIONS,
  BankAccountType,
  bankAccountTypeLabels,
} from '@/schemas/loan-application';
import { ChevronDownIcon } from 'lucide-react';
import { toast } from 'sonner';

type UpdateLoanBankInfoValues = {
  bankId: number;
  bankAccountType: BankAccountType;
  bankAccountNumber: string;
};

export function LoanBankInfoDialog({
  loan,
  opened,
  onOpened,
}: {
  loan: Loan | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  const { mutateAsync: updateBankInfo, isPending } = useUpdateLoanBankInfo();
  const { data: banksData } = useBanks({
    limit: 1000,
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'name', order: 'asc' }],
  });
  const banks = useMemo(() => banksData?.body?.data ?? [], [banksData]);

  if (!loan) return null;

  return (
    <Dialog open={opened} onOpenChange={onOpened}>
      <DialogContent
        key={`${loan.id}:${loan.bankId ?? 'none'}:${loan.bankAccountType ?? 'none'}:${loan.bankAccountNumber ?? ''}`}
        className="sm:max-w-xl"
      >
        <DialogHeader>
          <DialogTitle>Datos bancarios</DialogTitle>
          <DialogDescription>
            Actualice banco y cuenta de desembolso del credito <strong>{loan.creditNumber}</strong>.
          </DialogDescription>
        </DialogHeader>

        <LoanBankInfoForm
          banks={banks}
          initialBankId={loan.bankId ?? undefined}
          initialBankAccountType={(loan.bankAccountType as BankAccountType | null) ?? 'SAVINGS'}
          initialBankAccountNumber={loan.bankAccountNumber ?? ''}
          isPending={isPending}
          onSubmit={async (values) => {
            await updateBankInfo({
              params: { id: loan.id },
              body: values,
            });
            onOpened(false);
          }}
          onCancel={() => onOpened(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function LoanBankInfoForm({
  banks,
  initialBankId,
  initialBankAccountType,
  initialBankAccountNumber,
  isPending,
  onSubmit,
  onCancel,
}: {
  banks: Array<{ id: number; name: string }>;
  initialBankId: number | undefined;
  initialBankAccountType: BankAccountType;
  initialBankAccountNumber: string;
  isPending: boolean;
  onSubmit(values: UpdateLoanBankInfoValues): Promise<void>;
  onCancel(): void;
}) {
  const [bankId, setBankId] = useState<number | undefined>(initialBankId);
  const [bankAccountType, setBankAccountType] = useState<BankAccountType>(initialBankAccountType);
  const [bankAccountNumber, setBankAccountNumber] = useState(initialBankAccountNumber);

  const selectedBank = useMemo(
    () => banks.find((item) => item.id === bankId) ?? null,
    [banks, bankId]
  );
  const hasChanges =
    bankId !== initialBankId ||
    bankAccountType !== initialBankAccountType ||
    bankAccountNumber.trim() !== initialBankAccountNumber.trim();

  return (
    <div className="space-y-4">
      <Field>
        <FieldLabel htmlFor="loanBankId">Banco</FieldLabel>
        <Combobox
          items={banks}
          value={selectedBank}
          onValueChange={(value: { id: number; name: string } | null) => setBankId(value?.id)}
          itemToStringValue={(item) => (item ? String(item.id) : '')}
          itemToStringLabel={(item) => item?.name ?? ''}
        >
          <ComboboxTrigger
            render={
              <Button type="button" variant="outline" className="w-full justify-between font-normal">
                <ComboboxValue placeholder="Seleccione..." />
                <ChevronDownIcon className="text-muted-foreground size-4" />
              </Button>
            }
            id="loanBankId"
          />
          <ComboboxContent>
            <ComboboxInput placeholder="Buscar banco..." showClear showTrigger={false} />
            <ComboboxList>
              <ComboboxEmpty>No se encontraron bancos</ComboboxEmpty>
              <ComboboxCollection>
                {(item: { id: number; name: string }) => (
                  <ComboboxItem key={item.id} value={item}>
                    {item.name}
                  </ComboboxItem>
                )}
              </ComboboxCollection>
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </Field>

      <Field>
        <FieldLabel htmlFor="loanBankAccountType">Tipo de cuenta</FieldLabel>
        <Select
          value={bankAccountType}
          onValueChange={(value) => setBankAccountType(value as BankAccountType)}
        >
          <SelectTrigger id="loanBankAccountType">
            <SelectValue placeholder="Seleccione..." />
          </SelectTrigger>
          <SelectContent>
            {BANK_ACCOUNT_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {bankAccountTypeLabels[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field>
        <FieldLabel htmlFor="loanBankAccountNumber">Numero de cuenta</FieldLabel>
        <Input
          id="loanBankAccountNumber"
          value={bankAccountNumber}
          onChange={(event) => setBankAccountNumber(event.target.value)}
          maxLength={25}
        />
      </Field>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancelar
        </Button>
        <Button
          type="button"
          disabled={isPending || !hasChanges}
          onClick={async () => {
            if (!bankId) {
              toast.error('Debe seleccionar un banco');
              return;
            }

            const normalizedAccountNumber = bankAccountNumber.trim();
            if (!normalizedAccountNumber) {
              toast.error('Debe indicar numero de cuenta');
              return;
            }

            await onSubmit({
              bankId,
              bankAccountType,
              bankAccountNumber: normalizedAccountNumber,
            });
          }}
        >
          {isPending ? <Spinner /> : null}
          Guardar
        </Button>
      </DialogFooter>
    </div>
  );
}
