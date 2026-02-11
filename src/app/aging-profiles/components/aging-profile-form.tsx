'use client';

import { Button } from '@/components/ui/button';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useCreateAgingProfile,
  useUpdateAgingProfile,
} from '@/hooks/queries/use-aging-profile-queries';
import { AgingProfile, CreateAgingProfileBodySchema } from '@/schemas/aging-profile';
import { onSubmitError } from '@/utils/on-submit-error';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useId, useMemo } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { z } from 'zod';
import { AgingProfileBucketsForm } from './aging-profile-buckets-form';

type FormValues = z.infer<typeof CreateAgingProfileBodySchema>;

export function AgingProfileForm({
  agingProfile,
  opened,
  onOpened,
}: {
  agingProfile: AgingProfile | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  const formId = useId();

  const form = useForm<FormValues>({
    resolver: zodResolver(CreateAgingProfileBodySchema),
    defaultValues: {
      name: '',
      note: null,
      isActive: true,
      agingBuckets: [],
    },
  });

  useEffect(() => {
    if (opened) {
      form.reset({
        name: agingProfile?.name ?? '',
        note: agingProfile?.note ?? null,
        isActive: agingProfile?.isActive ?? true,
        agingBuckets:
          agingProfile?.agingBuckets?.map((bucket) => ({
            sortOrder: bucket.sortOrder,
            name: bucket.name,
            daysFrom: bucket.daysFrom,
            daysTo: bucket.daysTo ?? null,
            provisionRate: bucket.provisionRate ?? null,
            isActive: bucket.isActive,
          })) ?? [],
      });
    }
  }, [opened, agingProfile, form]);

  const { mutateAsync: create, isPending: isCreating } = useCreateAgingProfile();
  const { mutateAsync: update, isPending: isUpdating } = useUpdateAgingProfile();

  const isLoading = useMemo(() => isCreating || isUpdating, [isCreating, isUpdating]);

  const onSubmit = useCallback(
    async (values: FormValues) => {
      if (agingProfile) {
        await update({ params: { id: agingProfile.id }, body: values });
      } else {
        await create({ body: values });
      }
      onOpened(false);
    },
    [agingProfile, create, update, onOpened]
  );

  return (
    <Sheet open={opened} onOpenChange={onOpened}>
      <SheetContent className="overflow-y-scroll sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>
            {agingProfile ? 'Editar Edades de Cartera' : 'Nuevo Edades de Cartera'}
          </SheetTitle>
          <SheetDescription>
            Define los parametros del perfil de aging y sus buckets.
          </SheetDescription>
        </SheetHeader>
        <FormProvider {...form}>
          <form id={formId} onSubmit={form.handleSubmit(onSubmit, onSubmitError)} className="px-4">
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="mb-4 w-full">
                <TabsTrigger value="profile">Perfil</TabsTrigger>
                <TabsTrigger value="buckets">Buckets</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-4 pt-2">
                <FieldGroup>
                  <Controller
                    name="name"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="name">Nombre</FieldLabel>
                        <Input {...field} aria-invalid={fieldState.invalid} />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                  <Controller
                    name="note"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="note">Nota</FieldLabel>
                        <Input
                          {...field}
                          value={field.value ?? ''}
                          onChange={(event) => field.onChange(event.target.value || null)}
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
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
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                </FieldGroup>
              </TabsContent>

              <TabsContent value="buckets" className="pt-2">
                <AgingProfileBucketsForm />
              </TabsContent>
            </Tabs>
          </form>
        </FormProvider>

        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline" type="button">
              Cancelar
            </Button>
          </SheetClose>
          <Button type="submit" form={formId} disabled={isLoading}>
            {isLoading && <Spinner />}
            Guardar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
