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
  CreateInsuranceCompanyBodySchema,
  INSURANCE_RATE_RANGE_METRIC_LABELS,
  INSURANCE_RATE_TYPE_LABELS,
  InsuranceRateRangeInput,
  InsuranceRateRangeInputSchema,
} from '@/schemas/insurance-company';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useFieldArray, useForm, useFormContext, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

type FormValues = z.infer<typeof CreateInsuranceCompanyBodySchema>;

export function InsuranceCompanyRateRangesForm() {
  const form = useFormContext<FormValues>();
  const insuranceRateRangesError = form.formState.errors.insuranceRateRanges as
    | { message?: string; root?: { message?: string } }
    | undefined;
  const insuranceRateRangesErrorMessage =
    insuranceRateRangesError?.message ?? insuranceRateRangesError?.root?.message;

  const { fields, append, update, remove } = useFieldArray({
    control: form.control,
    name: 'insuranceRateRanges',
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const dialogForm = useForm<InsuranceRateRangeInput>({
    resolver: zodResolver(InsuranceRateRangeInputSchema),
    defaultValues: {
      rangeMetric: 'INSTALLMENT_COUNT',
      valueFrom: 0,
      valueTo: 0,
      rateType: 'PERCENTAGE',
      rateValue: '',
      fixedAmount: null,
    },
  });

  const selectedRateType = useWatch({
    control: dialogForm.control,
    name: 'rateType',
  });

  useEffect(() => {
    if (selectedRateType === 'PERCENTAGE') {
      dialogForm.setValue('fixedAmount', null);
      return;
    }
    dialogForm.setValue('rateValue', null);
  }, [selectedRateType, dialogForm]);

  const hasRanges = useMemo(() => fields.length > 0, [fields.length]);

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      dialogForm.reset();
      setEditingIndex(null);
    }
  };

  const handleAddClick = () => {
    dialogForm.reset({
      rangeMetric: 'INSTALLMENT_COUNT',
      valueFrom: 0,
      valueTo: 0,
      rateType: 'PERCENTAGE',
      rateValue: '',
      fixedAmount: null,
    });
    setEditingIndex(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (index: number) => {
    const current = fields[index];
    dialogForm.reset({
      rangeMetric: current?.rangeMetric ?? 'INSTALLMENT_COUNT',
      valueFrom: current?.valueFrom ?? 0,
      valueTo: current?.valueTo ?? 0,
      rateType: current?.rateType ?? 'PERCENTAGE',
      rateValue: current?.rateValue ?? null,
      fixedAmount: current?.fixedAmount ?? null,
    });
    setEditingIndex(index);
    setIsDialogOpen(true);
  };

  const onSave = (values: InsuranceRateRangeInput) => {
    const isDuplicate = fields.some(
      (f, idx) =>
        f.rangeMetric === values.rangeMetric &&
        f.valueFrom === values.valueFrom &&
        f.valueTo === values.valueTo &&
        idx !== editingIndex
    );

    if (isDuplicate) {
      toast.error('Ya existe un rango con esa métrica y valores');
      return;
    }

    if (values.valueFrom > values.valueTo) {
      toast.error('El valor desde debe ser menor o igual al valor hasta');
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
          <p className="text-sm font-medium">Rangos de tasas de seguro</p>
          <p className="text-muted-foreground text-sm">
            Define los rangos de valor para calcular el seguro de esta aseguradora.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button type="button" size="sm" onClick={handleAddClick}>
              <Plus className="h-4 w-4" />
              Agregar rango
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingIndex !== null ? 'Editar rango' : 'Agregar rango'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Controller
                name="rangeMetric"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="rangeMetric">Métrica</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INSTALLMENT_COUNT">Número de cuotas</SelectItem>
                        <SelectItem value="CREDIT_AMOUNT">Monto del crédito</SelectItem>
                      </SelectContent>
                    </Select>
                    {fieldState.error && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="valueFrom"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="valueFrom">Valor Desde</FieldLabel>
                    <Input
                      id="valueFrom"
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
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
                    <FieldLabel htmlFor="valueTo">Valor Hasta</FieldLabel>
                    <Input
                      id="valueTo"
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.error && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="rateType"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="rateType">Tipo de valor</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PERCENTAGE">Porcentaje</SelectItem>
                        <SelectItem value="FIXED_AMOUNT">Valor fijo</SelectItem>
                      </SelectContent>
                    </Select>
                    {fieldState.error && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              {selectedRateType === 'PERCENTAGE' ? (
                <Controller
                  name="rateValue"
                  control={dialogForm.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="rateValue">Tasa (%)</FieldLabel>
                      <Input
                        id="rateValue"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.error && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              ) : (
                <Controller
                  name="fixedAmount"
                  control={dialogForm.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="fixedAmount">Valor fijo</FieldLabel>
                      <Input
                        id="fixedAmount"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.error && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="button" onClick={dialogForm.handleSubmit(onSave)}>
                {editingIndex !== null ? 'Guardar cambios' : 'Agregar rango'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {hasRanges ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Métrica</TableHead>
              <TableHead>Desde</TableHead>
              <TableHead>Hasta</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead className="w-30 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field, index) => (
              <TableRow key={field.id}>
                <TableCell>{INSURANCE_RATE_RANGE_METRIC_LABELS[field.rangeMetric] ?? field.rangeMetric}</TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs">
                  {field.valueFrom}
                </TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs">
                  {field.valueTo}
                </TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs">
                  {INSURANCE_RATE_TYPE_LABELS[field.rateType]}
                </TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs">
                  {field.rateType === 'FIXED_AMOUNT' ? (field.fixedAmount ?? '-') : `${field.rateValue ?? '-'}%`}
                </TableCell>
                <TableCell className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleEditClick(index)}
                  >
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Editar</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive h-8 w-8"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Eliminar</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className={cn('text-muted-foreground rounded-md border border-dashed p-4 text-sm')}>
          No hay rangos de tasas agregados.
        </div>
      )}
      {insuranceRateRangesErrorMessage ? (
        <FieldError errors={[{ message: insuranceRateRangesErrorMessage }]} />
      ) : null}
    </div>
  );
}
