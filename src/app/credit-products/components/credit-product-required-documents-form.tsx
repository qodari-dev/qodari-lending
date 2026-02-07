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
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDocumentTypes } from '@/hooks/queries/use-document-type-queries';
import { cn } from '@/lib/utils';
import { DocumentType } from '@/schemas/document-type';
import {
  CreateCreditProductBodySchema,
  CreditProductRequiredDocumentInput,
  CreditProductRequiredDocumentInputSchema,
} from '@/schemas/credit-product';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDownIcon, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Controller, useFieldArray, useForm, useFormContext } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

type FormValues = z.infer<typeof CreateCreditProductBodySchema>;

export function CreditProductRequiredDocumentsForm() {
  const form = useFormContext<FormValues>();
  const dialogContentRef = useRef<HTMLDivElement | null>(null);

  const { fields, append, update, remove } = useFieldArray({
    control: form.control,
    name: 'creditProductRequiredDocuments',
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const dialogForm = useForm<CreditProductRequiredDocumentInput>({
    resolver: zodResolver(CreditProductRequiredDocumentInputSchema),
    defaultValues: {
      documentTypeId: undefined,
      isRequired: true,
    },
  });

  const { data: documentTypesData } = useDocumentTypes({
    limit: 500,
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'name', order: 'asc' }],
  });
  const documentTypes = useMemo(() => documentTypesData?.body?.data ?? [], [documentTypesData]);

  const findDocumentType = useCallback(
    (id: number | undefined) => documentTypes.find((item) => item.id === id) ?? null,
    [documentTypes]
  );

  const documentLabelMap = useMemo(() => {
    const map = new Map<number, string>();
    documentTypes.forEach((item) => {
      map.set(item.id, item.name);
    });
    return map;
  }, [documentTypes]);

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
      documentTypeId: undefined,
      isRequired: true,
    });
    setEditingIndex(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (index: number) => {
    const current = fields[index];
    dialogForm.reset({
      documentTypeId: current?.documentTypeId ?? undefined,
      isRequired: current?.isRequired ?? true,
    });
    setEditingIndex(index);
    setIsDialogOpen(true);
  };

  const onSave = (values: CreditProductRequiredDocumentInput) => {
    const isDuplicate = fields.some(
      (item, index) => item.documentTypeId === values.documentTypeId && index !== editingIndex
    );

    if (isDuplicate) {
      toast.error('No puede repetir el tipo de documento');
      return;
    }

    if (editingIndex !== null) {
      update(editingIndex, values);
    } else {
      append(values);
    }

    setIsDialogOpen(false);
  };

  const getDocumentLabel = (id: number) => {
    return documentLabelMap.get(id) ?? String(id);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">Documentos requeridos</p>
          <p className="text-muted-foreground text-sm">
            Defina los documentos asociados al tipo de credito.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button type="button" size="sm" onClick={handleAddClick}>
              <Plus className="h-4 w-4" />
              Agregar documento
            </Button>
          </DialogTrigger>
          <DialogContent ref={dialogContentRef}>
            <DialogHeader>
              <DialogTitle>
                {editingIndex !== null ? 'Editar documento' : 'Agregar documento'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Controller
                name="documentTypeId"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="documentTypeId">Documento</FieldLabel>
                    <Combobox
                      items={documentTypes}
                      value={findDocumentType(field.value)}
                      onValueChange={(value: DocumentType | null) => field.onChange(value?.id ?? undefined)}
                      itemToStringValue={(item: DocumentType) => String(item.id)}
                      itemToStringLabel={(item: DocumentType) => item.name}
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
                        <ComboboxInput placeholder="Buscar documento..." showClear showTrigger={false} />
                        <ComboboxList>
                          <ComboboxEmpty>No se encontraron documentos</ComboboxEmpty>
                          <ComboboxCollection>
                            {(item: DocumentType) => (
                              <ComboboxItem key={item.id} value={item}>
                                {item.name}
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
                name="isRequired"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="isRequired">Obligatorio?</FieldLabel>
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
                {editingIndex !== null ? 'Guardar cambios' : 'Agregar documento'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {hasItems ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Documento</TableHead>
              <TableHead>Obligatorio</TableHead>
              <TableHead className="w-30 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field, index) => (
              <TableRow key={field.id}>
                <TableCell>{getDocumentLabel(field.documentTypeId)}</TableCell>
                <TableCell>{field.isRequired ? 'Si' : 'No'}</TableCell>
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
          No hay documentos configurados.
        </div>
      )}
    </div>
  );
}
