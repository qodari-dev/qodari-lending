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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  BILLING_CONCEPT_BASE_AMOUNT_OPTIONS,
  BILLING_CONCEPT_CALC_METHOD_OPTIONS,
  BILLING_CONCEPT_RANGE_METRIC_OPTIONS,
  BILLING_CONCEPT_ROUNDING_MODE_OPTIONS,
  BillingConceptRuleInput,
  BillingConceptRuleInputSchema,
  billingConceptBaseAmountLabels,
  billingConceptCalcMethodLabels,
  billingConceptRangeMetricLabels,
  billingConceptRoundingModeLabels,
  CreateBillingConceptBodySchema,
} from '@/schemas/billing-concept';
import { formatDateOnly } from '@/utils/formatters';
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

function formatRuleSummary(rule: BillingConceptRuleInput) {
  if (rule.calcMethod === 'FIXED_AMOUNT') {
    return `Monto: ${rule.amount ?? '-'}`;
  }
  if (rule.calcMethod === 'PERCENTAGE') {
    const base = rule.baseAmount ? billingConceptBaseAmountLabels[rule.baseAmount] : '-';
    return `Base: ${base} | Tasa: ${rule.rate ?? '-'}`;
  }
  const metric = rule.rangeMetric ? billingConceptRangeMetricLabels[rule.rangeMetric] : '-';
  const ratePart =
    rule.baseAmount && rule.rate
      ? `Base: ${billingConceptBaseAmountLabels[rule.baseAmount]} | Tasa: ${rule.rate}`
      : '';
  const amountPart = rule.amount ? `Monto: ${rule.amount}` : '';
  return [metric, ratePart, amountPart].filter(Boolean).join(' | ');
}

