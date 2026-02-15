'use client';

import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { CreateCreditProductBodySchema } from '@/schemas/credit-product';
import { Controller, useFormContext } from 'react-hook-form';
import { z } from 'zod';

type FormValues = z.infer<typeof CreateCreditProductBodySchema>;

export function CreditProductChargeOffPolicyForm() {
  const form = useFormContext<FormValues>();

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">Politica de castigo de cartera</p>
        <p className="text-muted-foreground text-sm">
          Configure si el producto permite castigo y el minimo de dias en mora.
        </p>
      </div>

      <FieldGroup>
        <div className="grid grid-cols-2 gap-4">
          <Controller
            name="creditProductChargeOffPolicy.allowChargeOff"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="allowChargeOff">Permite castigo</FieldLabel>
                <div>
                  <Switch
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                    aria-invalid={fieldState.invalid}
                  />
                </div>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="creditProductChargeOffPolicy.minDaysPastDue"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="chargeOffMinDaysPastDue">Minimo mora (dias)</FieldLabel>
                <Input
                  id="chargeOffMinDaysPastDue"
                  type="number"
                  min={0}
                  value={field.value ?? ''}
                  onChange={(event) => {
                    const value = event.target.value;
                    field.onChange(value === '' ? 0 : Number(value));
                  }}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>
      </FieldGroup>
    </div>
  );
}
