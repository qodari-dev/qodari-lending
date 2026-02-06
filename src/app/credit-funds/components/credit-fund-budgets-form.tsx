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
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from '@/components/ui/combobox';
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
  CreditFundBudgetInput,
  CreditFundBudgetInputSchema,
  CreateCreditFundBodySchema,
} from '@/schemas/credit-fund';
import { useAccountingPeriods } from '@/hooks/queries/use-accounting-period-queries';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDownIcon, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Controller, useFieldArray, useForm, useFormContext } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { AccountingPeriod } from '@/schemas/accounting-period';
import { formatCurrency } from '@/utils/formatters';

type FormValues = z.infer<typeof CreateCreditFundBodySchema>;

export function CreditFundBudgetsForm() {
  const form = useFormContext<FormValues>();
  const dialogContentRef = useRef<HTMLDivElement | null>(null);

  const { fields, append, update, remove } = useFieldArray({
    control: form.control,
    name: 'creditFundBudgets',
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const dialogForm = useForm<CreditFundBudgetInput>({
    resolver: zodResolver(CreditFundBudgetInputSchema),
    defaultValues: {
      accountingPeriodId: undefined,
      fundAmount: '0',
      reinvestmentAmount: '0',
      expenseAmount: '0',
    },
  });

  const { data: periodsData } = useAccountingPeriods({
    limit: 2000,
    sort: [
      { field: 'year', order: 'desc' },
      { field: 'month', order: 'desc' },
    ],
  });
  const periods = useMemo(() => periodsData?.body?.data ?? [], [periodsData]);

  const findPeriod = useCallback(
    (id: number | undefined) => periods.find((t) => t.id === id) ?? null,
    [periods]
  );
  const getPeriodLabel = useCallback(
    (id: number | undefined) => {
      const period = findPeriod(id);
      return period ? `${period.year} - ${period.month}` : null;
    },
    [findPeriod]
  );

  const hasBudgets = useMemo(() => fields.length > 0, [fields.length]);

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      dialogForm.reset();
      setEditingIndex(null);
    }
  };

  const handleAddClick = () => {
    dialogForm.reset({
      accountingPeriodId: undefined,
      fundAmount: '0',
      reinvestmentAmount: '0',
      expenseAmount: '0',
    });
    setEditingIndex(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (index: number) => {
    const current = fields[index];
    dialogForm.reset({
      accountingPeriodId: current?.accountingPeriodId ?? undefined,
      fundAmount: current?.fundAmount ?? '0',
      reinvestmentAmount: current?.reinvestmentAmount ?? '0',
      expenseAmount: current?.expenseAmount ?? '0',
    });
    setEditingIndex(index);
    setIsDialogOpen(true);
  };

  const onSave = (values: CreditFundBudgetInput) => {
    const isDuplicate = fields.some(
      (f, idx) => f.accountingPeriodId === values.accountingPeriodId && idx !== editingIndex
    );

    if (isDuplicate) {
      toast.error('El periodo contable debe ser unico');
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
          <p className="text-sm font-medium">Presupuestos</p>
          <p className="text-muted-foreground text-sm">
            Define los montos presupuestados por periodo contable.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button type="button" size="sm" onClick={handleAddClick}>
              <Plus className="h-4 w-4" />
              Agregar presupuesto
            </Button>
          </DialogTrigger>
          <DialogContent ref={dialogContentRef}>
            <DialogHeader>
              <DialogTitle>
                {editingIndex !== null ? 'Editar presupuesto' : 'Agregar presupuesto'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Controller
                name="accountingPeriodId"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="accountingPeriodId">Periodo contable</FieldLabel>
                    <Combobox
                      items={periods}
                      value={findPeriod(field.value)}
                      onValueChange={(val: AccountingPeriod | null) =>
                        field.onChange(val?.id ?? undefined)
                      }
                      itemToStringValue={(item: AccountingPeriod) => String(item.id)}
                      itemToStringLabel={(item: AccountingPeriod) => `${item.year} - ${item.month}`}
                    >
                      <ComboboxTrigger
                        render={
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-between font-normal"
                          >
                            <ComboboxValue placeholder="Seleccione..." />
                            <ChevronDownIcon className="text-muted-foreground size-4" />
                          </Button>
                        }
                      />
                      <ComboboxContent portalContainer={dialogContentRef}>
                        <ComboboxInput
                          placeholder="Buscar periodo..."
                          showClear
                          showTrigger={false}
                        />
                        <ComboboxList>
                          <ComboboxEmpty>No se encontraron periodos</ComboboxEmpty>
                          <ComboboxCollection>
                            {(item: AccountingPeriod) => (
                              <ComboboxItem key={item.id} value={item}>
                                {getPeriodLabel(item.id)}
                              </ComboboxItem>
                            )}
                          </ComboboxCollection>
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                    {fieldState.error && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="fundAmount"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="fundAmount">Monto fondo</FieldLabel>
                    <Input
                      id="fundAmount"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value)}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.error && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="reinvestmentAmount"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="reinvestmentAmount">Monto reinversion</FieldLabel>
                    <Input
                      id="reinvestmentAmount"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value)}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.error && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="expenseAmount"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="expenseAmount">Monto gastos</FieldLabel>
                    <Input
                      id="expenseAmount"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value)}
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
                {editingIndex !== null ? 'Guardar cambios' : 'Agregar presupuesto'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {hasBudgets ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Periodo</TableHead>
              <TableHead>Fondo</TableHead>
              <TableHead>Reinversion</TableHead>
              <TableHead>Gastos</TableHead>
              <TableHead className="w-30 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field, index) => (
              <TableRow key={field.id}>
                <TableCell>{getPeriodLabel(field.accountingPeriodId)}</TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs">
                  {formatCurrency(field.fundAmount)}
                </TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs">
                  {formatCurrency(field.reinvestmentAmount)}
                </TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs">
                  {formatCurrency(field.expenseAmount)}
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
          No hay presupuestos agregados.
        </div>
      )}
    </div>
  );
}
