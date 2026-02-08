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
import {
  BillingCycleProfileCycleInput,
  BillingCycleProfileCycleInputSchema,
  CreateBillingCycleProfileBodySchema,
} from '@/schemas/billing-cycle-profile';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Controller, useFieldArray, useForm, useFormContext } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

type FormValues = z.infer<typeof CreateBillingCycleProfileBodySchema>;

export function BillingCycleProfileCyclesForm() {
  const form = useFormContext<FormValues>();

  const { fields, append, update, remove } = useFieldArray({
    control: form.control,
    name: 'billingCycleProfileCycles',
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const dialogForm = useForm<BillingCycleProfileCycleInput>({
    resolver: zodResolver(BillingCycleProfileCycleInputSchema),
    defaultValues: {
      cycleInMonth: 1,
      cutoffDay: 1,
      runDay: 1,
      expectedPayDay: null,
      isActive: true,
    },
  });

  const cyclesPerMonth = form.watch('cyclesPerMonth') ?? 0;
  const hasCycles = useMemo(() => fields.length > 0, [fields.length]);

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      dialogForm.reset({
        cycleInMonth: 1,
        cutoffDay: 1,
        runDay: 1,
        expectedPayDay: null,
        isActive: true,
      });
      setEditingIndex(null);
    }
  };

  const handleAddClick = () => {
    dialogForm.reset({
      cycleInMonth: Math.max(1, fields.length + 1),
      cutoffDay: 1,
      runDay: 1,
      expectedPayDay: null,
      isActive: true,
    });
    setEditingIndex(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (index: number) => {
    const current = fields[index];
    dialogForm.reset({
      cycleInMonth: current?.cycleInMonth ?? 1,
      cutoffDay: current?.cutoffDay ?? 1,
      runDay: current?.runDay ?? 1,
      expectedPayDay: current?.expectedPayDay ?? null,
      isActive: current?.isActive ?? true,
    });
    setEditingIndex(index);
    setIsDialogOpen(true);
  };

  const onSave = (values: BillingCycleProfileCycleInput) => {
    if (cyclesPerMonth > 0 && values.cycleInMonth > cyclesPerMonth) {
      toast.error('El numero de ciclo no puede ser mayor a ciclos por mes');
      return;
    }

    const isDuplicate = fields.some(
      (field, index) => field.cycleInMonth === values.cycleInMonth && index !== editingIndex
    );

    if (isDuplicate) {
      toast.error('No puede repetir el numero de ciclo dentro del mes');
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
          <p className="text-sm font-medium">Ciclos del perfil</p>
          <p className="text-muted-foreground text-sm">
            Configure corte, generacion y dia esperado de pago para cada ciclo.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button type="button" size="sm" onClick={handleAddClick}>
              <Plus className="h-4 w-4" />
              Agregar ciclo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingIndex !== null ? 'Editar ciclo' : 'Agregar ciclo'}</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <Controller
                name="cycleInMonth"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="cycleInMonth">Ciclo en el mes</FieldLabel>
                    <Input
                      id="cycleInMonth"
                      type="number"
                      min={1}
                      max={Math.max(1, cyclesPerMonth || 99)}
                      value={field.value ?? ''}
                      onChange={(event) => {
                        const value = event.target.value;
                        field.onChange(value === '' ? undefined : Number(value));
                      }}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.error && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="cutoffDay"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="cutoffDay">Dia corte</FieldLabel>
                    <Input
                      id="cutoffDay"
                      type="number"
                      min={1}
                      max={31}
                      value={field.value ?? ''}
                      onChange={(event) => {
                        const value = event.target.value;
                        field.onChange(value === '' ? undefined : Number(value));
                      }}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.error && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="runDay"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="runDay">Dia generacion</FieldLabel>
                    <Input
                      id="runDay"
                      type="number"
                      min={1}
                      max={31}
                      value={field.value ?? ''}
                      onChange={(event) => {
                        const value = event.target.value;
                        field.onChange(value === '' ? undefined : Number(value));
                      }}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.error && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="expectedPayDay"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="expectedPayDay">Dia esperado pago (opcional)</FieldLabel>
                    <Input
                      id="expectedPayDay"
                      type="number"
                      min={1}
                      max={31}
                      value={field.value ?? ''}
                      onChange={(event) => {
                        const value = event.target.value;
                        field.onChange(value === '' ? null : Number(value));
                      }}
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
                {editingIndex !== null ? 'Guardar cambios' : 'Agregar ciclo'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {hasCycles ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ciclo</TableHead>
              <TableHead>Corte</TableHead>
              <TableHead>Generacion</TableHead>
              <TableHead>Pago esperado</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-30 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields
              .slice()
              .sort((a, b) => a.cycleInMonth - b.cycleInMonth)
              .map((field) => {
                const originalIndex = fields.findIndex((row) => row.id === field.id);
                return (
                  <TableRow key={field.id}>
                    <TableCell>{field.cycleInMonth}</TableCell>
                    <TableCell>{field.cutoffDay}</TableCell>
                    <TableCell>{field.runDay}</TableCell>
                    <TableCell>{field.expectedPayDay ?? '—'}</TableCell>
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
          No hay ciclos agregados.
        </div>
      )}
    </div>
  );
}
