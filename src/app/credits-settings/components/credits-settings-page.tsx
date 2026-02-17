'use client';

import * as React from 'react';
import { PageContent, PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useCreditsSettings,
  useUpdateCreditsSettings,
} from '@/hooks/queries/use-credits-settings-queries';
import { useGlAccounts } from '@/hooks/queries/use-gl-account-queries';
import { UpdateCreditsSettingsBodySchema } from '@/schemas/credits-settings';
import type { GlAccount } from '@/schemas/gl-account';
import { useHasPermission } from '@/stores/auth-store-provider';
import { onSubmitError } from '@/utils/on-submit-error';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDownIcon } from 'lucide-react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { RefreshCw, Save } from 'lucide-react';

type FormValues = z.infer<typeof UpdateCreditsSettingsBodySchema>;

export function CreditsSettingsPage() {
  const canUpdate = useHasPermission('credits-settings:update');

  // Fetch settings with includes
  const {
    data: settingsData,
    isLoading,
    refetch,
    isFetching,
  } = useCreditsSettings({
    include: [
      'cashGlAccount',
      'majorGlAccount',
      'excessGlAccount',
      'pledgeSubsidyGlAccount',
      'writeOffGlAccount',
    ],
  });

  // Fetch GL accounts for selects
  const { data: glAccountsData, isLoading: isLoadingGlAccounts } = useGlAccounts({ limit: 500 });

  const glAccounts = React.useMemo(() => glAccountsData?.body?.data ?? [], [glAccountsData]);
  const settings = settingsData?.body;
  const findGlAccount = React.useCallback(
    (id: number | null | undefined) => glAccounts.find((item) => item.id === id) ?? null,
    [glAccounts]
  );

  const isLoadingSelects = isLoadingGlAccounts;
  const [isFormReady, setIsFormReady] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(UpdateCreditsSettingsBodySchema),
  });

  // Reset form when all data is loaded
  React.useEffect(() => {
    if (settings && !isLoadingSelects) {
      form.reset({
        auditTransactionsEnabled: settings.auditTransactionsEnabled ?? false,
        accountingSystemCode: settings.accountingSystemCode ?? '',
        postAccountingOnline: settings.postAccountingOnline ?? false,
        subsidyEnabled: settings.subsidyEnabled ?? false,
        accountingEnabled: settings.accountingEnabled ?? true,
        minDaysBeforeFirstCollection: settings.minDaysBeforeFirstCollection ?? 7,
        cashGlAccountId: settings.cashGlAccountId ?? undefined,
        majorGlAccountId: settings.majorGlAccountId ?? undefined,
        minimumMajorPaidAmount: settings.minimumMajorPaidAmount ?? null,
        excessGlAccountId: settings.excessGlAccountId ?? undefined,
        pledgeSubsidyGlAccountId: settings.pledgeSubsidyGlAccountId ?? undefined,
        writeOffGlAccountId: settings.writeOffGlAccountId ?? undefined,
        creditManagerName: settings.creditManagerName ?? '',
        creditManagerTitle: settings.creditManagerTitle ?? '',
        adminManagerName: settings.adminManagerName ?? '',
        adminManagerTitle: settings.adminManagerTitle ?? '',
        legalAdvisorName: settings.legalAdvisorName ?? '',
        legalAdvisorTitle: settings.legalAdvisorTitle ?? '',
        adminDirectorName: settings.adminDirectorName ?? '',
        adminDirectorTitle: settings.adminDirectorTitle ?? '',
        financeManagerName: settings.financeManagerName ?? '',
        financeManagerTitle: settings.financeManagerTitle ?? '',
      });
      setIsFormReady(true);
    }
  }, [settings, isLoadingSelects, form]);

  const { mutateAsync: updateSettings, isPending: isUpdating } = useUpdateCreditsSettings();

  const onSubmit = React.useCallback(
    async (values: FormValues) => {
      try {
        await updateSettings({ body: values });
        toast.success('Configuración actualizada correctamente');
      } catch (_error) {
        toast.error('Error al actualizar la configuración');
      }
    },
    [updateSettings]
  );

  if (isLoading || isLoadingSelects || !isFormReady) {
    return (
      <>
        <PageHeader
          title="Configuración de Créditos"
          description="Configure los parámetros globales del módulo de créditos."
        />
        <PageContent>
          <div className="space-y-6">
            <Skeleton className="h-50 w-full" />
            <Skeleton className="h-50 w-full" />
            <Skeleton className="h-50 w-full" />
          </div>
        </PageContent>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Configuración de Créditos"
        description="Configure los parámetros globales del módulo de créditos."
      />
      <PageContent>
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, onSubmitError)} className="space-y-6">
            {/* Actions Bar */}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                Recargar
              </Button>
              {canUpdate && (
                <Button type="submit" size="sm" disabled={isUpdating}>
                  {isUpdating && <Spinner className="mr-2" />}
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Cambios
                </Button>
              )}
            </div>

            {/* Configuración General */}
            <Card>
              <CardHeader>
                <CardTitle>Configuración General</CardTitle>
                <CardDescription>Parámetros generales del módulo de créditos.</CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Controller
                      name="accountingSystemCode"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel>Código Sistema Contable</FieldLabel>
                          <Input
                            {...field}
                            value={field.value ?? ''}
                            maxLength={2}
                            disabled={!canUpdate}
                          />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                    <Controller
                      name="minDaysBeforeFirstCollection"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel>Días min. primer recaudo</FieldLabel>
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            value={field.value ?? 7}
                            onChange={(event) =>
                              field.onChange(
                                event.target.value === ''
                                  ? undefined
                                  : Number.parseInt(event.target.value, 10)
                              )
                            }
                            disabled={!canUpdate}
                          />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Controller
                      name="auditTransactionsEnabled"
                      control={form.control}
                      render={({ field }) => (
                        <Field>
                          <FieldLabel>Auditar Transacciones</FieldLabel>
                          <div className="pt-2">
                            <Switch
                              checked={field.value ?? false}
                              onCheckedChange={field.onChange}
                              disabled={!canUpdate}
                            />
                          </div>
                        </Field>
                      )}
                    />
                    <Controller
                      name="postAccountingOnline"
                      control={form.control}
                      render={({ field }) => (
                        <Field>
                          <FieldLabel>Contabilizar en Línea</FieldLabel>
                          <div className="pt-2">
                            <Switch
                              checked={field.value ?? false}
                              onCheckedChange={field.onChange}
                              disabled={!canUpdate}
                            />
                          </div>
                        </Field>
                      )}
                    />
                    <Controller
                      name="subsidyEnabled"
                      control={form.control}
                      render={({ field }) => (
                        <Field>
                          <FieldLabel>Subsidio Habilitado</FieldLabel>
                          <div className="pt-2">
                            <Switch
                              checked={field.value ?? false}
                              onCheckedChange={field.onChange}
                              disabled={!canUpdate}
                            />
                          </div>
                        </Field>
                      )}
                    />
                    <Controller
                      name="accountingEnabled"
                      control={form.control}
                      render={({ field }) => (
                        <Field>
                          <FieldLabel>Contabilidad Habilitada</FieldLabel>
                          <div className="pt-2">
                            <Switch
                              checked={field.value ?? false}
                              onCheckedChange={field.onChange}
                              disabled={!canUpdate}
                            />
                          </div>
                        </Field>
                      )}
                    />
                  </div>
                </FieldGroup>
              </CardContent>
            </Card>

            {/* Cuentas Contables */}
            <Card>
              <CardHeader>
                <CardTitle>Cuentas Contables</CardTitle>
                <CardDescription>
                  Auxiliares contables por defecto para operaciones del módulo.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Controller
                      name="cashGlAccountId"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel>Cuenta Caja</FieldLabel>
                          <Combobox
                            items={glAccounts}
                            value={findGlAccount(field.value)}
                            onValueChange={(value: GlAccount | null) =>
                              field.onChange(value?.id ?? null)
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
                                  disabled={!canUpdate}
                                >
                                  <ComboboxValue placeholder="Seleccione..." />
                                  <ChevronDownIcon className="text-muted-foreground size-4" />
                                </Button>
                              }
                            />
                            <ComboboxContent>
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
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                    <Controller
                      name="majorGlAccountId"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel>Cuenta Valor Mayor Pagado</FieldLabel>
                          <Combobox
                            items={glAccounts}
                            value={findGlAccount(field.value)}
                            onValueChange={(value: GlAccount | null) =>
                              field.onChange(value?.id ?? null)
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
                                  disabled={!canUpdate}
                                >
                                  <ComboboxValue placeholder="Seleccione..." />
                                  <ChevronDownIcon className="text-muted-foreground size-4" />
                                </Button>
                              }
                            />
                            <ComboboxContent>
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
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                    <Controller
                      name="minimumMajorPaidAmount"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel>Mínimo Valor Mayor Pagado</FieldLabel>
                          <Input
                            type="number"
                            step="0.01"
                            inputMode="decimal"
                            value={field.value ?? ''}
                            onChange={(event) =>
                              field.onChange(event.target.value ? event.target.value : null)
                            }
                            disabled={!canUpdate}
                          />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                    <Controller
                      name="excessGlAccountId"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel>Cuenta Excedente</FieldLabel>
                          <Combobox
                            items={glAccounts}
                            value={findGlAccount(field.value)}
                            onValueChange={(value: GlAccount | null) =>
                              field.onChange(value?.id ?? null)
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
                                  disabled={!canUpdate}
                                >
                                  <ComboboxValue placeholder="Seleccione..." />
                                  <ChevronDownIcon className="text-muted-foreground size-4" />
                                </Button>
                              }
                            />
                            <ComboboxContent>
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
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                    <Controller
                      name="pledgeSubsidyGlAccountId"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel>Cuenta Subsidio Pignoración</FieldLabel>
                          <Combobox
                            items={glAccounts}
                            value={findGlAccount(field.value)}
                            onValueChange={(value: GlAccount | null) =>
                              field.onChange(value?.id ?? null)
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
                                  disabled={!canUpdate}
                                >
                                  <ComboboxValue placeholder="Seleccione..." />
                                  <ChevronDownIcon className="text-muted-foreground size-4" />
                                </Button>
                              }
                            />
                            <ComboboxContent>
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
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                    <Controller
                      name="writeOffGlAccountId"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel>Cuenta Castigo Cartera</FieldLabel>
                          <Combobox
                            items={glAccounts}
                            value={findGlAccount(field.value)}
                            onValueChange={(value: GlAccount | null) =>
                              field.onChange(value?.id ?? null)
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
                                  disabled={!canUpdate}
                                >
                                  <ComboboxValue placeholder="Seleccione..." />
                                  <ChevronDownIcon className="text-muted-foreground size-4" />
                                </Button>
                              }
                            />
                            <ComboboxContent>
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
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                  </div>
                </FieldGroup>
              </CardContent>
            </Card>

            {/* Firmas y Cargos */}
            <Card>
              <CardHeader>
                <CardTitle>Firmas y Cargos</CardTitle>
                <CardDescription>
                  Nombres y cargos para documentos del módulo de créditos.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  {/* Gerente de Crédito */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Controller
                      name="creditManagerName"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel>Nombre Gerente de Crédito</FieldLabel>
                          <Input {...field} value={field.value ?? ''} disabled={!canUpdate} />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                    <Controller
                      name="creditManagerTitle"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel>Cargo Gerente de Crédito</FieldLabel>
                          <Input {...field} value={field.value ?? ''} disabled={!canUpdate} />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                  </div>

                  {/* Gerente Administrativo */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Controller
                      name="adminManagerName"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel>Nombre Gerente Administrativo</FieldLabel>
                          <Input {...field} value={field.value ?? ''} disabled={!canUpdate} />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                    <Controller
                      name="adminManagerTitle"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel>Cargo Gerente Administrativo</FieldLabel>
                          <Input {...field} value={field.value ?? ''} disabled={!canUpdate} />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                  </div>

                  {/* Asesor Legal */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Controller
                      name="legalAdvisorName"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel>Nombre Asesor Legal</FieldLabel>
                          <Input {...field} value={field.value ?? ''} disabled={!canUpdate} />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                    <Controller
                      name="legalAdvisorTitle"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel>Cargo Asesor Legal</FieldLabel>
                          <Input {...field} value={field.value ?? ''} disabled={!canUpdate} />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                  </div>

                  {/* Director Administrativo */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Controller
                      name="adminDirectorName"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel>Nombre Director Administrativo</FieldLabel>
                          <Input {...field} value={field.value ?? ''} disabled={!canUpdate} />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                    <Controller
                      name="adminDirectorTitle"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel>Cargo Director Administrativo</FieldLabel>
                          <Input {...field} value={field.value ?? ''} disabled={!canUpdate} />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                  </div>

                  {/* Gerente Financiero */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Controller
                      name="financeManagerName"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel>Nombre Gerente Financiero</FieldLabel>
                          <Input {...field} value={field.value ?? ''} disabled={!canUpdate} />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                    <Controller
                      name="financeManagerTitle"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel>Cargo Gerente Financiero</FieldLabel>
                          <Input {...field} value={field.value ?? ''} disabled={!canUpdate} />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                  </div>
                </FieldGroup>
              </CardContent>
            </Card>
          </form>
        </FormProvider>
      </PageContent>
    </>
  );
}
