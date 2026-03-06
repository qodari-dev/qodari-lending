'use client';

import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { HtmlTemplateEditor } from '@/components/html-template/html-template-editor';
import { HtmlTemplatePreview } from '@/components/html-template/html-template-preview';
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
  useCreateBillingEmailTemplate,
  useUpdateBillingEmailTemplate,
} from '@/hooks/queries/use-billing-email-template-queries';
import { BillingEmailTemplate, CreateBillingEmailTemplateBodySchema } from '@/schemas/billing-email-template';
import { BILLING_EMAIL_TEMPLATE_VARIABLES } from '@/utils/billing-email-template-variables';
import { onSubmitError } from '@/utils/on-submit-error';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useId } from 'react';
import { Controller, FormProvider, type Resolver, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

type FormValues = z.infer<typeof CreateBillingEmailTemplateBodySchema>;

function variableToken(variable: string) {
  return `{{${variable}}}`;
}

export function BillingEmailTemplateForm({
  billingEmailTemplate,
  opened,
  onOpened,
}: {
  billingEmailTemplate: BillingEmailTemplate | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  const formId = useId();

  const form = useForm<FormValues>({
    resolver: zodResolver(CreateBillingEmailTemplateBodySchema) as Resolver<FormValues>,
    defaultValues: {
      name: '',
      fromEmail: '',
      subject: '',
      htmlContent: '',
      isActive: true,
    },
  });

  useEffect(() => {
    if (opened) {
      form.reset({
        name: billingEmailTemplate?.name ?? '',
        fromEmail: billingEmailTemplate?.fromEmail ?? '',
        subject: billingEmailTemplate?.subject ?? '',
        htmlContent: billingEmailTemplate?.htmlContent ?? '',
        isActive: billingEmailTemplate?.isActive ?? true,
      });
    }
  }, [opened, billingEmailTemplate, form]);

  const { mutateAsync: create, isPending: isCreating } = useCreateBillingEmailTemplate();
  const { mutateAsync: update, isPending: isUpdating } = useUpdateBillingEmailTemplate();

  const isLoading = isCreating || isUpdating;
  const htmlPreview = useWatch({ control: form.control, name: 'htmlContent' });

  const onSubmit = useCallback(
    async (values: FormValues) => {
      const payload = {
        ...values,
        name: values.name.trim(),
        fromEmail: values.fromEmail.trim().toLowerCase(),
        subject: values.subject.trim(),
        htmlContent: values.htmlContent.trim(),
      };

      if (billingEmailTemplate) {
        await update({ params: { id: billingEmailTemplate.id }, body: payload });
      } else {
        await create({ body: payload });
      }

      onOpened(false);
    },
    [billingEmailTemplate, create, onOpened, update]
  );

  return (
    <Sheet open={opened} onOpenChange={onOpened}>
      <SheetContent className="overflow-y-scroll sm:max-w-4xl">
        <SheetHeader>
          <SheetTitle>{billingEmailTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'}</SheetTitle>
          <SheetDescription>
            Defina asunto y contenido HTML para envio por convenio.
          </SheetDescription>
        </SheetHeader>
        <FormProvider {...form}>
          <form id={formId} onSubmit={form.handleSubmit(onSubmit, onSubmitError)} className="px-4">
            <FieldGroup>
              <div className="grid gap-4 md:grid-cols-2">
                <Controller
                  name="name"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="name">Nombre</FieldLabel>
                      <Input {...field} maxLength={120} aria-invalid={fieldState.invalid} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  name="fromEmail"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="fromEmail">From</FieldLabel>
                      <Input
                        {...field}
                        maxLength={255}
                        aria-invalid={fieldState.invalid}
                        placeholder="facturacion@dominio.com"
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              <Controller
                name="subject"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="subject">Asunto</FieldLabel>
                    <Input {...field} maxLength={255} aria-invalid={fieldState.invalid} />
                    <div className="flex flex-wrap gap-1">
                      {BILLING_EMAIL_TEMPLATE_VARIABLES.map((variable) => (
                        <Button
                          key={`subject-${variable}`}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7"
                          onClick={() => field.onChange(`${field.value ?? ''}${variableToken(variable)}`)}
                        >
                          {variableToken(variable)}
                        </Button>
                      ))}
                    </div>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="htmlContent"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="htmlContent">Contenido HTML</FieldLabel>
                    <HtmlTemplateEditor
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      variables={BILLING_EMAIL_TEMPLATE_VARIABLES}
                      invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <div className="grid gap-4 md:grid-cols-1">
                <Controller
                  name="isActive"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="isActive">Activa?</FieldLabel>
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
              </div>

              <div className="space-y-2">
                <p className="text-muted-foreground text-sm font-medium">Vista previa HTML</p>
                <HtmlTemplatePreview htmlContent={htmlPreview ?? ''} />
              </div>
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
