'use client';

import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { PaymentTenderType } from '@/schemas/payment-tender-type';
import { CreateLoanPaymentBodySchema } from '@/schemas/loan-payment';
import { formatCurrency } from '@/utils/formatters';
import { parseDecimalString, roundMoney } from '@/utils/number-utils';
import { Plus, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { z } from 'zod';

type FormValues = z.infer<typeof CreateLoanPaymentBodySchema>;

export function LoanPaymentAllocationsForm({
  collectionMethods,
}: {
  collectionMethods: PaymentTenderType[];
}) {
  const form = useFormContext<FormValues>();

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'loanPaymentMethodAllocations',
  });

  const allocations = useWatch({
    control: form.control,
    name: 'loanPaymentMethodAllocations',
  });

  const amount = useWatch({ control: form.control, name: 'amount' });
  const overpaidAmount = useWatch({ control: form.control, name: 'overpaidAmount' });

  const totalPayment = useMemo(() => {
    const baseAmount = parseDecimalString(amount ?? '') ?? 0;
    const overpaid = Number(overpaidAmount ?? 0);
    const safeOverpaid = Number.isFinite(overpaid) ? overpaid : 0;
    return roundMoney(baseAmount + safeOverpaid);
  }, [amount, overpaidAmount]);

  const totalAllocated = useMemo(
    () =>
      (allocations ?? []).reduce((acc, item) => {
        const value = parseDecimalString(item?.amount ?? '') ?? 0;
        return roundMoney(acc + value);
      }, 0),
    [allocations]
  );

  const difference = roundMoney(totalPayment - totalAllocated);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">Formas de pago</p>
          <p className="text-muted-foreground text-sm">
            La suma de formas de pago debe ser igual al total recibido (abono + excedente).
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => append({ collectionMethodId: 0, tenderReference: null, amount: '0' })}
        >
          <Plus className="h-4 w-4" />
          Agregar forma de pago
        </Button>
      </div>

      {fields.length ? (
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-12 gap-2 rounded-md border p-3">
              <div className="col-span-12 lg:col-span-5">
                <Controller
                  name={`loanPaymentMethodAllocations.${index}.collectionMethodId`}
                  control={form.control}
                  render={({ field: currentField, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={`collectionMethodId-${index}`}>Forma de pago</FieldLabel>
                      <Select
                        value={currentField.value ? String(currentField.value) : undefined}
                        onValueChange={(value) => currentField.onChange(Number(value))}
                      >
                        <SelectTrigger id={`collectionMethodId-${index}`} aria-invalid={fieldState.invalid}>
                          <SelectValue placeholder="Seleccione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {collectionMethods.map((item) => (
                            <SelectItem key={item.id} value={String(item.id)}>
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.error && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              <div className="col-span-12 lg:col-span-3">
                <Controller
                  name={`loanPaymentMethodAllocations.${index}.tenderReference`}
                  control={form.control}
                  render={({ field: currentField, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={`tenderReference-${index}`}>Referencia</FieldLabel>
                      <Input
                        id={`tenderReference-${index}`}
                        value={currentField.value ?? ''}
                        onChange={(event) => currentField.onChange(event.target.value)}
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.error && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              <div className="col-span-10 lg:col-span-3">
                <Controller
                  name={`loanPaymentMethodAllocations.${index}.amount`}
                  control={form.control}
                  render={({ field: currentField, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={`allocationAmount-${index}`}>Valor</FieldLabel>
                      <Input
                        id={`allocationAmount-${index}`}
                        inputMode="decimal"
                        value={currentField.value ?? ''}
                        onChange={(event) => currentField.onChange(event.target.value)}
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.error && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              <div className="col-span-2 flex items-end justify-end lg:col-span-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  aria-label="Eliminar forma de pago"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}

          <div
            className={cn(
              'rounded-md border px-3 py-2 text-sm font-bold text-black',
              Math.abs(difference) <= 0.01
                ? 'border-green-200 bg-green-50'
                : 'border-red-200 bg-red-50'
            )}
          >
            <div className="flex items-center justify-between">
              <span>Total recibido</span>
              <span className="font-medium">{formatCurrency(totalPayment)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Total formas de pago</span>
              <span className="font-medium">{formatCurrency(totalAllocated)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Diferencia</span>
              <span className="font-medium">{formatCurrency(difference)}</span>
            </div>
          </div>

          {form.formState.errors.loanPaymentMethodAllocations && (
            <p className="text-sm text-red-600">
              {form.formState.errors.loanPaymentMethodAllocations.message as string}
            </p>
          )}
        </div>
      ) : (
        <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
          No hay formas de pago agregadas.
        </div>
      )}
    </div>
  );
}
