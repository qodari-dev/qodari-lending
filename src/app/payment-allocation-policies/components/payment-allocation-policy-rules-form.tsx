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
import { useBillingConcepts } from '@/hooks/queries/use-billing-concept-queries';
import { cn } from '@/lib/utils';
import { BillingConcept } from '@/schemas/billing-concept';
import {
  ALLOCATION_SCOPE_OPTIONS,
  allocationScopeLabels,
  CreatePaymentAllocationPolicyBodySchema,
  PaymentAllocationPolicyRuleInput,
  PaymentAllocationPolicyRuleInputSchema,
} from '@/schemas/payment-allocation-policy';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDownIcon, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Controller,
  type Resolver,
  useFieldArray,
  useForm,
  useFormContext,
} from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

type FormValues = z.infer<typeof CreatePaymentAllocationPolicyBodySchema>;

export function PaymentAllocationPolicyRulesForm() {
  const form = useFormContext<FormValues>();
  const dialogContentRef = useRef<HTMLDivElement | null>(null);

  const { fields, append, update, remove } = useFieldArray({
    control: form.control,
    name: 'paymentAllocationPolicyRules',
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const dialogForm = useForm<PaymentAllocationPolicyRuleInput>({
    resolver: zodResolver(PaymentAllocationPolicyRuleInputSchema) as Resolver<PaymentAllocationPolicyRuleInput>,
    defaultValues: {
      priority: 1,
      billingConceptId: undefined,
      scope: 'PAST_DUE_FIRST',
    },
  });

  const { data: billingConceptsData } = useBillingConcepts({
    limit: 1000,
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'code', order: 'asc' }],
  });
  const billingConcepts = useMemo(
    () => (billingConceptsData?.body?.data ?? []) as BillingConcept[],
    [billingConceptsData]
  );

  const findBillingConcept = useCallback(
    (id: number | undefined) => billingConcepts.find((item) => item.id === id) ?? null,
    [billingConcepts]
  );

  const conceptLabelMap = useMemo(() => {
    const map = new Map<number, string>();
    billingConcepts.forEach((item) => {
      map.set(item.id, `${item.code} - ${item.name}`);
    });
    return map;
  }, [billingConcepts]);

  const hasRules = useMemo(() => fields.length > 0, [fields.length]);

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      dialogForm.reset();
      setEditingIndex(null);
    }
  };

  const handleAddClick = () => {
    dialogForm.reset({
      priority: fields.length + 1,
      billingConceptId: undefined,
      scope: 'PAST_DUE_FIRST',
    });
    setEditingIndex(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (index: number) => {
    const current = fields[index];
    dialogForm.reset({
      priority: current?.priority ?? index + 1,
      billingConceptId: current?.billingConceptId ?? undefined,
      scope: current?.scope ?? 'PAST_DUE_FIRST',
    });
    setEditingIndex(index);
    setIsDialogOpen(true);
  };

  const onSave = (values: PaymentAllocationPolicyRuleInput) => {
    const duplicatedPriority = fields.some(
      (rule, index) => rule.priority === values.priority && index !== editingIndex
    );
    if (duplicatedPriority) {
      toast.error('No puede repetir la prioridad');
      return;
    }

    const duplicatedConcept = fields.some(
      (rule, index) =>
        rule.billingConceptId === values.billingConceptId && index !== editingIndex
    );
    if (duplicatedConcept) {
      toast.error('No puede repetir el concepto');
      return;
    }

    if (editingIndex !== null) {
      update(editingIndex, values);
    } else {
      append(values);
    }

    setIsDialogOpen(false);
  };

  const getConceptLabel = (id: number) => {
    return conceptLabelMap.get(id) ?? String(id);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">Reglas de prelacion</p>
          <p className="text-muted-foreground text-sm">
            Defina el orden por concepto y la forma de imputacion.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button type="button" size="sm" onClick={handleAddClick}>
              <Plus className="h-4 w-4" />
              Agregar regla
            </Button>
          </DialogTrigger>
          <DialogContent ref={dialogContentRef} className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingIndex !== null ? 'Editar regla' : 'Agregar regla'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Controller
                name="priority"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="priority">Prioridad</FieldLabel>
                    <Input
                      id="priority"
                      type="number"
                      min={1}
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
                name="billingConceptId"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="billingConceptId">Concepto</FieldLabel>
                    <Combobox
                      items={billingConcepts}
                      value={findBillingConcept(field.value)}
                      onValueChange={(value: BillingConcept | null) =>
                        field.onChange(value?.id ?? undefined)
                      }
                      itemToStringValue={(item: BillingConcept) => String(item.id)}
                      itemToStringLabel={(item: BillingConcept) => `${item.code} - ${item.name}`}
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
                            {(item: BillingConcept) => (
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
                name="scope"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="scope">Alcance</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {ALLOCATION_SCOPE_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {allocationScopeLabels[option]}
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
                {editingIndex !== null ? 'Guardar cambios' : 'Agregar regla'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {hasRules ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Prioridad</TableHead>
              <TableHead>Concepto</TableHead>
              <TableHead>Alcance</TableHead>
              <TableHead className="w-30 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields
              .slice()
              .sort((a, b) => a.priority - b.priority)
              .map((field) => {
                const originalIndex = fields.findIndex((item) => item.id === field.id);
                return (
                  <TableRow key={field.id}>
                    <TableCell>{field.priority}</TableCell>
                    <TableCell>{getConceptLabel(field.billingConceptId)}</TableCell>
                    <TableCell>{allocationScopeLabels[field.scope]}</TableCell>
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
          No hay reglas configuradas.
        </div>
      )}
    </div>
  );
}
