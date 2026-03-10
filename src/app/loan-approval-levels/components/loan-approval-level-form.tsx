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
} from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
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
import {
  useCreateLoanApprovalLevel,
  useUpdateLoanApprovalLevel,
} from '@/hooks/queries/use-loan-approval-level-queries';
import { cn } from '@/lib/utils';
import { IamUser } from '@/schemas/iam-user';
import {
  CreateLoanApprovalLevelBodySchema,
  LoanApprovalLevel,
  LoanApprovalLevelUserInput,
  LoanApprovalLevelUserInputSchema,
} from '@/schemas/loan-approval-level';
import { onSubmitError } from '@/utils/on-submit-error';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDownIcon, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Controller, type Resolver, useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

type FormValues = z.infer<typeof CreateLoanApprovalLevelBodySchema>;
type UserFormValues = z.infer<typeof LoanApprovalLevelUserInputSchema>;

export function LoanApprovalLevelForm({
  loanApprovalLevel,
  opened,
  onOpened,
}: {
  loanApprovalLevel: LoanApprovalLevel | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  const formId = useId();
  const sheetContentRef = useRef<HTMLDivElement | null>(null);
  const dialogContentRef = useRef<HTMLDivElement | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(CreateLoanApprovalLevelBodySchema) as Resolver<FormValues>,
    defaultValues: {
      name: '',
      levelOrder: 1,
      maxApprovalAmount: null,
      isActive: true,
      users: [],
    },
  });

  const { fields, append, update, remove } = useFieldArray({
    control: form.control,
    name: 'users',
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const userDialogForm = useForm<UserFormValues>({
    resolver: zodResolver(LoanApprovalLevelUserInputSchema) as Resolver<UserFormValues>,
    defaultValues: {
      userId: undefined,
      userName: '',
      sortOrder: 1,
      isActive: true,
    },
  });

  useEffect(() => {
    if (!opened) return;

    form.reset({
      name: loanApprovalLevel?.name ?? '',
      levelOrder: loanApprovalLevel?.levelOrder ?? 1,
      maxApprovalAmount: loanApprovalLevel?.maxApprovalAmount ?? null,
      isActive: loanApprovalLevel?.isActive ?? true,
      users:
        loanApprovalLevel?.users?.map((user) => ({
          userId: user.userId,
          userName: user.userName,
          sortOrder: user.sortOrder,
          isActive: user.isActive,
        })) ?? [],
    });
  }, [form, loanApprovalLevel, opened]);

  const { data: iamUsersData } = useIamUsers({ limit: 200, isEmployee: true });
  const iamUsers = useMemo(() => iamUsersData?.body?.data ?? [], [iamUsersData]);
  const findIamUser = useCallback(
    (id: string | undefined) => iamUsers.find((user) => user.id === id) ?? null,
    [iamUsers]
  );

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      userDialogForm.reset({
        userId: undefined,
        userName: '',
        sortOrder: 1,
        isActive: true,
      });
      setEditingIndex(null);
    }
  };

  const handleAddUser = () => {
    userDialogForm.reset({
      userId: undefined,
      userName: '',
      sortOrder: fields.length + 1,
      isActive: true,
    });
    setEditingIndex(null);
    setIsDialogOpen(true);
  };

  const handleEditUser = (index: number) => {
    const current = fields[index];
    if (!current) return;

    userDialogForm.reset({
      userId: current.userId,
      userName: current.userName,
      sortOrder: current.sortOrder,
      isActive: current.isActive,
    });
    setEditingIndex(index);
    setIsDialogOpen(true);
  };

  const saveUser = (values: LoanApprovalLevelUserInput) => {
    const isDuplicateUser = fields.some((field, index) => {
      if (editingIndex !== null && index === editingIndex) return false;
      return field.userId === values.userId;
    });

    if (isDuplicateUser) {
      toast.error('No puede repetir el mismo usuario');
      return;
    }

    const isDuplicateSortOrder = fields.some((field, index) => {
      if (editingIndex !== null && index === editingIndex) return false;
      return field.sortOrder === values.sortOrder;
    });

    if (isDuplicateSortOrder) {
      toast.error('No puede repetir el orden de usuario dentro del nivel');
      return;
    }

    if (editingIndex !== null) {
      update(editingIndex, values);
    } else {
      append(values);
    }

    setIsDialogOpen(false);
  };

  const { mutateAsync: create, isPending: isCreating } = useCreateLoanApprovalLevel();
  const { mutateAsync: updateLevel, isPending: isUpdating } = useUpdateLoanApprovalLevel();

  const isLoading = useMemo(() => isCreating || isUpdating, [isCreating, isUpdating]);

  const onSubmit = useCallback(
    async (values: FormValues) => {
      const payload = {
        ...values,
        name: values.name.trim(),
        maxApprovalAmount: values.maxApprovalAmount?.trim()
          ? values.maxApprovalAmount.trim()
          : null,
        users: values.users.map((user) => ({
          ...user,
          userName: user.userName.trim(),
        })),
      };

      if (loanApprovalLevel) {
        await updateLevel({ params: { id: loanApprovalLevel.id }, body: payload });
      } else {
        await create({ body: payload });
      }

      onOpened(false);
    },
    [create, loanApprovalLevel, onOpened, updateLevel]
  );

  return (
    <Sheet open={opened} onOpenChange={onOpened}>
      <SheetContent ref={sheetContentRef} className="overflow-y-scroll sm:max-w-4xl">
        <SheetHeader>
          <SheetTitle>
            {loanApprovalLevel ? 'Editar Nivel de Aprobacion' : 'Nuevo Nivel de Aprobacion'}
          </SheetTitle>
          <SheetDescription>
            Configure el monto maximo y usuarios que participan en este nivel.
          </SheetDescription>
        </SheetHeader>

        <form id={formId} onSubmit={form.handleSubmit(onSubmit, onSubmitError)} className="space-y-4 px-4">
          <FieldGroup>
            <div className="grid gap-4 md:grid-cols-2">
              <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="name">Nombre</FieldLabel>
                    <Input {...field} maxLength={100} aria-invalid={fieldState.invalid} />
                    {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                  </Field>
                )}
              />

              <Controller
                name="levelOrder"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="levelOrder">Orden del nivel</FieldLabel>
                    <Input
                      id="levelOrder"
                      type="number"
                      min={1}
                      value={field.value ?? ''}
                      onChange={(event) => field.onChange(Number(event.target.value || 0))}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                  </Field>
                )}
              />

              <Controller
                name="maxApprovalAmount"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="maxApprovalAmount">Tope de monto</FieldLabel>
                    <Input
                      id="maxApprovalAmount"
                      value={field.value ?? ''}
                      onChange={(event) => field.onChange(event.target.value || null)}
                      placeholder="Vacio para tope infinito"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                  </Field>
                )}
              />

              <Controller
                name="isActive"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="isActive">Activo?</FieldLabel>
                    <div>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        aria-invalid={fieldState.invalid}
                      />
                    </div>
                    {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                  </Field>
                )}
              />
            </div>
          </FieldGroup>

          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Usuarios del nivel</p>
                <p className="text-muted-foreground text-sm">
                  Defina usuarios activos y el orden para round-robin.
                </p>
              </div>

              <Button type="button" size="sm" onClick={handleAddUser}>
                <Plus className="h-4 w-4" />
                Agregar usuario
              </Button>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
              <DialogContent ref={dialogContentRef}>
                <DialogHeader>
                  <DialogTitle>{editingIndex !== null ? 'Editar usuario' : 'Agregar usuario'}</DialogTitle>
                </DialogHeader>

                <div className="space-y-3">
                  <Controller
                    name="userId"
                    control={userDialogForm.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="userId">Usuario</FieldLabel>
                        <Combobox
                          items={iamUsers}
                          value={findIamUser(field.value)}
                          onValueChange={(value: IamUser | null) => {
                            field.onChange(value?.id ?? undefined);
                            userDialogForm.setValue('userName', value?.displayName ?? '');
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
                        {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                      </Field>
                    )}
                  />

                  <Controller
                    name="sortOrder"
                    control={userDialogForm.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="sortOrder">Orden</FieldLabel>
                        <Input
                          id="sortOrder"
                          type="number"
                          min={1}
                          value={field.value ?? ''}
                          onChange={(event) =>
                            field.onChange(
                              event.target.value === ''
                                ? undefined
                                : Number(event.target.value)
                            )
                          }
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                      </Field>
                    )}
                  />

                  <Controller
                    name="isActive"
                    control={userDialogForm.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="isActiveUser">Activo?</FieldLabel>
                        <div>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            aria-invalid={fieldState.invalid}
                          />
                        </div>
                        {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
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
                  <Button type="button" onClick={userDialogForm.handleSubmit(saveUser)}>
                    Guardar usuario
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {fields.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Orden</TableHead>
                    <TableHead>Activo</TableHead>
                    <TableHead className="w-30 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell className="font-mono text-xs">{field.userId}</TableCell>
                      <TableCell>{field.userName}</TableCell>
                      <TableCell>{field.sortOrder}</TableCell>
                      <TableCell>{field.isActive ? 'Si' : 'No'}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditUser(index)}
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
                No hay usuarios agregados.
              </div>
            )}
          </div>
        </form>

        <SheetFooter>
          <Button type="submit" form={formId} disabled={isLoading}>
            {isLoading ? <Spinner /> : null}
            Guardar
          </Button>
          <SheetClose asChild>
            <Button variant="outline">Cerrar</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