export function BillingConceptRulesForm() {
  const form = useFormContext<FormValues>();

  const { fields, append, update, remove } = useFieldArray({
    control: form.control,
    name: 'billingConceptRules',
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const dialogForm = useForm<BillingConceptRuleInput>({
    resolver: zodResolver(BillingConceptRuleInputSchema) as Resolver<BillingConceptRuleInput>,
    defaultValues: {
      calcMethod: 'FIXED_AMOUNT',
      baseAmount: null,
      rate: null,
      amount: null,
      rangeMetric: null,
      valueFrom: null,
      valueTo: null,
      minAmount: null,
      maxAmount: null,
      roundingMode: 'NEAREST',
      roundingDecimals: 2,
      effectiveFrom: null,
      effectiveTo: null,
      priority: 0,
      isActive: true,
    },
  });

  const calcMethod = useWatch({ control: dialogForm.control, name: 'calcMethod' });
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
      calcMethod: 'FIXED_AMOUNT',
      baseAmount: null,
      rate: null,
      amount: null,
      rangeMetric: null,
      valueFrom: null,
      valueTo: null,
      minAmount: null,
      maxAmount: null,
      roundingMode: 'NEAREST',
      roundingDecimals: 2,
      effectiveFrom: null,
      effectiveTo: null,
      priority: fields.length,
      isActive: true,
    });
    setEditingIndex(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (index: number) => {
    const current = fields[index];
    dialogForm.reset({
      calcMethod: current?.calcMethod ?? 'FIXED_AMOUNT',
      baseAmount: current?.baseAmount ?? null,
      rate: current?.rate ?? null,
      amount: current?.amount ?? null,
      rangeMetric: current?.rangeMetric ?? null,
      valueFrom: current?.valueFrom ?? null,
      valueTo: current?.valueTo ?? null,
      minAmount: current?.minAmount ?? null,
      maxAmount: current?.maxAmount ?? null,
      roundingMode: current?.roundingMode ?? 'NEAREST',
      roundingDecimals: current?.roundingDecimals ?? 2,
      effectiveFrom: current?.effectiveFrom ? new Date(current.effectiveFrom) : null,
      effectiveTo: current?.effectiveTo ? new Date(current.effectiveTo) : null,
      priority: current?.priority ?? 0,
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

    if (values.minAmount && values.maxAmount && Number(values.minAmount) > Number(values.maxAmount)) {
      toast.error('Minimo no puede ser mayor a maximo');
      return;
    }

    if (editingIndex !== null) {
      update(editingIndex, values);
    } else {
      append(values);
    }

    setIsDialogOpen(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">Reglas de calculo</p>
          <p className="text-muted-foreground text-sm">
            Configure como se calcula el concepto por metodo, rangos y vigencia.
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
              <Controller
                name="calcMethod"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="calcMethod">Metodo calculo</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {BILLING_CONCEPT_CALC_METHOD_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {billingConceptCalcMethodLabels[option]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.error && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              {calcMethod !== 'FIXED_AMOUNT' && (
                <Controller
                  name="baseAmount"
                  control={dialogForm.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="baseAmount">Base</FieldLabel>
                      <Select
                        value={field.value ?? ''}
                        onValueChange={(value) => field.onChange(value || null)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {BILLING_CONCEPT_BASE_AMOUNT_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>
                              {billingConceptBaseAmountLabels[option]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.error && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              )}

              {calcMethod === 'TIERED' && (
                <Controller
                  name="rangeMetric"
                  control={dialogForm.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="rangeMetric">Metrica rango</FieldLabel>
                      <Select
                        value={field.value ?? ''}
                        onValueChange={(value) => field.onChange(value || null)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {BILLING_CONCEPT_RANGE_METRIC_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>
                              {billingConceptRangeMetricLabels[option]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.error && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              )}

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

              <div className="grid grid-cols-2 gap-3">
                <Controller
                  name="minAmount"
                  control={dialogForm.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="minAmount">Valor minimo</FieldLabel>
                      <Input
                        id="minAmount"
                        value={field.value ?? ''}
                        onChange={(event) => field.onChange(event.target.value || null)}
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.error && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  name="maxAmount"
                  control={dialogForm.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="maxAmount">Valor maximo</FieldLabel>
                      <Input
                        id="maxAmount"
                        value={field.value ?? ''}
                        onChange={(event) => field.onChange(event.target.value || null)}
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.error && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Controller
                  name="roundingMode"
                  control={dialogForm.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="roundingMode">Redondeo</FieldLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {BILLING_CONCEPT_ROUNDING_MODE_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>
                              {billingConceptRoundingModeLabels[option]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.error && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  name="roundingDecimals"
                  control={dialogForm.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="roundingDecimals">Decimales</FieldLabel>
                      <Input
                        id="roundingDecimals"
                        type="number"
                        min={0}
                        max={6}
                        value={field.value ?? ''}
                        onChange={(event) => field.onChange(Number(event.target.value))}
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.error && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Controller
                  name="effectiveFrom"
                  control={dialogForm.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="effectiveFrom">Vigencia desde</FieldLabel>
                      <Input
                        id="effectiveFrom"
                        type="date"
                        value={formatDateOnly(field.value ?? null)}
                        onChange={(event) =>
                          field.onChange(
                            event.target.value ? new Date(`${event.target.value}T00:00:00`) : null
                          )
                        }
                        aria-invalid={fieldState.invalid}
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
                      <Input
                        id="effectiveTo"
                        type="date"
                        value={formatDateOnly(field.value ?? null)}
                        onChange={(event) =>
                          field.onChange(
                            event.target.value ? new Date(`${event.target.value}T00:00:00`) : null
                          )
                        }
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.error && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Controller
                  name="priority"
                  control={dialogForm.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="priority">Prioridad</FieldLabel>
                      <Input
                        id="priority"
                        type="number"
                        min={0}
                        value={field.value ?? ''}
                        onChange={(event) => field.onChange(Number(event.target.value))}
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.error && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
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
              <TableHead>Metodo</TableHead>
              <TableHead>Configuracion</TableHead>
              <TableHead>Rangos</TableHead>
              <TableHead>Vigencia</TableHead>
              <TableHead>Prioridad</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-30 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields
              .slice()
              .sort((a, b) => a.priority - b.priority)
              .map((field) => {
                const originalIndex = fields.findIndex((item) => item.id === field.id);
                return (
                  <TableRow key={field.id}>
                    <TableCell>{billingConceptCalcMethodLabels[field.calcMethod]}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {formatRuleSummary(field)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {field.valueFrom ?? '-'} / {field.valueTo ?? '-'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {formatDateOnly(field.effectiveFrom ?? null) || '-'} /{' '}
                      {formatDateOnly(field.effectiveTo ?? null) || '-'}
                    </TableCell>
                    <TableCell>{field.priority}</TableCell>
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
