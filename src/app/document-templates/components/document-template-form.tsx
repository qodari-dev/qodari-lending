'use client';

import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { HtmlTemplateEditor } from '@/components/html-template/html-template-editor';
import { HtmlTemplatePreview } from '@/components/html-template/html-template-preview';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useCreateDocumentTemplate,
  useUpdateDocumentTemplate,
} from '@/hooks/queries/use-document-template-queries';
import {
  CreateDocumentTemplateBodySchema,
  documentContentFormatLabels,
  documentTemplateStatusLabels,
  DOCUMENT_CONTENT_FORMAT_OPTIONS,
  DOCUMENT_TEMPLATE_STATUS_OPTIONS,
  DocumentTemplate,
} from '@/schemas/document-template';
import { DEFAULT_SIGNATURE_TEMPLATE_BODY } from '@/utils/default-signature-template-body';
import { DOCUMENT_TEMPLATE_VARIABLES } from '@/utils/document-template-variables';
import { onSubmitError } from '@/utils/on-submit-error';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useId } from 'react';
import { Controller, FormProvider, type Resolver, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { DocumentTemplateSignerRulesForm } from './document-template-signer-rules-form';

type FormValues = z.infer<typeof CreateDocumentTemplateBodySchema>;

export function DocumentTemplateForm({
  documentTemplate,
  opened,
  onOpened,
}: {
  documentTemplate: DocumentTemplate | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  const formId = useId();

  const form = useForm<FormValues>({
    resolver: zodResolver(CreateDocumentTemplateBodySchema) as Resolver<FormValues>,
    defaultValues: {
      code: '',
      name: '',
      version: 1,
      status: 'DRAFT',
      contentFormat: 'HTML_HBS',
      templateBody: DEFAULT_SIGNATURE_TEMPLATE_BODY,
      templateStorageKey: null,
      templateSignerRules: [],
    },
  });

  useEffect(() => {
    if (opened) {
      form.reset({
        code: documentTemplate?.code ?? '',
        name: documentTemplate?.name ?? '',
        version: documentTemplate?.version ?? 1,
        status: documentTemplate?.status ?? 'DRAFT',
        contentFormat: documentTemplate?.contentFormat ?? 'HTML_HBS',
        templateBody: documentTemplate?.templateBody ?? DEFAULT_SIGNATURE_TEMPLATE_BODY,
        templateStorageKey: documentTemplate?.templateStorageKey ?? null,
        templateSignerRules:
          documentTemplate?.templateSignerRules?.map((rule) => ({
            signerRole: rule.signerRole,
            signOrder: rule.signOrder,
            required: rule.required,
          })) ?? [],
      });
    }
  }, [opened, documentTemplate, form]);

  const { mutateAsync: create, isPending: isCreating } = useCreateDocumentTemplate();
  const { mutateAsync: update, isPending: isUpdating } = useUpdateDocumentTemplate();
  const isLoading = isCreating || isUpdating;

  const contentFormat = useWatch({
    control: form.control,
    name: 'contentFormat',
  });
  const templateBodyPreview = useWatch({
    control: form.control,
    name: 'templateBody',
  });

  const onSubmit = useCallback(
    async (values: FormValues) => {
      const payload: FormValues = {
        ...values,
        code: values.code.trim().toUpperCase(),
        name: values.name.trim(),
        templateBody:
          values.contentFormat === 'HTML_HBS'
            ? (values.templateBody?.trim() ?? '')
            : null,
        templateStorageKey:
          values.contentFormat === 'PDF_STATIC'
            ? (values.templateStorageKey?.trim() ?? null)
            : null,
      };

      if (documentTemplate) {
        await update({ params: { id: documentTemplate.id }, body: payload });
      } else {
        await create({ body: payload });
      }

      onOpened(false);
    },
    [create, update, documentTemplate, onOpened]
  );

  return (
    <Sheet open={opened} onOpenChange={onOpened}>
      <SheetContent className="overflow-y-scroll sm:max-w-4xl">
        <SheetHeader>
          <SheetTitle>{documentTemplate ? 'Editar plantilla de firma' : 'Nueva plantilla de firma'}</SheetTitle>
          <SheetDescription>
            Configure la plantilla documental y el flujo de firmantes.
          </SheetDescription>
        </SheetHeader>

        <FormProvider {...form}>
          <form id={formId} onSubmit={form.handleSubmit(onSubmit, onSubmitError)} className="px-4">
            <Tabs defaultValue="template" className="w-full">
              <TabsList className="mb-4 w-full">
                <TabsTrigger value="template">Plantilla</TabsTrigger>
                <TabsTrigger value="signers">Firmantes</TabsTrigger>
              </TabsList>

              <TabsContent value="template" className="space-y-4 pt-2">
                <FieldGroup className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Controller
                    name="code"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="code">Codigo</FieldLabel>
                        <Input {...field} aria-invalid={fieldState.invalid} placeholder="PAGARE_V1" />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />

                  <Controller
                    name="version"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="version">Version</FieldLabel>
                        <Input
                          id="version"
                          type="number"
                          min={1}
                          value={field.value ?? ''}
                          onChange={(event) => field.onChange(Number(event.target.value) || 1)}
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />

                  <Controller
                    name="name"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid} className="md:col-span-2">
                        <FieldLabel htmlFor="name">Nombre</FieldLabel>
                        <Input
                          {...field}
                          aria-invalid={fieldState.invalid}
                          placeholder="Pagare credito consumo"
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />

                  <Controller
                    name="status"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="status">Estado</FieldLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione..." />
                          </SelectTrigger>
                          <SelectContent>
                            {DOCUMENT_TEMPLATE_STATUS_OPTIONS.map((status) => (
                              <SelectItem key={status} value={status}>
                                {documentTemplateStatusLabels[status]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />

                  <Controller
                    name="contentFormat"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="contentFormat">Formato</FieldLabel>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            if (value === 'HTML_HBS') {
                              form.setValue('templateStorageKey', null);
                            } else {
                              form.setValue('templateBody', null);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione..." />
                          </SelectTrigger>
                          <SelectContent>
                            {DOCUMENT_CONTENT_FORMAT_OPTIONS.map((format) => (
                              <SelectItem key={format} value={format}>
                                {documentContentFormatLabels[format]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />

                  {contentFormat === 'HTML_HBS' ? (
                    <Controller
                      name="templateBody"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="md:col-span-2">
                          <FieldLabel htmlFor="templateBody">Template body</FieldLabel>
                          <HtmlTemplateEditor
                            value={field.value ?? ''}
                            onChange={field.onChange}
                            variables={DOCUMENT_TEMPLATE_VARIABLES}
                            invalid={fieldState.invalid}
                          />
                          <div className="space-y-2 pt-2">
                            <p className="text-muted-foreground text-sm font-medium">
                              Vista previa HTML
                            </p>
                            <HtmlTemplatePreview htmlContent={templateBodyPreview ?? ''} />
                          </div>
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                          <p className="text-muted-foreground text-xs">
                            Tip: use variables en formato <code>{'{{nombre_variable}}'}</code>.
                          </p>
                        </Field>
                      )}
                    />
                  ) : (
                    <Controller
                      name="templateStorageKey"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="md:col-span-2">
                          <FieldLabel htmlFor="templateStorageKey">Ruta PDF estatico</FieldLabel>
                          <Input
                            id="templateStorageKey"
                            value={field.value ?? ''}
                            onChange={(event) => field.onChange(event.target.value || null)}
                            placeholder="templates/firma/pagare-v1.pdf"
                            aria-invalid={fieldState.invalid}
                          />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                  )}
                </FieldGroup>
              </TabsContent>

              <TabsContent value="signers" className="pt-2">
                <DocumentTemplateSignerRulesForm />
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
