'use client';

import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { CreateCreditProductBodySchema } from '@/schemas/credit-product';
import { Controller, useFormContext } from 'react-hook-form';
import { z } from 'zod';

type FormValues = z.infer<typeof CreateCreditProductBodySchema>;

export function CreditProductRefinancePolicyForm() {
  const form = useFormContext<FormValues>();

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">Politica de refinanciacion</p>
        <p className="text-muted-foreground text-sm">
          Configure elegibilidad y limites para refinanciacion/consolidacion por producto.
        </p>
      </div>

      <FieldGroup>
        <div className="grid grid-cols-2 gap-4">
          <Controller
            name="creditProductRefinancePolicy.allowRefinance"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="allowRefinance">Permite refinanciacion</FieldLabel>
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
            name="creditProductRefinancePolicy.allowConsolidation"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="allowConsolidation">Permite consolidacion</FieldLabel>
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
            name="creditProductRefinancePolicy.maxLoansToConsolidate"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="maxLoansToConsolidate">Maximo creditos consolidar</FieldLabel>
                <Input
                  id="maxLoansToConsolidate"
                  type="number"
                  min={1}
                  value={field.value ?? ''}
                  onChange={(event) => {
                    const value = event.target.value;
                    field.onChange(value === '' ? 1 : Number(value));
                  }}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="creditProductRefinancePolicy.maxRefinanceCount"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="maxRefinanceCount">Maximo refinanciaciones</FieldLabel>
                <Input
                  id="maxRefinanceCount"
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

          <Controller
            name="creditProductRefinancePolicy.minLoanAgeDays"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="minLoanAgeDays">Minimo edad credito (dias)</FieldLabel>
                <Input
                  id="minLoanAgeDays"
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

          <Controller
            name="creditProductRefinancePolicy.maxDaysPastDue"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="maxDaysPastDue">Maximo mora permitida (dias)</FieldLabel>
                <Input
                  id="maxDaysPastDue"
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

          <Controller
            name="creditProductRefinancePolicy.minPaidInstallments"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="minPaidInstallments">Minimo cuotas pagadas</FieldLabel>
                <Input
                  id="minPaidInstallments"
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

          <Controller
            name="creditProductRefinancePolicy.capitalizeArrears"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="capitalizeArrears">Capitaliza mora</FieldLabel>
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
            name="creditProductRefinancePolicy.requireApproval"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="requireApproval">Requiere aprobacion</FieldLabel>
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
            name="creditProductRefinancePolicy.isActive"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="refinancePolicyIsActive">Activo?</FieldLabel>
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
        </div>
      </FieldGroup>
    </div>
  );
}
