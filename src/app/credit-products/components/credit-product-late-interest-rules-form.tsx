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
import { categoryCodeSelectOptions } from '@/schemas/category';
import {
  CreateCreditProductBodySchema,
  CreditProductLateInterestRuleInput,
  CreditProductLateInterestRuleInputSchema,
} from '@/schemas/credit-product';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Controller, useFieldArray, useForm, useFormContext } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

type FormValues = z.infer<typeof CreateCreditProductBodySchema>;

type Range = { from: number; to: number };

function rangesOverlap(a: Range, b: Range) {
  return a.from <= b.to && b.from <= a.to;
}

export function CreditProductLateInterestRulesForm() {
  const form = useFormContext<FormValues>();

  const { fields, append, update, remove } = useFieldArray({
    control: form.control,
    name: 'creditProductLateInterestRules',
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const dialogForm = useForm<CreditProductLateInterestRuleInput>({
    resolver: zodResolver(CreditProductLateInterestRuleInputSchema),
    defaultValues: {
      categoryCode: 'A',
      daysFrom: 0,
      daysTo: null,
      lateFactor: '',
      isActive: true,
    },
  });

  const hasItems = useMemo(() => fields.length > 0, [fields.length]);

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      dialogForm.reset();
      setEditingIndex(null);
    }
  };

  const handleAddClick = () => {
    dialogForm.reset({
      categoryCode: 'A',
      daysFrom: 0,
      daysTo: null,
      lateFactor: '',
      isActive: true,
    });
    setEditingIndex(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (index: number) => {
    const current = fields[index];
    dialogForm.reset({
      categoryCode: current?.categoryCode ?? 'A',
      daysFrom: current?.daysFrom ?? 0,
      daysTo: current?.daysTo ?? null,
      lateFactor: current?.lateFactor ?? '',
      isActive: current?.isActive ?? true,
    });
    setEditingIndex(index);
    setIsDialogOpen(true);
  };

  const onSave = (values: CreditProductLateInterestRuleInput) => {
    if (values.daysTo != null && values.daysFrom > values.daysTo) {
      toast.error('Dias desde debe ser menor o igual a dias hasta');
      return;
    }

    const newRange: Range = {
      from: values.daysFrom,
      to: values.daysTo ?? Number.POSITIVE_INFINITY,
    };

    const hasOverlap = fields.some((field, index) => {
      if (index === editingIndex) return false;
      if (field.categoryCode !== values.categoryCode) return false;

      const currentRange: Range = {
        from: field.daysFrom,
        to: field.daysTo ?? Number.POSITIVE_INFINITY,
      };
      return rangesOverlap(newRange, currentRange);
    });

    if (hasOverlap) {
      toast.error('No puede haber rangos de mora superpuestos para la misma categoria');
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
          <p className="text-sm font-medium">Reglas de mora</p>
          <p className="text-muted-foreground text-sm">
            Configure el factor de mora por categoria y rango de dias.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button type="button" size="sm" onClick={handleAddClick}>
              <Plus className="h-4 w-4" />
              Agregar regla
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingIndex !== null ? 'Editar regla' : 'Agregar regla'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Controller
                name="categoryCode"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="categoryCode">Categoria</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryCodeSelectOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.error && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="daysFrom"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="daysFrom">Dias desde</FieldLabel>
                    <Input
                      id="daysFrom"
                      type="number"
                      min={0}
                      {...field}
                      onChange={(event) => field.onChange(Number(event.target.value))}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.error && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="daysTo"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="daysTo">Dias hasta</FieldLabel>
                    <Input
                      id="daysTo"
                      type="number"
                      min={0}
                      value={field.value ?? ''}
                      onChange={(event) =>
                        field.onChange(event.target.value ? Number(event.target.value) : null)
                      }
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.error && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="lateFactor"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="lateFactor">Factor mora</FieldLabel>
                    <Input id="lateFactor" {...field} aria-invalid={fieldState.invalid} />
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

      {hasItems ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Categoria</TableHead>
              <TableHead>Rango dias</TableHead>
              <TableHead>Factor mora</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-30 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field, index) => {
              const option = categoryCodeSelectOptions.find((item) => item.value === field.categoryCode);
              return (
                <TableRow key={field.id}>
                  <TableCell>{option?.label ?? field.categoryCode}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {field.daysFrom} - {field.daysTo ?? '...'}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{field.lateFactor}</TableCell>
                  <TableCell>{field.isActive ? 'Activo' : 'Inactivo'}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditClick(index)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
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
          No hay reglas de mora configuradas.
        </div>
      )}
    </div>
  );
}
