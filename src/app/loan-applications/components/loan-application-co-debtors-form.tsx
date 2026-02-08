'use client';

import { api } from '@/clients/api';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCities } from '@/hooks/queries/use-city-queries';
import { useIdentificationTypes } from '@/hooks/queries/use-identification-type-queries';
import { cn } from '@/lib/utils';
import { City } from '@/schemas/city';
import { CoDebtorPaginated } from '@/schemas/co-debtor';
import {
  CreateLoanApplicationBodySchema,
  LoanApplicationCoDebtorInput,
  LoanApplicationCoDebtorInputSchema,
} from '@/schemas/loan-application';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDownIcon, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Controller, useFieldArray, useForm, useFormContext } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

type FormValues = z.infer<typeof CreateLoanApplicationBodySchema>;

export function LoanApplicationCoDebtorsForm() {
  const form = useFormContext<FormValues>();
  const dialogContentRef = useRef<HTMLDivElement | null>(null);

  const { fields, append, update, remove } = useFieldArray({
    control: form.control,
    name: 'loanApplicationCoDebtors',
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const dialogForm = useForm<LoanApplicationCoDebtorInput>({
    resolver: zodResolver(LoanApplicationCoDebtorInputSchema),
    defaultValues: {
      identificationTypeId: undefined,
      documentNumber: '',
      homeAddress: '',
      homeCityId: undefined,
      homePhone: '',
      companyName: '',
      workAddress: '',
      workCityId: undefined,
      workPhone: '',
    },
  });

  const { data: identificationTypesData } = useIdentificationTypes({
    limit: 200,
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'name', order: 'asc' }],
  });
  const identificationTypes = useMemo(
    () => identificationTypesData?.body?.data ?? [],
    [identificationTypesData]
  );

  const { data: citiesData } = useCities({
    limit: 2000,
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'name', order: 'asc' }],
  });
  const cities = useMemo(() => citiesData?.body?.data ?? [], [citiesData]);

  const identificationTypeLabelMap = useMemo(() => {
    const map = new Map<number, string>();
    identificationTypes.forEach((item) => map.set(item.id, item.name));
    return map;
  }, [identificationTypes]);

  const cityLabelMap = useMemo(() => {
    const map = new Map<number, string>();
    cities.forEach((item) => map.set(item.id, item.name));
    return map;
  }, [cities]);

  const findCity = useCallback(
    (id: number | undefined) => cities.find((item) => item.id === id) ?? null,
    [cities]
  );

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
      identificationTypeId: undefined,
      documentNumber: '',
      homeAddress: '',
      homeCityId: undefined,
      homePhone: '',
      companyName: '',
      workAddress: '',
      workCityId: undefined,
      workPhone: '',
    });
    setEditingIndex(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (index: number) => {
    const current = fields[index];
    dialogForm.reset({
      identificationTypeId: current?.identificationTypeId ?? undefined,
      documentNumber: current?.documentNumber ?? '',
      homeAddress: current?.homeAddress ?? '',
      homeCityId: current?.homeCityId ?? undefined,
      homePhone: current?.homePhone ?? '',
      companyName: current?.companyName ?? '',
      workAddress: current?.workAddress ?? '',
      workCityId: current?.workCityId ?? undefined,
      workPhone: current?.workPhone ?? '',
    });
    setEditingIndex(index);
    setIsDialogOpen(true);
  };

  const handleSearchByDocument = async () => {
    const identificationTypeId = dialogForm.getValues('identificationTypeId');
    const documentNumber = dialogForm.getValues('documentNumber');

    if (!identificationTypeId || !documentNumber) {
      toast.error('Seleccione tipo de documento y numero para buscar');
      return;
    }

    try {
      setIsSearching(true);
      const response = (await api.coDebtor.list.query({
        query: {
          page: 1,
          limit: 1,
          include: [],
          where: {
            and: [{ identificationTypeId }, { documentNumber }],
          },
        },
      })) as { body: CoDebtorPaginated };

      const coDebtor = response.body.data[0];
      if (!coDebtor) {
        toast.info('No existe codeudor con ese documento');
        return;
      }

      dialogForm.setValue('homeAddress', coDebtor.homeAddress);
      dialogForm.setValue('homeCityId', coDebtor.homeCityId);
      dialogForm.setValue('homePhone', coDebtor.homePhone);
      dialogForm.setValue('companyName', coDebtor.companyName);
      dialogForm.setValue('workAddress', coDebtor.workAddress);
      dialogForm.setValue('workCityId', coDebtor.workCityId);
      dialogForm.setValue('workPhone', coDebtor.workPhone);
      toast.success('Datos de codeudor cargados');
    } catch {
      toast.error('No fue posible consultar el codeudor');
    } finally {
      setIsSearching(false);
    }
  };

  const onSave = (values: LoanApplicationCoDebtorInput) => {
    const key = `${values.identificationTypeId}-${values.documentNumber}`;
    const isDuplicate = fields.some((f, idx) => {
      const currentKey = `${f.identificationTypeId}-${f.documentNumber}`;
      return currentKey === key && idx !== editingIndex;
    });

    if (isDuplicate) {
      toast.error('No puede repetir el mismo codeudor');
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
          <p className="text-sm font-medium">Codeudores</p>
          <p className="text-muted-foreground text-sm">
            Busque por documento y ajuste la informacion antes de guardar.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button type="button" size="sm" onClick={handleAddClick}>
              <Plus className="h-4 w-4" />
              Agregar codeudor
            </Button>
          </DialogTrigger>
          <DialogContent ref={dialogContentRef} className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingIndex !== null ? 'Editar codeudor' : 'Agregar codeudor'}
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <Controller
                name="identificationTypeId"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="identificationTypeId">Tipo documento</FieldLabel>
                    <select
                      id="identificationTypeId"
                      className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                      value={field.value ?? ''}
                      onChange={(event) =>
                        field.onChange(event.target.value ? Number(event.target.value) : undefined)
                      }
                      aria-invalid={fieldState.invalid}
                    >
                      <option value="">Seleccione...</option>
                      {identificationTypes.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                    {fieldState.error && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="documentNumber"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="documentNumber">Numero documento</FieldLabel>
                    <Input
                      id="documentNumber"
                      {...field}
                      value={field.value ?? ''}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.error && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <div className="col-span-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSearchByDocument}
                  disabled={isSearching}
                >
                  <Search className="mr-2 h-4 w-4" />
                  {isSearching ? 'Buscando...' : 'Buscar por documento'}
                </Button>
              </div>

              <Controller
                name="homeAddress"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="homeAddress">Direccion hogar</FieldLabel>
                    <Input id="homeAddress" {...field} value={field.value ?? ''} />
                    {fieldState.error && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="homeCityId"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="homeCityId">Ciudad hogar</FieldLabel>
                    <Combobox
                      items={cities}
                      value={findCity(field.value)}
                      onValueChange={(value: City | null) => field.onChange(value?.id ?? undefined)}
                      itemToStringValue={(item: City) => String(item.id)}
                      itemToStringLabel={(item: City) => item.name}
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
                        <ComboboxInput placeholder="Buscar ciudad..." showClear showTrigger={false} />
                        <ComboboxList>
                          <ComboboxEmpty>No se encontraron ciudades</ComboboxEmpty>
                          <ComboboxCollection>
                            {(item: City) => (
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
                name="homePhone"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="homePhone">Telefono hogar</FieldLabel>
                    <Input id="homePhone" {...field} value={field.value ?? ''} />
                    {fieldState.error && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="companyName"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="companyName">Empresa</FieldLabel>
                    <Input id="companyName" {...field} value={field.value ?? ''} />
                    {fieldState.error && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="workAddress"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="workAddress">Direccion trabajo</FieldLabel>
                    <Input id="workAddress" {...field} value={field.value ?? ''} />
                    {fieldState.error && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="workCityId"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="workCityId">Ciudad trabajo</FieldLabel>
                    <Combobox
                      items={cities}
                      value={findCity(field.value)}
                      onValueChange={(value: City | null) => field.onChange(value?.id ?? undefined)}
                      itemToStringValue={(item: City) => String(item.id)}
                      itemToStringLabel={(item: City) => item.name}
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
                        <ComboboxInput placeholder="Buscar ciudad..." showClear showTrigger={false} />
                        <ComboboxList>
                          <ComboboxEmpty>No se encontraron ciudades</ComboboxEmpty>
                          <ComboboxCollection>
                            {(item: City) => (
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
                name="workPhone"
                control={dialogForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="workPhone">Telefono trabajo</FieldLabel>
                    <Input id="workPhone" {...field} value={field.value ?? ''} />
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
                {editingIndex !== null ? 'Guardar cambios' : 'Agregar codeudor'}
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
              <TableHead>Empresa</TableHead>
              <TableHead>Ciudad hogar</TableHead>
              <TableHead>Ciudad trabajo</TableHead>
              <TableHead className="w-30 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field, index) => (
              <TableRow key={field.id}>
                <TableCell>
                  {identificationTypeLabelMap.get(field.identificationTypeId)} {field.documentNumber}
                </TableCell>
                <TableCell>{field.companyName}</TableCell>
                <TableCell>{cityLabelMap.get(field.homeCityId) ?? field.homeCityId}</TableCell>
                <TableCell>{cityLabelMap.get(field.workCityId) ?? field.workCityId}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <Button type="button" variant="ghost" size="icon" onClick={() => handleEditClick(index)}>
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
          No hay codeudores agregados.
        </div>
      )}
    </div>
  );
}
