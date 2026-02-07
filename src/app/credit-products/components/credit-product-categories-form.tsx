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
import { categoryCodeSelectOptions } from '@/schemas/category';
import {
  CreateCreditProductBodySchema,
  CreditProductCategoryInput,
  CreditProductCategoryInputSchema,
} from '@/schemas/credit-product';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Controller, useFieldArray, useForm, useFormContext } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

type FormValues = z.infer<typeof CreateCreditProductBodySchema>;

export function CreditProductCategoriesForm() {
  const form = useFormContext<FormValues>();

  const { fields, append, update, remove } = useFieldArray({
    control: form.control,
    name: 'creditProductCategories',
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const dialogForm = useForm<CreditProductCategoryInput>({
    resolver: zodResolver(CreditProductCategoryInputSchema),
    defaultValues: {
      categoryCode: 'A',
      installmentsFrom: 1,
      installmentsTo: 1,
      financingFactor: '',
      lateFactor: '',
      pledgeFactor: null,
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
      installmentsFrom: 1,
      installmentsTo: 1,
      financingFactor: '',
      lateFactor: '',
      pledgeFactor: null,
    });
    setEditingIndex(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (index: number) => {
    const current = fields[index];
    dialogForm.reset({
      categoryCode: current?.categoryCode ?? 'A',
      installmentsFrom: current?.installmentsFrom ?? 1,
      installmentsTo: current?.installmentsTo ?? 1,
      financingFactor: current?.financingFactor ?? '',
      lateFactor: current?.lateFactor ?? '',
      pledgeFactor: current?.pledgeFactor ?? null,
    });
    setEditingIndex(index);
    setIsDialogOpen(true);
  };

  const onSave = (values: CreditProductCategoryInput) => {
    if (values.installmentsFrom > values.installmentsTo) {
      toast.error('Cuota desde debe ser menor o igual a cuota hasta');
      return;
    }

    const hasOverlap = fields.some((item, index) => {
      if (index === editingIndex) return false;
      if (item.categoryCode !== values.categoryCode) return false;
      return item.installmentsFrom <= values.installmentsTo && values.installmentsFrom <= item.installmentsTo;
    });

    if (hasOverlap) {
      toast.error('No puede haber rangos superpuestos para la misma categoria');
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
          <p className="text-sm font-medium">Categorias</p>
          <p className="text-muted-foreground text-sm">
            Defina factores por categoria y rango de cuotas.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button type="button" size="sm" onClick={handleAddClick}>
              <Plus className="h-4 w-4" />
              Agregar categoria
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingIndex !== null ? 'Editar categoria' : 'Agregar categoria'}
              </DialogTitle>
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
                name="installmentsFrom"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="installmentsFrom">Cuotas desde</FieldLabel>
                    <Input
                      id="installmentsFrom"
                      type="number"
                      min={1}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.error && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="installmentsTo"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="installmentsTo">Cuotas hasta</FieldLabel>
                    <Input
                      id="installmentsTo"
                      type="number"
                      min={1}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.error && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="financingFactor"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="financingFactor">Factor financiacion</FieldLabel>
                    <Input id="financingFactor" {...field} aria-invalid={fieldState.invalid} />
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
                name="pledgeFactor"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="pledgeFactor">Factor pignoracion</FieldLabel>
                    <Input
                      id="pledgeFactor"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                      aria-invalid={fieldState.invalid}
                    />
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
                {editingIndex !== null ? 'Guardar cambios' : 'Agregar categoria'}
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
              <TableHead>Rango cuotas</TableHead>
              <TableHead>Factor fin.</TableHead>
              <TableHead>Factor mora</TableHead>
              <TableHead>Factor pign.</TableHead>
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
                    {field.installmentsFrom} - {field.installmentsTo}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{field.financingFactor}</TableCell>
                  <TableCell className="font-mono text-xs">{field.lateFactor}</TableCell>
                  <TableCell className="font-mono text-xs">{field.pledgeFactor ?? '-'}</TableCell>
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
          No hay categorias configuradas.
        </div>
      )}
    </div>
  );
}
