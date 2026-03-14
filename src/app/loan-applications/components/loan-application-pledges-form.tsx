'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLoanApplicationSubsidyPledgeLookup } from '@/hooks/queries/use-loan-application-queries';
import { CreateLoanApplicationBodySchema } from '@/schemas/loan-application';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { useMemo } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { z } from 'zod';

type FormValues = z.infer<typeof CreateLoanApplicationBodySchema>;

function toMoneyString(value: number) {
  return value.toFixed(2);
}

function sanitizePledgeAmountInput(rawValue: string) {
  const normalized = rawValue.replace(',', '.').replace(/[^\d.]/g, '');
  const [integerPart = '', ...decimalParts] = normalized.split('.');

  if (!decimalParts.length) {
    return integerPart;
  }

  return `${integerPart}.${decimalParts.join('').slice(0, 2)}`;
}

function clampPledgeAmount(rawValue: string, maxValue: number) {
  if (!rawValue.trim()) return '';

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) return rawValue;

  const bounded = Math.min(Math.max(parsed, 0), maxValue);
  return String(bounded);
}

export function LoanApplicationPledgesForm() {
  const form = useFormContext<FormValues>();
  const thirdPartyId = useWatch({
    control: form.control,
    name: 'thirdPartyId',
  });
  const pledgesSubsidy = useWatch({
    control: form.control,
    name: 'pledgesSubsidy',
  });
  const watchedSelectedPledges = useWatch({
    control: form.control,
    name: 'loanApplicationPledges',
  });
  const selectedPledges = useMemo(() => watchedSelectedPledges ?? [], [watchedSelectedPledges]);

  const { data, isLoading, isError, error } = useLoanApplicationSubsidyPledgeLookup(thirdPartyId, {
    enabled: pledgesSubsidy && typeof thirdPartyId === 'number' && thirdPartyId > 0,
  });

  const lookup = data?.body;
  const selectedPledgesMap = useMemo(
    () =>
      new Map(
        selectedPledges.map((item) => [
          item.beneficiaryCode,
          {
            documentNumber: item.documentNumber ?? null,
            beneficiaryCode: item.beneficiaryCode,
            pledgedAmount: item.pledgedAmount,
          },
        ])
      ),
    [selectedPledges]
  );
  const totalSelectedAmount = useMemo(
    () =>
      selectedPledges.reduce((sum, item) => {
        const parsed = Number(item.pledgedAmount);
        return sum + (Number.isFinite(parsed) ? parsed : 0);
      }, 0),
    [selectedPledges]
  );

  const updateSelectedPledges = (nextItems: FormValues['loanApplicationPledges']) => {
    form.setValue('loanApplicationPledges', nextItems, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const handleToggleBeneficiary = (
    beneficiary: NonNullable<typeof lookup>['groups'][number]['beneficiaries'][number],
    checked: boolean
  ) => {
    const currentItems = form.getValues('loanApplicationPledges') ?? [];

    if (!checked) {
      updateSelectedPledges(
        currentItems.filter((item) => item.beneficiaryCode !== beneficiary.beneficiaryCode)
      );
      return;
    }

    if (currentItems.some((item) => item.beneficiaryCode === beneficiary.beneficiaryCode)) {
      return;
    }

    updateSelectedPledges([
      ...currentItems,
      {
        beneficiaryCode: beneficiary.beneficiaryCode,
        documentNumber: beneficiary.documentNumber,
        pledgedAmount: toMoneyString(beneficiary.maxSubsidyValue),
      },
    ]);
  };

  const handleAmountChange = (beneficiaryCode: string, value: string) => {
    const currentItems = form.getValues('loanApplicationPledges') ?? [];
    updateSelectedPledges(
      currentItems.map((item) =>
        item.beneficiaryCode === beneficiaryCode
          ? {
              ...item,
              pledgedAmount: sanitizePledgeAmountInput(value),
            }
          : item
      )
    );
  };

  const handleAmountBlur = (beneficiaryCode: string, maxValue: number) => {
    const currentItems = form.getValues('loanApplicationPledges') ?? [];
    updateSelectedPledges(
      currentItems.map((item) =>
        item.beneficiaryCode === beneficiaryCode
          ? {
              ...item,
              pledgedAmount: clampPledgeAmount(item.pledgedAmount, maxValue),
            }
          : item
      )
    );
  };

  if (!pledgesSubsidy) {
    return (
      <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
        Active Aplica subsidio en la pestana principal para registrar pignoraciones.
      </div>
    );
  }

  if (!thirdPartyId) {
    return (
      <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
        Seleccione primero el solicitante para consultar beneficiarios de subsidio.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-md border p-4">
          <p className="text-muted-foreground text-xs uppercase tracking-wide">Fuente subsidio</p>
          <p className="mt-1 text-sm font-medium">{lookup?.source ?? (isLoading ? '...' : '-')}</p>
        </div>
        <div className="rounded-md border p-4">
          <p className="text-muted-foreground text-xs uppercase tracking-wide">
            Codigo pignoracion
          </p>
          <p className="mt-1 text-sm font-medium">{lookup?.pledgeCode ?? '-'}</p>
        </div>
        <div className="rounded-md border p-4">
          <p className="text-muted-foreground text-xs uppercase tracking-wide">Total a descontar</p>
          <p className="mt-1 text-sm font-medium">{formatCurrency(totalSelectedAmount)}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-md border p-4">
          <p className="text-muted-foreground text-xs uppercase tracking-wide">Periodo subsidio</p>
          <p className="mt-1 text-sm font-medium">
            {lookup?.currentPeriod?.period ?? 'No disponible'}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            Valor maximo por beneficiario:{' '}
            {formatCurrency(lookup?.currentPeriod?.subsidyValue ?? 0)}
          </p>
        </div>

        <Controller
          name="pledgesEffectiveDate"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="pledgesEffectiveDate">
                Fecha para empezar a pignorar
              </FieldLabel>
              <DatePicker
                id="pledgesEffectiveDate"
                value={field.value ?? null}
                onChange={(value) => field.onChange(value ?? null)}
                ariaInvalid={fieldState.invalid}
              />
              {fieldState.error && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </div>

      {form.formState.errors.loanApplicationPledges ? (
        <FieldError errors={[form.formState.errors.loanApplicationPledges]} />
      ) : null}

      {isLoading ? (
        <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
          Consultando informacion de subsidio...
        </div>
      ) : null}

      {isError ? (
        <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          {error instanceof Error
            ? error.message
            : 'No fue posible consultar la informacion de subsidio para pignoracion.'}
        </div>
      ) : null}

      {!isLoading && !isError && !lookup?.groups.length ? (
        <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
          No se encontraron beneficiarios disponibles para pignorar.
        </div>
      ) : null}

      {lookup?.groups.map((group) => (
        <div key={group.groupKey} className="space-y-2 rounded-md border p-4">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">{group.groupLabel}</h3>
            <p className="text-muted-foreground text-xs">
              {group.spouseDocumentNumber
                ? `Documento conyuge: ${group.spouseDocumentNumber}`
                : 'Relacion sin conyuge'}
              {group.spouseRelationship ? ` | ${group.spouseRelationship}` : ''}
            </p>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Pignorar</TableHead>
                  <TableHead>Documento conyuge</TableHead>
                  <TableHead>Beneficiario</TableHead>
                  <TableHead>Codigo beneficiario</TableHead>
                  <TableHead>Parentesco</TableHead>
                  <TableHead>Edad</TableHead>
                  <TableHead>Fec. nac.</TableHead>
                  <TableHead>Valor max. sub.</TableHead>
                  <TableHead className="w-44">Valor a descontar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.beneficiaries.map((beneficiary) => {
                  const selected = selectedPledgesMap.get(beneficiary.beneficiaryCode) ?? null;
                  const maxValue = beneficiary.maxSubsidyValue;

                  return (
                    <TableRow key={`${group.groupKey}-${beneficiary.beneficiaryCode}`}>
                      <TableCell>
                        <Checkbox
                          checked={!!selected}
                          disabled={maxValue <= 0}
                          onCheckedChange={(checked) =>
                            handleToggleBeneficiary(beneficiary, checked === true)
                          }
                        />
                      </TableCell>
                      <TableCell>{group.spouseDocumentNumber ?? '-'}</TableCell>
                      <TableCell>{beneficiary.fullName}</TableCell>
                      <TableCell>{beneficiary.beneficiaryCode}</TableCell>
                      <TableCell>{beneficiary.relationship ?? '-'}</TableCell>
                      <TableCell>{beneficiary.age ?? '-'}</TableCell>
                      <TableCell>
                        {beneficiary.birthDate ? formatDate(beneficiary.birthDate) : '-'}
                      </TableCell>
                      <TableCell>{formatCurrency(maxValue)}</TableCell>
                      <TableCell>
                        <Input
                          inputMode="decimal"
                          value={selected?.pledgedAmount ?? ''}
                          disabled={!selected}
                          onChange={(event) =>
                            handleAmountChange(
                              beneficiary.beneficiaryCode,
                              event.target.value
                            )
                          }
                          onBlur={() =>
                            handleAmountBlur(beneficiary.beneficiaryCode, maxValue)
                          }
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  );
}
