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
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDocumentTemplates } from '@/hooks/queries/use-document-template-queries';
import { cn } from '@/lib/utils';
import {
  documentTemplateStatusLabels,
  type DocumentTemplate,
} from '@/schemas/document-template';
import {
  CreateCreditProductBodySchema,
  CreditProductDocumentRuleInput,
  CreditProductDocumentRuleInputSchema,
} from '@/schemas/credit-product';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDownIcon, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Controller, useFieldArray, useForm, useFormContext } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

type FormValues = z.infer<typeof CreateCreditProductBodySchema>;

type DocumentTemplateOption = Pick<DocumentTemplate, 'id' | 'code' | 'name' | 'version' | 'status'>;

export function CreditProductDocumentRulesForm() {
  const form = useFormContext<FormValues>();
  const dialogContentRef = useRef<HTMLDivElement | null>(null);

  const { fields, append, update, remove } = useFieldArray({
    control: form.control,
    name: 'creditProductDocumentRules',
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const nextDocumentOrder = useMemo(() => {
    const maxOrder = fields.reduce((max, item) => Math.max(max, item.documentOrder ?? 0), 0);
    return maxOrder + 1;
  }, [fields]);

  const dialogForm = useForm<CreditProductDocumentRuleInput>({
    resolver: zodResolver(CreditProductDocumentRuleInputSchema),
    defaultValues: {
      documentTemplateId: undefined,
      required: true,
      documentOrder: nextDocumentOrder,
    },
  });

  const { data: documentTemplatesData } = useDocumentTemplates({
    limit: 500,
    include: [],
    sort: [
      { field: 'name', order: 'asc' },
      { field: 'version', order: 'desc' },
    ],
  });
  const documentTemplates = useMemo(
    () => (documentTemplatesData?.body?.data ?? []) as DocumentTemplateOption[],
    [documentTemplatesData]
  );

  const findDocumentTemplate = useCallback(
    (id: number | undefined) => documentTemplates.find((item) => item.id === id) ?? null,
    [documentTemplates]
  );

  const templateLabelMap = useMemo(() => {
    const map = new Map<number, string>();
    documentTemplates.forEach((item) => {
      map.set(item.id, `${item.code} v${item.version} - ${item.name}`);
    });
    return map;
  }, [documentTemplates]);

  const templateStatusMap = useMemo(() => {
    const map = new Map<number, DocumentTemplateOption['status']>();
    documentTemplates.forEach((item) => {
      map.set(item.id, item.status);
    });
    return map;
  }, [documentTemplates]);

  const hasItems = fields.length > 0;

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      dialogForm.reset();
      setEditingIndex(null);
    }
  };

  const handleAddClick = () => {
    dialogForm.reset({
      documentTemplateId: undefined,
      required: true,
      documentOrder: nextDocumentOrder,
    });
    setEditingIndex(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (index: number) => {
    const current = fields[index];
    dialogForm.reset({
      documentTemplateId: current?.documentTemplateId ?? undefined,
      required: current?.required ?? true,
      documentOrder: current?.documentOrder ?? nextDocumentOrder,
    });
    setEditingIndex(index);
    setIsDialogOpen(true);
  };

  const onSave = (values: CreditProductDocumentRuleInput) => {
    const duplicateTemplate = fields.some(
      (item, index) => item.documentTemplateId === values.documentTemplateId && index !== editingIndex
    );
    if (duplicateTemplate) {
      toast.error('No puede repetir la plantilla de firma');
      return;
    }

    const duplicateOrder = fields.some(
      (item, index) => item.documentOrder === values.documentOrder && index !== editingIndex
    );
    if (duplicateOrder) {
      toast.error('No puede repetir el orden de documento');
      return;
    }

    if (editingIndex !== null) {
      update(editingIndex, values);
    } else {
      append(values);
    }

    setIsDialogOpen(false);
  };

  const getTemplateLabel = (id: number) => {
    return templateLabelMap.get(id) ?? String(id);
  };

  const getTemplateStatusLabel = (id: number) => {
    const status = templateStatusMap.get(id);
    return status ? documentTemplateStatusLabels[status] : '-';
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">Plantillas de firma</p>
          <p className="text-muted-foreground text-sm">
            Defina que plantillas se generan por producto y su orden.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button type="button" size="sm" onClick={handleAddClick}>
              <Plus className="h-4 w-4" />
              Agregar plantilla
            </Button>
          </DialogTrigger>
          <DialogContent ref={dialogContentRef}>
            <DialogHeader>
              <DialogTitle>
                {editingIndex !== null ? 'Editar plantilla' : 'Agregar plantilla'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Controller
                name="documentTemplateId"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="documentTemplateId">Plantilla</FieldLabel>
                    <Combobox
                      items={documentTemplates}
                      value={findDocumentTemplate(field.value)}
                      onValueChange={(value: DocumentTemplateOption | null) =>
                        field.onChange(value?.id ?? undefined)
                      }
                      itemToStringValue={(item: DocumentTemplateOption) => String(item.id)}
                      itemToStringLabel={(item: DocumentTemplateOption) =>
                        `${item.code} v${item.version} - ${item.name}`
                      }
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
                        <ComboboxInput placeholder="Buscar plantilla..." showClear showTrigger={false} />
                        <ComboboxList>
                          <ComboboxEmpty>No se encontraron plantillas</ComboboxEmpty>
                          <ComboboxCollection>
                            {(item: DocumentTemplateOption) => (
                              <ComboboxItem key={item.id} value={item}>
                                {item.code} v{item.version} - {item.name}
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
                name="documentOrder"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="documentOrder">Orden</FieldLabel>
                    <Input
                      id="documentOrder"
                      type="number"
                      min={1}
                      value={field.value ?? ''}
                      onChange={(event) =>
                        field.onChange(event.target.value ? Number(event.target.value) : undefined)
                      }
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.error && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="required"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="required">Obligatorio?</FieldLabel>
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
                {editingIndex !== null ? 'Guardar cambios' : 'Agregar plantilla'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {hasItems ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plantilla</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Orden</TableHead>
              <TableHead>Obligatorio</TableHead>
              <TableHead className="w-30 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields
              .slice()
              .sort((a, b) => a.documentOrder - b.documentOrder)
              .map((field) => {
                const originalIndex = fields.findIndex((item) => item.id === field.id);
                return (
                  <TableRow key={field.id}>
                    <TableCell>{getTemplateLabel(field.documentTemplateId)}</TableCell>
                    <TableCell>{getTemplateStatusLabel(field.documentTemplateId)}</TableCell>
                    <TableCell>{field.documentOrder}</TableCell>
                    <TableCell>{field.required ? 'Si' : 'No'}</TableCell>
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
          No hay plantillas configuradas.
        </div>
      )}
    </div>
  );
}
