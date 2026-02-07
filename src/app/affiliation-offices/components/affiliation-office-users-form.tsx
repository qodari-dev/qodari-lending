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
import { useIamUsers } from '@/hooks/queries/use-iam-user-queries';
import { cn } from '@/lib/utils';
import { IamUser } from '@/schemas/iam-user';
import {
  CreateAffiliationOfficeBodySchema,
  UserAffiliationOfficeInput,
  UserAffiliationOfficeInputSchema,
} from '@/schemas/affiliation-office';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDownIcon, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Controller, useFieldArray, useForm, useFormContext } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

type FormValues = z.infer<typeof CreateAffiliationOfficeBodySchema>;

export function AffiliationOfficeUsersForm() {
  const form = useFormContext<FormValues>();
  const dialogContentRef = useRef<HTMLDivElement | null>(null);

  const { fields, append, update, remove, replace } = useFieldArray({
    control: form.control,
    name: 'userAffiliationOffices',
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const dialogForm = useForm<UserAffiliationOfficeInput>({
    resolver: zodResolver(UserAffiliationOfficeInputSchema),
    defaultValues: {
      userId: undefined,
      userName: '',
      isPrimary: false,
    },
  });

  const { data: iamUsersData } = useIamUsers({ limit: 200 });
  const iamUsers = useMemo(() => iamUsersData?.body?.data ?? [], [iamUsersData]);

  const findIamUser = useCallback(
    (id: string | undefined) => iamUsers.find((user) => user.id === id) ?? null,
    [iamUsers]
  );

  const userLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    iamUsers.forEach((user) => {
      map.set(user.id, user.displayName);
    });
    fields.forEach((user) => {
      map.set(user.userId, user.userName);
    });
    return map;
  }, [iamUsers, fields]);

  const hasUsers = useMemo(() => fields.length > 0, [fields.length]);

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      dialogForm.reset();
      setEditingIndex(null);
    }
  };

  const handleAddClick = () => {
    dialogForm.reset({
      userId: undefined,
      userName: '',
      isPrimary: false,
    });
    setEditingIndex(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (index: number) => {
    const current = fields[index];
    dialogForm.reset({
      userId: current?.userId,
      userName: current?.userName ?? '',
      isPrimary: current?.isPrimary ?? false,
    });
    setEditingIndex(index);
    setIsDialogOpen(true);
  };

  const onSave = (values: UserAffiliationOfficeInput) => {
    const isDuplicate = fields.some((f, idx) => f.userId === values.userId && idx !== editingIndex);

    if (isDuplicate) {
      toast.error('No se puede repetir el usuario');
      return;
    }

    if (editingIndex === null && fields.length >= 2) {
      toast.error('No pueden haber mas de dos usuarios');
      return;
    }

    if (values.isPrimary) {
      if (editingIndex !== null) {
        const next = fields.map((f, idx) => (idx === editingIndex ? values : { ...f, isPrimary: false }));
        replace(next);
      } else {
        const next = fields.map((f) => ({ ...f, isPrimary: false }));
        replace([...next, values]);
      }
      setIsDialogOpen(false);
      return;
    }

    if (editingIndex !== null) {
      update(editingIndex, values);
    } else {
      append(values);
    }

    setIsDialogOpen(false);
  };

  const getUserLabelForTable = (id: string) => {
    return userLabelMap.get(id) ?? id;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">Usuarios</p>
          <p className="text-muted-foreground text-sm">
            Seleccione maximo dos usuarios habilitados para esta oficina.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button type="button" size="sm" onClick={handleAddClick}>
              <Plus className="h-4 w-4" />
              Agregar usuario
            </Button>
          </DialogTrigger>
          <DialogContent ref={dialogContentRef}>
            <DialogHeader>
              <DialogTitle>{editingIndex !== null ? 'Editar usuario' : 'Agregar usuario'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Controller
                name="userId"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="userId">Usuario</FieldLabel>
                    <Combobox
                      items={iamUsers}
                      value={findIamUser(field.value)}
                      onValueChange={(value: IamUser | null) => {
                        field.onChange(value?.id ?? undefined);
                        dialogForm.setValue('userName', value?.displayName ?? '');
                      }}
                      itemToStringValue={(item: IamUser) => item.id}
                      itemToStringLabel={(item: IamUser) => item.displayName}
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
                        <ComboboxInput placeholder="Buscar usuario..." showClear showTrigger={false} />
                        <ComboboxList>
                          <ComboboxEmpty>No se encontraron usuarios</ComboboxEmpty>
                          <ComboboxCollection>
                            {(item: IamUser) => (
                              <ComboboxItem key={item.id} value={item}>
                                {item.displayName}
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
                name="isPrimary"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="isPrimary">Principal?</FieldLabel>
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
                {editingIndex !== null ? 'Guardar cambios' : 'Agregar usuario'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {hasUsers ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Principal</TableHead>
              <TableHead className="w-30 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field, index) => (
              <TableRow key={field.id}>
                <TableCell>{getUserLabelForTable(field.userId)}</TableCell>
                <TableCell>{field.isPrimary ? 'Si' : 'No'}</TableCell>
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
          No hay usuarios agregados.
        </div>
      )}
    </div>
  );
}
