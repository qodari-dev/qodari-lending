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
import { useBillingConcepts } from '@/hooks/queries/use-billing-concept-queries';
import { useGlAccounts } from '@/hooks/queries/use-gl-account-queries';
import { cn } from '@/lib/utils';
import {
  billingConceptFinancingModeLabels,
  BILLING_CONCEPT_FINANCING_MODE_OPTIONS,
  billingConceptFrequencyLabels,
  BILLING_CONCEPT_FREQUENCY_OPTIONS,
  BillingConcept,
  BillingConceptRuleInput,
} from '@/schemas/billing-concept';
import {
  CreateCreditProductBodySchema,
  CreditProductBillingConceptInput,
  CreditProductBillingConceptInputSchema,
} from '@/schemas/credit-product';
import { GlAccount } from '@/schemas/gl-account';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDownIcon, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

type FormValues = z.infer<typeof CreateCreditProductBodySchema>;

const NONE_VALUE = '__NONE__';

type BillingConceptRow = BillingConcept & {
  billingConceptRules?: (BillingConceptRuleInput & { id?: number; isActive?: boolean })[];
};

export function CreditProductBillingConceptsForm() {
  const form = useFormContext<FormValues>();
  const dialogContentRef = useRef<HTMLDivElement | null>(null);

  const { fields, append, update, remove } = useFieldArray({
    control: form.control,
    name: 'creditProductBillingConcepts',
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const dialogForm = useForm<CreditProductBillingConceptInput>({
    resolver: zodResolver(CreditProductBillingConceptInputSchema) as Resolver<CreditProductBillingConceptInput>,
    defaultValues: {
      billingConceptId: undefined,
      isEnabled: true,
      overrideFrequency: null,
      overrideFinancingMode: null,
      overrideGlAccountId: null,
      overrideRuleId: null,
    },
  });

  const selectedBillingConceptId = useWatch({
    control: dialogForm.control,
    name: 'billingConceptId',
  });

  const { data: billingConceptsData } = useBillingConcepts({
    limit: 1000,
    include: ['billingConceptRules'],
    sort: [{ field: 'code', order: 'asc' }],
  });
  const billingConcepts = useMemo(
    () => (billingConceptsData?.body?.data ?? []) as BillingConceptRow[],
    [billingConceptsData]
  );

  const { data: glAccountsData } = useGlAccounts({
    limit: 1000,
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'code', order: 'asc' }],
  });
  const glAccounts = useMemo(() => glAccountsData?.body?.data ?? [], [glAccountsData]);

  const findBillingConcept = useCallback(
    (id: number | undefined) => billingConcepts.find((item) => item.id === id) ?? null,
    [billingConcepts]
  );

  const findGlAccount = useCallback(
    (id: number | null | undefined) => glAccounts.find((item) => item.id === id) ?? null,
    [glAccounts]
  );

  const billingConceptLabelMap = useMemo(() => {
    const map = new Map<number, string>();
    billingConcepts.forEach((item) => {
      map.set(item.id, `${item.code} - ${item.name}`);
    });
    return map;
  }, [billingConcepts]);

  const glAccountLabelMap = useMemo(() => {
    const map = new Map<number, string>();
    glAccounts.forEach((item) => {
      map.set(item.id, `${item.code} - ${item.name}`);
    });
    return map;
  }, [glAccounts]);

  const ruleOptions = useMemo(() => {
    if (!selectedBillingConceptId) return [];
    const concept = billingConcepts.find((item) => item.id === selectedBillingConceptId);
    return (
      concept?.billingConceptRules
        ?.filter((rule) => rule.id != null && (rule.isActive ?? true))
        .map((rule) => ({
          id: Number(rule.id),
          label: `Regla #${rule.id}`,
        })) ?? []
    );
  }, [selectedBillingConceptId, billingConcepts]);

  useEffect(() => {
    const currentRuleId = dialogForm.getValues('overrideRuleId');
    if (!currentRuleId) return;
    const exists = ruleOptions.some((option) => option.id === currentRuleId);
    if (!exists) {
      dialogForm.setValue('overrideRuleId', null, { shouldDirty: true });
    }
  }, [dialogForm, ruleOptions]);

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
      billingConceptId: undefined,
      isEnabled: true,
      overrideFrequency: null,
      overrideFinancingMode: null,
      overrideGlAccountId: null,
      overrideRuleId: null,
    });
    setEditingIndex(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (index: number) => {
    const current = fields[index];
    dialogForm.reset({
      billingConceptId: current?.billingConceptId ?? undefined,
      isEnabled: current?.isEnabled ?? true,
      overrideFrequency: current?.overrideFrequency ?? null,
      overrideFinancingMode: current?.overrideFinancingMode ?? null,
      overrideGlAccountId: current?.overrideGlAccountId ?? null,
      overrideRuleId: current?.overrideRuleId ?? null,
    });
    setEditingIndex(index);
    setIsDialogOpen(true);
  };

  const onSave = (values: CreditProductBillingConceptInput) => {
    const duplicate = fields.some(
      (field, index) =>
        field.billingConceptId === values.billingConceptId && index !== editingIndex
    );
    if (duplicate) {
      toast.error('No puede repetir el concepto de facturacion');
      return;
    }

    if (editingIndex !== null) {
      update(editingIndex, values);
    } else {
      append(values);
    }

    setIsDialogOpen(false);
  };

  const getBillingConceptLabel = (id: number) => {
    return billingConceptLabelMap.get(id) ?? String(id);
  };

  const getGlAccountLabel = (id: number | null | undefined) => {
    if (!id) return '-';
    return glAccountLabelMap.get(id) ?? String(id);
  };

  const getRuleLabel = (id: number | null | undefined) => {
    if (!id) return '-';
    return `Regla #${id}`;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">Conceptos de facturacion</p>
          <p className="text-muted-foreground text-sm">
            Configure que conceptos aplican al producto y sus overrides.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button type="button" size="sm" onClick={handleAddClick}>
              <Plus className="h-4 w-4" />
              Agregar concepto
            </Button>
          </DialogTrigger>
          <DialogContent ref={dialogContentRef} className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingIndex !== null ? 'Editar concepto' : 'Agregar concepto'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Controller
                name="billingConceptId"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="billingConceptId">Concepto</FieldLabel>
                    <Combobox
                      items={billingConcepts}
                      value={findBillingConcept(field.value)}
                      onValueChange={(value: BillingConceptRow | null) =>
                        field.onChange(value?.id ?? undefined)
                      }
                      itemToStringValue={(item: BillingConceptRow) => String(item.id)}
                      itemToStringLabel={(item: BillingConceptRow) => `${item.code} - ${item.name}`}
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
                        <ComboboxInput placeholder="Buscar concepto..." showClear showTrigger={false} />
                        <ComboboxList>
                          <ComboboxEmpty>No se encontraron conceptos</ComboboxEmpty>
                          <ComboboxCollection>
                            {(item: BillingConceptRow) => (
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
                name="overrideFrequency"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="overrideFrequency">Frecuencia override</FieldLabel>
                    <Select
                      value={field.value ?? NONE_VALUE}
                      onValueChange={(value) =>
                        field.onChange(value === NONE_VALUE ? null : value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>Sin override</SelectItem>
                        {BILLING_CONCEPT_FREQUENCY_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {billingConceptFrequencyLabels[option]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.error && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="overrideFinancingMode"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="overrideFinancingMode">Modo override</FieldLabel>
                    <Select
                      value={field.value ?? NONE_VALUE}
                      onValueChange={(value) =>
                        field.onChange(value === NONE_VALUE ? null : value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>Sin override</SelectItem>
                        {BILLING_CONCEPT_FINANCING_MODE_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {billingConceptFinancingModeLabels[option]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.error && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="overrideGlAccountId"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="overrideGlAccountId">Cuenta override</FieldLabel>
                    <Combobox
                      items={glAccounts}
                      value={findGlAccount(field.value)}
                      onValueChange={(value: GlAccount | null) => field.onChange(value?.id ?? null)}
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
                    <div className="mt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => field.onChange(null)}
                      >
                        Sin override
                      </Button>
                    </div>
                    {fieldState.error && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="overrideRuleId"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="overrideRuleId">Regla override</FieldLabel>
                    <Select
                      value={field.value ? String(field.value) : NONE_VALUE}
                      onValueChange={(value) =>
                        field.onChange(value === NONE_VALUE ? null : Number(value))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            selectedBillingConceptId
                              ? 'Seleccione...'
                              : 'Seleccione un concepto'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>Sin override</SelectItem>
                        {ruleOptions.map((option) => (
                          <SelectItem key={option.id} value={String(option.id)}>
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
                name="isEnabled"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="isEnabled">Activo?</FieldLabel>
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
                {editingIndex !== null ? 'Guardar cambios' : 'Agregar concepto'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {hasItems ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Concepto</TableHead>
              <TableHead>Frecuencia</TableHead>
              <TableHead>Modo</TableHead>
              <TableHead>Cuenta</TableHead>
              <TableHead>Regla</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-30 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field, index) => (
              <TableRow key={field.id}>
                <TableCell>{getBillingConceptLabel(field.billingConceptId)}</TableCell>
                <TableCell>
                  {field.overrideFrequency
                    ? billingConceptFrequencyLabels[field.overrideFrequency]
                    : '-'}
                </TableCell>
                <TableCell>
                  {field.overrideFinancingMode
                    ? billingConceptFinancingModeLabels[field.overrideFinancingMode]
                    : '-'}
                </TableCell>
                <TableCell>{getGlAccountLabel(field.overrideGlAccountId)}</TableCell>
                <TableCell>{getRuleLabel(field.overrideRuleId)}</TableCell>
                <TableCell>{field.isEnabled ? 'Activo' : 'Inactivo'}</TableCell>
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
          No hay conceptos configurados.
        </div>
      )}
    </div>
  );
}
