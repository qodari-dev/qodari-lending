'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  BillingConceptCalcMethod,
  BillingConceptRuleInput,
  BillingConceptRuleInputSchema,
  CreateBillingConceptBodySchema,
  billingConceptCalcMethodLabels,
} from '@/schemas/billing-concept';
import { formatDateOnly } from '@/utils/formatters';
import { datesOverlap, rangesOverlap, toFiniteNumber } from '@/utils/range-overlap';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  Controller,
  type Resolver,
  useFieldArray,
  useForm,
  useFormContext,
  useWatch,
} from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

type FormValues = z.infer<typeof CreateBillingConceptBodySchema>;

function formatRuleSummary(rule: BillingConceptRuleInput, calcMethod: BillingConceptCalcMethod) {
  if (calcMethod === 'FIXED_AMOUNT') {
    return `Monto: ${rule.amount ?? '-'}`;
  }
  if (calcMethod === 'PERCENTAGE') {
    return `Tasa: ${rule.rate ?? '-'}%`;
  }

  const valuePart = rule.amount ? `Monto: ${rule.amount}` : '';
  const ratePart = rule.rate ? `Tasa: ${rule.rate}%` : '';
  return [valuePart, ratePart].filter(Boolean).join(' | ') || '-';
}

export function BillingConceptRulesForm() {
  const form = useFormContext<FormValues>();

  const { fields, append, update, remove } = useFieldArray({
    control: form.control,
    name: 'billingConceptRules',
  });

  const calcMethod =
    (useWatch({ control: form.control, name: 'calcMethod' }) as BillingConceptCalcMethod | undefined) ??
    'FIXED_AMOUNT';
  const isTieredMethod =
    calcMethod === 'TIERED_FIXED_AMOUNT' || calcMethod === 'TIERED_PERCENTAGE';

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const dialogForm = useForm<BillingConceptRuleInput>({
    resolver: zodResolver(BillingConceptRuleInputSchema) as Resolver<BillingConceptRuleInput>,
    defaultValues: {
      rate: null,
      amount: null,
      valueFrom: null,
      valueTo: null,
      effectiveFrom: null,
      effectiveTo: null,
      isActive: true,
    },
  });

  const hasRules = useMemo(() => fields.length > 0, [fields.length]);

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      dialogForm.reset();
      setEditingIndex(null);
    }
  };

  const handleAddClick = () => {
    dialogForm.reset({
      rate: null,
      amount: null,
      valueFrom: null,
      valueTo: null,
      effectiveFrom: null,
      effectiveTo: null,
      isActive: true,
    });
    setEditingIndex(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (index: number) => {
    const current = fields[index];
    dialogForm.reset({
      rate: current?.rate ?? null,
      amount: current?.amount ?? null,
      valueFrom: current?.valueFrom ?? null,
      valueTo: current?.valueTo ?? null,
      effectiveFrom: current?.effectiveFrom ? new Date(current.effectiveFrom) : null,
      effectiveTo: current?.effectiveTo ? new Date(current.effectiveTo) : null,
      isActive: current?.isActive ?? true,
    });
    setEditingIndex(index);
    setIsDialogOpen(true);
  };

  const onSave = (values: BillingConceptRuleInput) => {
    if (values.effectiveFrom && values.effectiveTo && values.effectiveFrom > values.effectiveTo) {
      toast.error('Fecha inicio no puede ser mayor a fecha fin');
      return;
    }

    if (values.valueFrom && values.valueTo && Number(values.valueFrom) > Number(values.valueTo)) {
      toast.error('Valor desde no puede ser mayor a valor hasta');
      return;
    }

    if (calcMethod === 'FIXED_AMOUNT') {
      if (!values.amount) {
        toast.error('Valor es requerido para metodo fijo');
        return;
      }
      if (values.rate) {
        toast.error('Metodo fijo no usa tasa');
        return;
      }
    }

    if (calcMethod === 'PERCENTAGE') {
      if (!values.rate) {
        toast.error('Tasa es requerida para metodo porcentaje');
        return;
      }
      if (values.amount) {
        toast.error('Metodo porcentaje no usa valor fijo');
        return;
      }
    }

    if (calcMethod === 'TIERED_FIXED_AMOUNT') {
      if (!values.valueFrom || !values.valueTo || !values.amount) {
        toast.error('Escalonado valor fijo requiere rango y valor');
        return;
      }
      if (values.rate) {
        toast.error('Escalonado valor fijo no usa tasa');
        return;
      }
    }

    if (calcMethod === 'TIERED_PERCENTAGE') {
      if (!values.valueFrom || !values.valueTo || !values.rate) {
        toast.error('Escalonado porcentaje requiere rango y tasa');
        return;
      }
      if (values.amount) {
        toast.error('Escalonado porcentaje no usa valor fijo');
        return;
      }
    }

    const normalized: BillingConceptRuleInput = {
      ...values,
      amount: values.amount || null,
      rate: values.rate || null,
      valueFrom: isTieredMethod ? values.valueFrom || null : null,
      valueTo: isTieredMethod ? values.valueTo || null : null,
    };

    if (!isTieredMethod && normalized.isActive) {
      const currentRules = form.getValues('billingConceptRules') ?? [];
      const hasAnotherActiveRule = currentRules.some(
        (rule, idx) => idx !== editingIndex && rule.isActive
      );
      if (hasAnotherActiveRule) {
        toast.error('Metodo fijo/porcentaje permite una sola regla activa');
        return;
      }
    }

    if (isTieredMethod && normalized.isActive) {
      const currentRules = form.getValues('billingConceptRules') ?? [];
      const hasOverlap = currentRules.some((rule, idx) => {
        if (idx === editingIndex || !rule.isActive) return false;
        const existingFrom = toFiniteNumber(rule.valueFrom ?? null);
        const existingTo = toFiniteNumber(rule.valueTo ?? null);
        const newFrom = toFiniteNumber(normalized.valueFrom ?? null);
        const newTo = toFiniteNumber(normalized.valueTo ?? null);

        if (!rangesOverlap(existingFrom, existingTo, newFrom, newTo)) return false;
        return datesOverlap(
          rule.effectiveFrom ?? null,
          rule.effectiveTo ?? null,
          normalized.effectiveFrom ?? null,
          normalized.effectiveTo ?? null
        );
      });

      if (hasOverlap) {
        toast.error('Reglas escalonadas activas no pueden solaparse en rango y vigencia');
        return;
      }
    }

    if (editingIndex !== null) {
      update(editingIndex, normalized);
    } else {
      append(normalized);
    }

    setIsDialogOpen(false);
  };

  const sortedFields = fields.slice().sort((a, b) => {
    if (isTieredMethod) {
      const aFrom = Number(a.valueFrom ?? '0');
      const bFrom = Number(b.valueFrom ?? '0');
      return aFrom - bFrom;
    }
    const aFrom = a.effectiveFrom ? formatDateOnly(a.effectiveFrom) : '';
    const bFrom = b.effectiveFrom ? formatDateOnly(b.effectiveFrom) : '';
    return aFrom.localeCompare(bFrom);
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">Reglas de calculo</p>
          <p className="text-muted-foreground text-sm">
            Metodo actual: {billingConceptCalcMethodLabels[calcMethod]}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button type="button" size="sm" onClick={handleAddClick}>
              <Plus className="h-4 w-4" />
              Agregar regla
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingIndex !== null ? 'Editar regla' : 'Agregar regla'}</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Controller
                  name="amount"
                  control={dialogForm.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="amount">Valor</FieldLabel>
                      <Input
                        id="amount"
                        value={field.value ?? ''}
                        onChange={(event) => field.onChange(event.target.value || null)}
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.error && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  name="rate"
                  control={dialogForm.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="rate">Tasa</FieldLabel>
                      <Input
                        id="rate"
                        value={field.value ?? ''}
                        onChange={(event) => field.onChange(event.target.value || null)}
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.error && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              {isTieredMethod && (
                <div className="grid grid-cols-2 gap-3">
                  <Controller
                    name="valueFrom"
                    control={dialogForm.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="valueFrom">Rango desde</FieldLabel>
                        <Input
                          id="valueFrom"
                          value={field.value ?? ''}
                          onChange={(event) => field.onChange(event.target.value || null)}
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.error && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />

                  <Controller
                    name="valueTo"
                    control={dialogForm.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="valueTo">Rango hasta</FieldLabel>
                        <Input
                          id="valueTo"
                          value={field.value ?? ''}
                          onChange={(event) => field.onChange(event.target.value || null)}
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.error && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Controller
                  name="effectiveFrom"
                  control={dialogForm.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="effectiveFrom">Vigencia desde</FieldLabel>
                      <DatePicker
                        id="effectiveFrom"
                        value={field.value ?? null}
                        onChange={field.onChange}
                        ariaInvalid={fieldState.invalid}
                        allowClear
                      />
                      {fieldState.error && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  name="effectiveTo"
                  control={dialogForm.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="effectiveTo">Vigencia hasta</FieldLabel>
                      <DatePicker
                        id="effectiveTo"
                        value={field.value ?? null}
                        onChange={field.onChange}
                        ariaInvalid={fieldState.invalid}
                        placeholder="Sin fecha fin"
                        allowClear
                      />
                      {fieldState.error && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              <Controller
                name="isActive"
                control={dialogForm.control}
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
                    {fieldState.error && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="button" onClick={dialogForm.handleSubmit(onSave)}>
                {editingIndex !== null ? 'Guardar cambios' : 'Agregar regla'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {hasRules ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Configuracion</TableHead>
              <TableHead>Rangos</TableHead>
              <TableHead>Vigencia</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-30 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedFields.map((field) => {
              const originalIndex = fields.findIndex((item) => item.id === field.id);
              return (
                <TableRow key={field.id}>
                  <TableCell className="text-muted-foreground text-xs">
                    {formatRuleSummary(field, calcMethod)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {field.valueFrom ?? '-'} / {field.valueTo ?? '-'}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {formatDateOnly(field.effectiveFrom ?? null) || '-'} /{' '}
                    {formatDateOnly(field.effectiveTo ?? null) || '-'}
                  </TableCell>
                  <TableCell>{field.isActive ? 'Activo' : 'Inactivo'}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditClick(originalIndex)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(originalIndex)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <div className={cn('text-muted-foreground rounded-md border border-dashed p-4 text-sm')}>
          No hay reglas configuradas.
        </div>
      )}
    </div>
  );
}
