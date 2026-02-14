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
import { DatePicker } from '@/components/ui/date-picker';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
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
  CreateLoanApplicationBodySchema,
  LoanApplicationPledgeInput,
  LoanApplicationPledgeInputSchema,
} from '@/schemas/loan-application';
import { formatCurrency, formatDateISO } from '@/utils/formatters';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Controller, type Resolver, useFieldArray, useForm, useFormContext } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

type FormValues = z.infer<typeof CreateLoanApplicationBodySchema>;

export function LoanApplicationPledgesForm() {
  const form = useFormContext<FormValues>();
  const { fields, append, update, remove } = useFieldArray({
    control: form.control,
    name: 'loanApplicationPledges',
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const dialogForm = useForm<LoanApplicationPledgeInput>({
    resolver: zodResolver(LoanApplicationPledgeInputSchema) as Resolver<LoanApplicationPledgeInput>,
    defaultValues: {
      pledgeCode: '',
      documentNumber: '',
      beneficiaryCode: undefined,
      pledgedAmount: '0',
      effectiveDate: new Date(),
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
      pledgeCode: '',
      documentNumber: '',
      beneficiaryCode: undefined,
      pledgedAmount: '0',
      effectiveDate: new Date(),
    });
    setEditingIndex(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (index: number) => {
    const current = fields[index];
    dialogForm.reset({
      pledgeCode: current?.pledgeCode ?? '',
      documentNumber: current?.documentNumber ?? '',
      beneficiaryCode: current?.beneficiaryCode ?? undefined,
      pledgedAmount: current?.pledgedAmount ?? '0',
      effectiveDate: current?.effectiveDate ? new Date(current.effectiveDate) : new Date(),
    });
    setEditingIndex(index);
    setIsDialogOpen(true);
  };

  const onSave = (values: LoanApplicationPledgeInput) => {
    const key = `${values.pledgeCode}-${values.beneficiaryCode}`;
    const isDuplicate = fields.some(
      (f, idx) => `${f.pledgeCode}-${f.beneficiaryCode}` === key && idx !== editingIndex
    );

    if (isDuplicate) {
      toast.error('No puede repetir la pignoracion para el mismo beneficiario');
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
          <p className="text-sm font-medium">Pignoraciones</p>
          <p className="text-muted-foreground text-sm">
            Registre beneficiarios y valores pignorados para subsidio.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button type="button" size="sm" onClick={handleAddClick}>
              <Plus className="h-4 w-4" />
              Agregar pignoracion
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingIndex !== null ? 'Editar pignoracion' : 'Agregar pignoracion'}
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3">
              <Controller
                name="pledgeCode"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="pledgeCode">Codigo pignoracion</FieldLabel>
                    <Input id="pledgeCode" {...field} value={field.value ?? ''} />
                    {fieldState.error && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="documentNumber"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="documentNumber">Documento</FieldLabel>
                    <Input id="documentNumber" {...field} value={field.value ?? ''} />
                    {fieldState.error && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="beneficiaryCode"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="beneficiaryCode">Codigo beneficiario</FieldLabel>
                    <Input
                      id="beneficiaryCode"
                      type="number"
                      value={field.value ?? ''}
                      onChange={(event) =>
                        field.onChange(event.target.value ? Number(event.target.value) : undefined)
                      }
                    />
                    {fieldState.error && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="pledgedAmount"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="pledgedAmount">Valor pignorado</FieldLabel>
                    <Input id="pledgedAmount" {...field} value={field.value ?? ''} />
                    {fieldState.error && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="effectiveDate"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid} className="col-span-2">
                    <FieldLabel htmlFor="effectiveDate">Fecha vigencia</FieldLabel>
                    <DatePicker
                      id="effectiveDate"
                      value={field.value ?? null}
                      onChange={(value) => field.onChange(value ?? new Date())}
                      ariaInvalid={fieldState.invalid}
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
                {editingIndex !== null ? 'Guardar cambios' : 'Agregar pignoracion'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {hasItems ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Codigo</TableHead>
              <TableHead>Beneficiario</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Vigencia</TableHead>
              <TableHead className="w-30 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field, index) => (
              <TableRow key={field.id}>
                <TableCell>{field.pledgeCode}</TableCell>
                <TableCell>{field.beneficiaryCode}</TableCell>
                <TableCell className="font-mono text-xs">
                  {formatCurrency(field.pledgedAmount)}
                </TableCell>
                <TableCell>{formatDateISO(new Date(field.effectiveDate))}</TableCell>
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
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className={cn('text-muted-foreground rounded-md border border-dashed p-4 text-sm')}>
          No hay pignoraciones agregadas.
        </div>
      )}
    </div>
  );
}
