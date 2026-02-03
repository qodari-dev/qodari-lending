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
import {
  useCreateThirdPartyType,
  useUpdateThirdPartyType,
} from '@/hooks/queries/use-third-party-type-queries';
import { CreateThirdPartyTypeBodySchema, ThirdPartyType } from '@/schemas/third-party-type';
import { onSubmitError } from '@/utils/on-submit-error';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useId, useMemo } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { z } from 'zod';

type FormValues = z.infer<typeof CreateThirdPartyTypeBodySchema>;

export function ThirdPartyTypeForm({
  thirdPartyType,
  opened,
  onOpened,
}: {
  thirdPartyType: ThirdPartyType | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  const formId = useId();

  const form = useForm<FormValues>({
    resolver: zodResolver(CreateThirdPartyTypeBodySchema),
    defaultValues: {
      name: '',
    },
  });

  useEffect(() => {
    if (opened) {
      form.reset({
        name: thirdPartyType?.name ?? '',
      });
    }
  }, [opened, thirdPartyType, form]);

  const { mutateAsync: create, isPending: isCreating } = useCreateThirdPartyType();
  const { mutateAsync: update, isPending: isUpdating } = useUpdateThirdPartyType();

  const isLoading = useMemo(() => isCreating || isUpdating, [isCreating, isUpdating]);

  const onSubmit = useCallback(
    async (values: FormValues) => {
      if (thirdPartyType) {
        await update({ params: { id: thirdPartyType.id }, body: values });
      } else {
        await create({ body: values });
      }
      onOpened(false);
    },
    [thirdPartyType, create, update, onOpened]
  );

  return (
    <Sheet open={opened} onOpenChange={onOpened}>
      <SheetContent className="overflow-y-scroll sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Tipo de Tercero</SheetTitle>
          <SheetDescription>
            Maneja los diferentes tipos de terceros para clasificar personas o empresas.
          </SheetDescription>
        </SheetHeader>
        <FormProvider {...form}>
          <form id={formId} onSubmit={form.handleSubmit(onSubmit, onSubmitError)} className="px-4">
            <FieldGroup className="">
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
            </FieldGroup>
          </form>
        </FormProvider>

        <SheetFooter>
          <Button type="submit" form={formId} disabled={isLoading}>
            {isLoading && <Spinner />}
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
