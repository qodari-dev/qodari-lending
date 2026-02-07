'use client';

import { Button } from '@/components/ui/button';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useGlAccounts } from '@/hooks/queries/use-gl-account-queries';
import { cn } from '@/lib/utils';
import {
  CreateCreditProductBodySchema,
  CreditProductAccountInput,
  CreditProductAccountInputSchema,
} from '@/schemas/credit-product';
import { GlAccount } from '@/schemas/gl-account';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDownIcon, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Controller, useFieldArray, useForm, useFormContext } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

type FormValues = z.infer<typeof CreateCreditProductBodySchema>;

export function CreditProductAccountsForm() {
  const form = useFormContext<FormValues>();
  const dialogContentRef = useRef<HTMLDivElement | null>(null);

  const { fields, append, update, remove } = useFieldArray({
    control: form.control,
    name: 'creditProductAccounts',
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const dialogForm = useForm<CreditProductAccountInput>({
    resolver: zodResolver(CreditProductAccountInputSchema),
    defaultValues: {
      capitalGlAccountId: undefined,
      interestGlAccountId: undefined,
      lateInterestGlAccountId: undefined,
    },
  });

  const { data: glAccountsData } = useGlAccounts({
    limit: 1000,
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'code', order: 'asc' }],
  });
  const glAccounts = useMemo(() => glAccountsData?.body?.data ?? [], [glAccountsData]);

  const findGlAccount = useCallback(
    (id: number | undefined) => glAccounts.find((item) => item.id === id) ?? null,
    [glAccounts]
  );

  const accountLabelMap = useMemo(() => {
    const map = new Map<number, string>();
    glAccounts.forEach((item) => {
      map.set(item.id, `${item.code} - ${item.name}`);
    });
    return map;
  }, [glAccounts]);

  const hasItems = useMemo(() => fields.length > 0, [fields.length]);

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      dialogForm.reset();
      setEditingIndex(null);
    }
  };

  const handleAddClick = () => {
    if (fields.length >= 1) {
      toast.error('Solo se permite una configuracion de cuentas por producto');
      return;
    }

    dialogForm.reset({
      capitalGlAccountId: undefined,
      interestGlAccountId: undefined,
      lateInterestGlAccountId: undefined,
    });
    setEditingIndex(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (index: number) => {
    const current = fields[index];
    dialogForm.reset({
      capitalGlAccountId: current?.capitalGlAccountId ?? undefined,
      interestGlAccountId: current?.interestGlAccountId ?? undefined,
      lateInterestGlAccountId: current?.lateInterestGlAccountId ?? undefined,
    });
    setEditingIndex(index);
    setIsDialogOpen(true);
  };

  const onSave = (values: CreditProductAccountInput) => {
    if (editingIndex !== null) {
      update(editingIndex, values);
    } else {
      append(values);
    }

    setIsDialogOpen(false);
  };

  const getAccountLabel = (id: number) => {
    return accountLabelMap.get(id) ?? String(id);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">Cuentas contables</p>
          <p className="text-muted-foreground text-sm">
            Configure auxiliares para capital, interes y mora.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button type="button" size="sm" onClick={handleAddClick}>
              <Plus className="h-4 w-4" />
              Configurar cuentas
            </Button>
          </DialogTrigger>
          <DialogContent ref={dialogContentRef}>
            <DialogHeader>
              <DialogTitle>
                {editingIndex !== null ? 'Editar cuentas' : 'Configurar cuentas'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Controller
                name="capitalGlAccountId"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="capitalGlAccountId">Cuenta capital</FieldLabel>
                    <Combobox
                      items={glAccounts}
                      value={findGlAccount(field.value)}
                      onValueChange={(value: GlAccount | null) => field.onChange(value?.id ?? undefined)}
                      itemToStringValue={(item: GlAccount) => String(item.id)}
                      itemToStringLabel={(item: GlAccount) => `${item.code} - ${item.name}`}
                    >
                      <ComboboxTrigger
                        render={
                          <Button type="button" variant="outline" className="w-full justify-between font-normal">
                            <ComboboxValue placeholder="Seleccione..." />
                            <ChevronDownIcon className="text-muted-foreground size-4" />
                          </Button>
                        }
                      />
                      <ComboboxContent portalContainer={dialogContentRef}>
                        <ComboboxInput placeholder="Buscar cuenta..." showClear showTrigger={false} />
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
                name="interestGlAccountId"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="interestGlAccountId">Cuenta interes</FieldLabel>
                    <Combobox
                      items={glAccounts}
                      value={findGlAccount(field.value)}
                      onValueChange={(value: GlAccount | null) => field.onChange(value?.id ?? undefined)}
                      itemToStringValue={(item: GlAccount) => String(item.id)}
                      itemToStringLabel={(item: GlAccount) => `${item.code} - ${item.name}`}
                    >
                      <ComboboxTrigger
                        render={
                          <Button type="button" variant="outline" className="w-full justify-between font-normal">
                            <ComboboxValue placeholder="Seleccione..." />
                            <ChevronDownIcon className="text-muted-foreground size-4" />
                          </Button>
                        }
                      />
                      <ComboboxContent portalContainer={dialogContentRef}>
                        <ComboboxInput placeholder="Buscar cuenta..." showClear showTrigger={false} />
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
                name="lateInterestGlAccountId"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="lateInterestGlAccountId">Cuenta mora</FieldLabel>
                    <Combobox
                      items={glAccounts}
                      value={findGlAccount(field.value)}
                      onValueChange={(value: GlAccount | null) => field.onChange(value?.id ?? undefined)}
                      itemToStringValue={(item: GlAccount) => String(item.id)}
                      itemToStringLabel={(item: GlAccount) => `${item.code} - ${item.name}`}
                    >
                      <ComboboxTrigger
                        render={
                          <Button type="button" variant="outline" className="w-full justify-between font-normal">
                            <ComboboxValue placeholder="Seleccione..." />
                            <ChevronDownIcon className="text-muted-foreground size-4" />
                          </Button>
                        }
                      />
                      <ComboboxContent portalContainer={dialogContentRef}>
                        <ComboboxInput placeholder="Buscar cuenta..." showClear showTrigger={false} />
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
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="button" onClick={dialogForm.handleSubmit(onSave)}>
                {editingIndex !== null ? 'Guardar cambios' : 'Guardar cuentas'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {hasItems ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Capital</TableHead>
              <TableHead>Interes</TableHead>
              <TableHead>Mora</TableHead>
              <TableHead className="w-30 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field, index) => (
              <TableRow key={field.id}>
                <TableCell>{getAccountLabel(field.capitalGlAccountId)}</TableCell>
                <TableCell>{getAccountLabel(field.interestGlAccountId)}</TableCell>
                <TableCell>{getAccountLabel(field.lateInterestGlAccountId)}</TableCell>
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
          No hay cuentas configuradas.
        </div>
      )}
    </div>
  );
}
