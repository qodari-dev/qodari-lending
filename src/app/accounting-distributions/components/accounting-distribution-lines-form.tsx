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
  AccountingDistributionLineInput,
  AccountingDistributionLineInputSchema,
  CreateAccountingDistributionBodySchema,
  ENTRY_NATURE_OPTIONS,
  entryNatureLabels,
  EntryNature,
} from '@/schemas/accounting-distribution';
import { useGlAccounts } from '@/hooks/queries/use-gl-account-queries';
import { GlAccount } from '@/schemas/gl-account';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDownIcon, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Controller, useFieldArray, useForm, useFormContext } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

type FormValues = z.infer<typeof CreateAccountingDistributionBodySchema>;

export function AccountingDistributionLinesForm() {
  const form = useFormContext<FormValues>();
  const dialogContentRef = useRef<HTMLDivElement | null>(null);

  const { fields, append, update, remove } = useFieldArray({
    control: form.control,
    name: 'accountingDistributionLines',
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const dialogForm = useForm<AccountingDistributionLineInput>({
    resolver: zodResolver(AccountingDistributionLineInputSchema),
    defaultValues: {
      glAccountId: undefined,
      percentage: '',
      nature: 'DEBIT',
    },
  });

  const { data: glAccountsData } = useGlAccounts({
    limit: 500,
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'code', order: 'asc' }],
  });
  const glAccounts = useMemo(() => glAccountsData?.body?.data ?? [], [glAccountsData]);

  // Helpers para encontrar objetos por ID
  const findGlAccount = useCallback(
    (id: number | undefined) => glAccounts.find((acc) => acc.id === id) ?? null,
    [glAccounts]
  );

  const glAccountLabelMap = useMemo(() => {
    const map = new Map<number, string>();
    glAccounts.forEach((acc) => {
      map.set(acc.id, `${acc.code} - ${acc.name}`);
    });
    return map;
  }, [glAccounts]);

  const hasLines = useMemo(() => fields.length > 0, [fields.length]);

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      dialogForm.reset();
      setEditingIndex(null);
    }
  };

  const handleAddClick = () => {
    dialogForm.reset({
      glAccountId: undefined,
      percentage: '',
      nature: 'DEBIT',
    });
    setEditingIndex(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (index: number) => {
    const current = fields[index];
    dialogForm.reset({
      glAccountId: current?.glAccountId ?? undefined,
      percentage: current?.percentage ?? '',
      nature: current?.nature ?? 'DEBIT',
    });
    setEditingIndex(index);
    setIsDialogOpen(true);
  };

  const onSave = (values: AccountingDistributionLineInput) => {
    const isDuplicate = fields.some(
      (f, idx) => f.glAccountId === values.glAccountId && idx !== editingIndex
    );

    if (isDuplicate) {
      toast.error('Ya existe una linea con esa cuenta');
      return;
    }

    if (editingIndex !== null) {
      update(editingIndex, values);
    } else {
      append(values);
    }
    setIsDialogOpen(false);
  };

  const getGlAccountLabel = (id: number | undefined) => {
    if (!id) return '-';
    return glAccountLabelMap.get(id) ?? String(id);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">Lineas de distribucion</p>
          <p className="text-muted-foreground text-sm">
            Define los auxiliares y porcentaje de cada linea.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button type="button" size="sm" onClick={handleAddClick}>
              <Plus className="h-4 w-4" />
              Agregar linea
            </Button>
          </DialogTrigger>
          <DialogContent ref={dialogContentRef}>
            <DialogHeader>
              <DialogTitle>{editingIndex !== null ? 'Editar linea' : 'Agregar linea'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Controller
                name="glAccountId"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="glAccountId">Cuenta contable</FieldLabel>
                    <Combobox
                      items={glAccounts}
                      value={findGlAccount(field.value)}
                      onValueChange={(val: GlAccount | null) =>
                        field.onChange(val?.id ?? undefined)
                      }
                      itemToStringValue={(item: GlAccount) => String(item.id)}
                      itemToStringLabel={(item: GlAccount) => `${item.code} - ${item.name}`}
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
                          placeholder="Buscar cuenta..."
                          showClear
                          showTrigger={false}
                        />
                        <ComboboxList>
                          <ComboboxEmpty>No se encontraron cuentas</ComboboxEmpty>
                          <ComboboxCollection>
                            {(item: GlAccount) => (
                              <ComboboxItem key={item.id} value={item}>
                                {item.code} - {item.name}
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
                name="percentage"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="percentage">Porcentaje</FieldLabel>
                    <Input
                      id="percentage"
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value)}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.error && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="nature"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="nature">Naturaleza</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {ENTRY_NATURE_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {entryNatureLabels[option]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                {editingIndex !== null ? 'Guardar cambios' : 'Agregar linea'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {hasLines ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cuenta</TableHead>
              <TableHead>Naturaleza</TableHead>
              <TableHead>Porcentaje</TableHead>
              <TableHead className="w-30 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field, index) => (
              <TableRow key={field.id}>
                <TableCell>{getGlAccountLabel(field.glAccountId)}</TableCell>
                <TableCell>
                  {entryNatureLabels[field.nature as EntryNature] ?? field.nature}
                </TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs">
                  {field.percentage}
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
          No hay lineas agregadas.
        </div>
      )}
    </div>
  );
}
