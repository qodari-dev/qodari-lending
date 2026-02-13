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
import { rangesOverlap } from '@/utils/range-overlap';
import {
  AgingBucketInput,
  AgingBucketInputSchema,
  CreateAgingProfileBodySchema,
} from '@/schemas/aging-profile';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Controller, useFieldArray, useForm, useFormContext } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

type FormValues = z.infer<typeof CreateAgingProfileBodySchema>;

type Range = { from: number; to: number };

export function AgingProfileBucketsForm() {
  const form = useFormContext<FormValues>();

  const { fields, append, update, remove } = useFieldArray({
    control: form.control,
    name: 'agingBuckets',
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const dialogForm = useForm<AgingBucketInput>({
    resolver: zodResolver(AgingBucketInputSchema),
    defaultValues: {
      sortOrder: 0,
      name: '',
      daysFrom: 0,
      daysTo: null,
      provisionRate: null,
      isActive: true,
    },
  });

  const hasBuckets = useMemo(() => fields.length > 0, [fields.length]);

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      dialogForm.reset();
      setEditingIndex(null);
    }
  };

  const handleAddClick = () => {
    dialogForm.reset({
      sortOrder: 0,
      name: '',
      daysFrom: 0,
      daysTo: null,
      provisionRate: null,
      isActive: true,
    });
    setEditingIndex(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (index: number) => {
    const current = fields[index];
    dialogForm.reset({
      sortOrder: current?.sortOrder ?? 0,
      name: current?.name ?? '',
      daysFrom: current?.daysFrom ?? 0,
      daysTo: current?.daysTo ?? null,
      provisionRate: current?.provisionRate ?? null,
      isActive: current?.isActive ?? true,
    });
    setEditingIndex(index);
    setIsDialogOpen(true);
  };

  const onSave = (values: AgingBucketInput) => {
    const isDuplicateOrder = fields.some(
      (f, idx) => f.sortOrder === values.sortOrder && idx !== editingIndex
    );

    if (isDuplicateOrder) {
      toast.error('El orden debe ser unico');
      return;
    }

    if (values.daysTo != null && values.daysFrom > values.daysTo) {
      toast.error('El rango de dias es invalido');
      return;
    }

    const newRange: Range = {
      from: values.daysFrom,
      to: values.daysTo ?? Number.POSITIVE_INFINITY,
    };

    const hasOverlap = fields.some((field, idx) => {
      if (idx === editingIndex) return false;
      const range: Range = {
        from: field.daysFrom,
        to: field.daysTo ?? Number.POSITIVE_INFINITY,
      };
      return rangesOverlap(newRange.from, newRange.to, range.from, range.to);
    });

    if (hasOverlap) {
      toast.error('Los rangos de dias no pueden traslaparse');
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
          <p className="text-sm font-medium">Buckets</p>
          <p className="text-muted-foreground text-sm">
            Define los rangos de dias y provision por bucket.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button type="button" size="sm" onClick={handleAddClick}>
              <Plus className="h-4 w-4" />
              Agregar bucket
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingIndex !== null ? 'Editar bucket' : 'Agregar bucket'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Controller
                name="sortOrder"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="sortOrder">Orden</FieldLabel>
                    <Input
                      id="sortOrder"
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
                name="name"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="name">Nombre</FieldLabel>
                    <Input id="name" {...field} aria-invalid={fieldState.invalid} />
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
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
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
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(e.target.value ? Number(e.target.value) : null)
                      }
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.error && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="provisionRate"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="provisionRate">Provision</FieldLabel>
                    <Input
                      id="provisionRate"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
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
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="button" onClick={dialogForm.handleSubmit(onSave)}>
                {editingIndex !== null ? 'Guardar cambios' : 'Agregar bucket'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {hasBuckets ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Orden</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Rango</TableHead>
              <TableHead>Provision</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-30 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field, index) => (
              <TableRow key={field.id}>
                <TableCell className="text-muted-foreground font-mono text-xs">
                  {field.sortOrder}
                </TableCell>
                <TableCell>{field.name}</TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs">
                  {field.daysFrom} - {field.daysTo ?? '...'}
                </TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs">
                  {field.provisionRate ?? '-'}
                </TableCell>
                <TableCell>
                  {field.isActive ? 'Activo' : 'Inactivo'}
                </TableCell>
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className={cn('text-muted-foreground rounded-md border border-dashed p-4 text-sm')}>
          No hay buckets agregados.
        </div>
      )}
    </div>
  );
}
