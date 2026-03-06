'use client';

import { Badge } from '@/components/ui/badge';
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
import { cn } from '@/lib/utils';
import {
  CreateDocumentTemplateBodySchema,
  DocumentTemplateSignerRuleInput,
  DocumentTemplateSignerRuleInputSchema,
  signerRoleLabels,
  SIGNER_ROLE_OPTIONS,
} from '@/schemas/document-template';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Controller, type Resolver, useFieldArray, useForm, useFormContext } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

type FormValues = z.infer<typeof CreateDocumentTemplateBodySchema>;

export function DocumentTemplateSignerRulesForm() {
  const form = useFormContext<FormValues>();

  const { fields, append, update, remove } = useFieldArray({
    control: form.control,
    name: 'templateSignerRules',
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const dialogForm = useForm<DocumentTemplateSignerRuleInput>({
    resolver: zodResolver(
      DocumentTemplateSignerRuleInputSchema
    ) as Resolver<DocumentTemplateSignerRuleInput>,
    defaultValues: {
      signerRole: 'BORROWER',
      signOrder: 1,
      required: true,
    },
  });

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      dialogForm.reset({
        signerRole: 'BORROWER',
        signOrder: 1,
        required: true,
      });
      setEditingIndex(null);
    }
  };

  const handleAddClick = () => {
    const nextOrder = Math.max(...fields.map((f) => f.signOrder), 0) + 1;
    dialogForm.reset({
      signerRole: 'BORROWER',
      signOrder: nextOrder,
      required: true,
    });
    setEditingIndex(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (index: number) => {
    const current = fields[index];
    dialogForm.reset({
      signerRole: current.signerRole,
      signOrder: current.signOrder,
      required: current.required,
    });
    setEditingIndex(index);
    setIsDialogOpen(true);
  };

  const onSave = (values: DocumentTemplateSignerRuleInput) => {
    const duplicatedRole = fields.some(
      (item, index) => item.signerRole === values.signerRole && index !== editingIndex
    );
    if (duplicatedRole) {
      toast.error('No puede repetir el rol de firmante');
      return;
    }

    const duplicatedOrder = fields.some(
      (item, index) => item.signOrder === values.signOrder && index !== editingIndex
    );
    if (duplicatedOrder) {
      toast.error('No puede repetir el orden de firma');
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
          <p className="text-sm font-medium">Firmantes</p>
          <p className="text-muted-foreground text-sm">
            Configure orden y obligatoriedad de firma por rol.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button type="button" size="sm" onClick={handleAddClick}>
              <Plus className="h-4 w-4" />
              Agregar firmante
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingIndex !== null ? 'Editar firmante' : 'Agregar firmante'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <Controller
                name="signerRole"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="signerRole">Rol</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {SIGNER_ROLE_OPTIONS.map((role) => (
                          <SelectItem key={role} value={role}>
                            {signerRoleLabels[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.error && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="signOrder"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="signOrder">Orden firma</FieldLabel>
                    <Input
                      id="signOrder"
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
                name="required"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="required">Obligatorio</FieldLabel>
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
                {editingIndex !== null ? 'Guardar cambios' : 'Agregar firmante'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {fields.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Orden</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Obligatorio</TableHead>
              <TableHead className="w-30 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields
              .slice()
              .sort((a, b) => a.signOrder - b.signOrder)
              .map((field) => {
                const originalIndex = fields.findIndex((item) => item.id === field.id);
                return (
                  <TableRow key={field.id}>
                    <TableCell>{field.signOrder}</TableCell>
                    <TableCell>{signerRoleLabels[field.signerRole]}</TableCell>
                    <TableCell>
                      <Badge variant={field.required ? 'default' : 'outline'}>
                        {field.required ? 'Si' : 'No'}
                      </Badge>
                    </TableCell>
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
          No hay firmantes configurados.
        </div>
      )}
    </div>
  );
}
