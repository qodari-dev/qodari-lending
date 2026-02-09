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
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
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
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAccountingDistributions } from '@/hooks/queries/use-accounting-distribution-queries';
import { useCostCenters } from '@/hooks/queries/use-cost-center-queries';
import {
  useCreateCreditProduct,
  useUpdateCreditProduct,
} from '@/hooks/queries/use-credit-product-queries';
import { useCreditFunds } from '@/hooks/queries/use-credit-fund-queries';
import { AccountingDistribution } from '@/schemas/accounting-distribution';
import { CostCenter } from '@/schemas/cost-center';
import { CreditFund } from '@/schemas/credit-fund';
import {
  CreateCreditProductBodySchema,
  CreditProduct,
  FINANCING_TYPE_OPTIONS,
  financingTypeLabels,
  INSURANCE_RANGE_METRIC_OPTIONS,
  insuranceRangeMetricLabels,
  RISK_EVALUATION_MODE_OPTIONS,
  riskEvaluationModeLabels,
} from '@/schemas/credit-product';
import { onSubmitError } from '@/utils/on-submit-error';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDownIcon } from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useRef } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { z } from 'zod';
import { CreditProductAccountsForm } from './credit-product-accounts-form';
import { CreditProductCategoriesForm } from './credit-product-categories-form';
import { CreditProductRefinancePolicyForm } from './credit-product-refinance-policy-form';
import { CreditProductRequiredDocumentsForm } from './credit-product-required-documents-form';

type FormValues = z.infer<typeof CreateCreditProductBodySchema>;

export function CreditProductForm({
  creditProduct,
  opened,
  onOpened,
}: {
  creditProduct: CreditProduct | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  const formId = useId();
  const sheetContentRef = useRef<HTMLDivElement | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(CreateCreditProductBodySchema),
    defaultValues: {
      name: '',
      creditFundId: undefined,
      paymentAllocationPolicyId: undefined,
      xmlModelId: null,
      financingType: 'FIXED_AMOUNT',
      paysInsurance: false,
      insuranceRangeMetric: 'CREDIT_AMOUNT',
      capitalDistributionId: undefined,
      interestDistributionId: undefined,
      lateInterestDistributionId: undefined,
      reportsToCreditBureau: false,
      maxInstallments: null,
      costCenterId: null,
      riskEvaluationMode: 'NONE',
      riskMinScore: null,
      isActive: true,
      creditProductRefinancePolicy: {
        allowRefinance: false,
        allowConsolidation: false,
        maxLoansToConsolidate: 1,
        minLoanAgeDays: 0,
        maxDaysPastDue: 99999,
        minPaidInstallments: 0,
        maxRefinanceCount: 0,
        capitalizeArrears: false,
        requireApproval: false,
        isActive: false,
      },
      creditProductCategories: [],
      creditProductRequiredDocuments: [],
      creditProductAccounts: [],
    },
  });

  const { data: creditFundsData } = useCreditFunds({
    limit: 500,
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'name', order: 'asc' }],
  });
  const creditFunds = useMemo(() => creditFundsData?.body?.data ?? [], [creditFundsData]);

  const { data: accountingDistributionsData } = useAccountingDistributions({
    limit: 1000,
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'name', order: 'asc' }],
  });
  const accountingDistributions = useMemo(
    () => accountingDistributionsData?.body?.data ?? [],
    [accountingDistributionsData]
  );

  const { data: costCentersData } = useCostCenters({
    limit: 1000,
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'name', order: 'asc' }],
  });
  const costCenters = useMemo(() => costCentersData?.body?.data ?? [], [costCentersData]);

  const findCreditFund = useCallback(
    (id: number | undefined) => creditFunds.find((item) => item.id === id) ?? null,
    [creditFunds]
  );

  const findAccountingDistribution = useCallback(
    (id: number | undefined) => accountingDistributions.find((item) => item.id === id) ?? null,
    [accountingDistributions]
  );

  const findCostCenter = useCallback(
    (id: number | null | undefined) => costCenters.find((item) => item.id === id) ?? null,
    [costCenters]
  );

  useEffect(() => {
    if (opened) {
      const currentDocuments =
        (creditProduct as CreditProduct & {
          creditProductDocuments?: { documentTypeId: number; isRequired: boolean }[];
        } | undefined)?.creditProductDocuments ?? [];

      form.reset({
        name: creditProduct?.name ?? '',
        creditFundId: creditProduct?.creditFundId ?? undefined,
        paymentAllocationPolicyId: creditProduct?.paymentAllocationPolicyId ?? undefined,
        xmlModelId: creditProduct?.xmlModelId ?? null,
        financingType: creditProduct?.financingType ?? 'FIXED_AMOUNT',
        paysInsurance: creditProduct?.paysInsurance ?? false,
        insuranceRangeMetric: creditProduct?.insuranceRangeMetric ?? 'CREDIT_AMOUNT',
        capitalDistributionId: creditProduct?.capitalDistributionId ?? undefined,
        interestDistributionId: creditProduct?.interestDistributionId ?? undefined,
        lateInterestDistributionId: creditProduct?.lateInterestDistributionId ?? undefined,
        reportsToCreditBureau: creditProduct?.reportsToCreditBureau ?? false,
        maxInstallments: creditProduct?.maxInstallments ?? null,
        costCenterId: creditProduct?.costCenterId ?? null,
        riskEvaluationMode: creditProduct?.riskEvaluationMode ?? 'NONE',
        riskMinScore: creditProduct?.riskMinScore ?? null,
        isActive: creditProduct?.isActive ?? true,
        creditProductRefinancePolicy: creditProduct?.creditProductRefinancePolicy
          ? {
              allowRefinance: creditProduct.creditProductRefinancePolicy.allowRefinance,
              allowConsolidation: creditProduct.creditProductRefinancePolicy.allowConsolidation,
              maxLoansToConsolidate:
                creditProduct.creditProductRefinancePolicy.maxLoansToConsolidate,
              minLoanAgeDays: creditProduct.creditProductRefinancePolicy.minLoanAgeDays,
              maxDaysPastDue: creditProduct.creditProductRefinancePolicy.maxDaysPastDue,
              minPaidInstallments: creditProduct.creditProductRefinancePolicy.minPaidInstallments,
              maxRefinanceCount: creditProduct.creditProductRefinancePolicy.maxRefinanceCount,
              capitalizeArrears: creditProduct.creditProductRefinancePolicy.capitalizeArrears,
              requireApproval: creditProduct.creditProductRefinancePolicy.requireApproval,
              isActive: creditProduct.creditProductRefinancePolicy.isActive,
            }
          : {
              allowRefinance: false,
              allowConsolidation: false,
              maxLoansToConsolidate: 1,
              minLoanAgeDays: 0,
              maxDaysPastDue: 99999,
              minPaidInstallments: 0,
              maxRefinanceCount: 0,
              capitalizeArrears: false,
              requireApproval: false,
              isActive: false,
            },
        creditProductCategories:
          creditProduct?.creditProductCategories?.map((category) => ({
            categoryCode: category.categoryCode,
            installmentsFrom: category.installmentsFrom,
            installmentsTo: category.installmentsTo,
            financingFactor: category.financingFactor,
            lateFactor: category.lateFactor,
            pledgeFactor: category.pledgeFactor ?? null,
          })) ?? [],
        creditProductRequiredDocuments: currentDocuments.map((document) => ({
          documentTypeId: document.documentTypeId,
          isRequired: document.isRequired,
        })),
        creditProductAccounts:
          creditProduct?.creditProductAccounts?.map((account) => ({
            capitalGlAccountId: account.capitalGlAccountId,
            interestGlAccountId: account.interestGlAccountId,
            lateInterestGlAccountId: account.lateInterestGlAccountId,
          })) ?? [],
      });
    }
  }, [opened, creditProduct, form]);

  const { mutateAsync: create, isPending: isCreating } = useCreateCreditProduct();
  const { mutateAsync: update, isPending: isUpdating } = useUpdateCreditProduct();

  const isLoading = useMemo(() => isCreating || isUpdating, [isCreating, isUpdating]);

  const onSubmit = useCallback(
    async (values: FormValues) => {
      if (creditProduct) {
        await update({ params: { id: creditProduct.id }, body: values });
      } else {
        await create({ body: values });
      }
      onOpened(false);
    },
    [creditProduct, create, update, onOpened]
  );

  return (
    <Sheet open={opened} onOpenChange={onOpened}>
      <SheetContent ref={sheetContentRef} className="overflow-y-scroll sm:max-w-4xl">
        <SheetHeader>
          <SheetTitle>{creditProduct ? 'Editar Tipo de Credito' : 'Nuevo Tipo de Credito'}</SheetTitle>
          <SheetDescription>
            Configure el producto de credito, categorias, documentos requeridos y cuentas.
          </SheetDescription>
        </SheetHeader>

        <FormProvider {...form}>
          <form id={formId} onSubmit={form.handleSubmit(onSubmit, onSubmitError)} className="px-4">
            <Tabs defaultValue="product" className="w-full">
              <TabsList className="mb-4 w-full">
                <TabsTrigger value="product">Producto</TabsTrigger>
                <TabsTrigger value="categories">Categorias</TabsTrigger>
                <TabsTrigger value="requiredDocuments">Documentos</TabsTrigger>
                <TabsTrigger value="refinancePolicy">Refinanciacion</TabsTrigger>
                <TabsTrigger value="accounts">Cuentas</TabsTrigger>
              </TabsList>

              <TabsContent value="product" className="space-y-4 pt-2">
                <FieldGroup>
                  <div className="grid grid-cols-2 gap-4">
                    <Controller
                      name="name"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="col-span-2">
                          <FieldLabel htmlFor="name">Nombre</FieldLabel>
                          <Input {...field} aria-invalid={fieldState.invalid} />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller
                      name="creditFundId"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="creditFundId">Fondo</FieldLabel>
                          <Combobox
                            items={creditFunds}
                            value={findCreditFund(field.value)}
                            onValueChange={(value: CreditFund | null) => field.onChange(value?.id ?? undefined)}
                            itemToStringValue={(item: CreditFund) => String(item.id)}
                            itemToStringLabel={(item: CreditFund) => item.name}
                          >
                            <ComboboxTrigger
                              render={
                                <Button type="button" variant="outline" className="w-full justify-between font-normal">
                                  <ComboboxValue placeholder="Seleccione..." />
                                  <ChevronDownIcon className="text-muted-foreground size-4" />
                                </Button>
                              }
                            />
                            <ComboboxContent portalContainer={sheetContentRef}>
                              <ComboboxInput placeholder="Buscar fondo..." showClear showTrigger={false} />
                              <ComboboxList>
                                <ComboboxEmpty>No se encontraron fondos</ComboboxEmpty>
                                <ComboboxCollection>
                                  {(item: CreditFund) => (
                                    <ComboboxItem key={item.id} value={item}>
                                      {item.name}
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
                      name="paymentAllocationPolicyId"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="paymentAllocationPolicyId">Politica de aplicacion (ID)</FieldLabel>
                          <Input
                            id="paymentAllocationPolicyId"
                            type="number"
                            value={field.value ?? ''}
                            onChange={(event) =>
                              field.onChange(
                                event.target.value ? Number(event.target.value) : undefined
                              )
                            }
                            aria-invalid={fieldState.invalid}
                          />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller
                      name="xmlModelId"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="xmlModelId">Modelo XML (ID)</FieldLabel>
                          <Input
                            id="xmlModelId"
                            type="number"
                            value={field.value ?? ''}
                            onChange={(event) =>
                              field.onChange(event.target.value ? Number(event.target.value) : null)
                            }
                            aria-invalid={fieldState.invalid}
                          />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller
                      name="financingType"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="financingType">Tipo financiacion</FieldLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {FINANCING_TYPE_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {financingTypeLabels[option]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller
                      name="insuranceRangeMetric"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="insuranceRangeMetric">Metrica seguro</FieldLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {INSURANCE_RANGE_METRIC_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {insuranceRangeMetricLabels[option]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller
                      name="capitalDistributionId"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="capitalDistributionId">Distribucion capital</FieldLabel>
                          <Combobox
                            items={accountingDistributions}
                            value={findAccountingDistribution(field.value)}
                            onValueChange={(value: AccountingDistribution | null) =>
                              field.onChange(value?.id ?? undefined)
                            }
                            itemToStringValue={(item: AccountingDistribution) => String(item.id)}
                            itemToStringLabel={(item: AccountingDistribution) => item.name}
                          >
                            <ComboboxTrigger
                              render={
                                <Button type="button" variant="outline" className="w-full justify-between font-normal">
                                  <ComboboxValue placeholder="Seleccione..." />
                                  <ChevronDownIcon className="text-muted-foreground size-4" />
                                </Button>
                              }
                            />
                            <ComboboxContent portalContainer={sheetContentRef}>
                              <ComboboxInput placeholder="Buscar distribucion..." showClear showTrigger={false} />
                              <ComboboxList>
                                <ComboboxEmpty>No se encontraron distribuciones</ComboboxEmpty>
                                <ComboboxCollection>
                                  {(item: AccountingDistribution) => (
                                    <ComboboxItem key={item.id} value={item}>
                                      {item.name}
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
                      name="interestDistributionId"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="interestDistributionId">Distribucion interes</FieldLabel>
                          <Combobox
                            items={accountingDistributions}
                            value={findAccountingDistribution(field.value)}
                            onValueChange={(value: AccountingDistribution | null) =>
                              field.onChange(value?.id ?? undefined)
                            }
                            itemToStringValue={(item: AccountingDistribution) => String(item.id)}
                            itemToStringLabel={(item: AccountingDistribution) => item.name}
                          >
                            <ComboboxTrigger
                              render={
                                <Button type="button" variant="outline" className="w-full justify-between font-normal">
                                  <ComboboxValue placeholder="Seleccione..." />
                                  <ChevronDownIcon className="text-muted-foreground size-4" />
                                </Button>
                              }
                            />
                            <ComboboxContent portalContainer={sheetContentRef}>
                              <ComboboxInput placeholder="Buscar distribucion..." showClear showTrigger={false} />
                              <ComboboxList>
                                <ComboboxEmpty>No se encontraron distribuciones</ComboboxEmpty>
                                <ComboboxCollection>
                                  {(item: AccountingDistribution) => (
                                    <ComboboxItem key={item.id} value={item}>
                                      {item.name}
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
                      name="lateInterestDistributionId"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="lateInterestDistributionId">Distribucion mora</FieldLabel>
                          <Combobox
                            items={accountingDistributions}
                            value={findAccountingDistribution(field.value)}
                            onValueChange={(value: AccountingDistribution | null) =>
                              field.onChange(value?.id ?? undefined)
                            }
                            itemToStringValue={(item: AccountingDistribution) => String(item.id)}
                            itemToStringLabel={(item: AccountingDistribution) => item.name}
                          >
                            <ComboboxTrigger
                              render={
                                <Button type="button" variant="outline" className="w-full justify-between font-normal">
                                  <ComboboxValue placeholder="Seleccione..." />
                                  <ChevronDownIcon className="text-muted-foreground size-4" />
                                </Button>
                              }
                            />
                            <ComboboxContent portalContainer={sheetContentRef}>
                              <ComboboxInput placeholder="Buscar distribucion..." showClear showTrigger={false} />
                              <ComboboxList>
                                <ComboboxEmpty>No se encontraron distribuciones</ComboboxEmpty>
                                <ComboboxCollection>
                                  {(item: AccountingDistribution) => (
                                    <ComboboxItem key={item.id} value={item}>
                                      {item.name}
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
                      name="maxInstallments"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="maxInstallments">Maximo cuotas</FieldLabel>
                          <Input
                            id="maxInstallments"
                            type="number"
                            min={1}
                            value={field.value ?? ''}
                            onChange={(event) =>
                              field.onChange(event.target.value ? Number(event.target.value) : null)
                            }
                            aria-invalid={fieldState.invalid}
                          />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller
                      name="costCenterId"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="costCenterId">Centro costo</FieldLabel>
                          <Combobox
                            items={costCenters}
                            value={findCostCenter(field.value)}
                            onValueChange={(value: CostCenter | null) => field.onChange(value?.id ?? null)}
                            itemToStringValue={(item: CostCenter) => String(item.id)}
                            itemToStringLabel={(item: CostCenter) => `${item.code} - ${item.name}`}
                          >
                            <ComboboxTrigger
                              render={
                                <Button type="button" variant="outline" className="w-full justify-between font-normal">
                                  <ComboboxValue placeholder="Seleccione..." />
                                  <ChevronDownIcon className="text-muted-foreground size-4" />
                                </Button>
                              }
                            />
                            <ComboboxContent portalContainer={sheetContentRef}>
                              <ComboboxInput placeholder="Buscar centro..." showClear showTrigger={false} />
                              <ComboboxList>
                                <ComboboxEmpty>No se encontraron centros</ComboboxEmpty>
                                <ComboboxCollection>
                                  {(item: CostCenter) => (
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
                      name="riskEvaluationMode"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="riskEvaluationMode">Modo riesgo</FieldLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {RISK_EVALUATION_MODE_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {riskEvaluationModeLabels[option]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller
                      name="riskMinScore"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="riskMinScore">Score minimo riesgo</FieldLabel>
                          <Input
                            id="riskMinScore"
                            value={field.value ?? ''}
                            onChange={(event) => field.onChange(event.target.value || null)}
                            aria-invalid={fieldState.invalid}
                          />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <Controller
                      name="paysInsurance"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="paysInsurance">Paga seguro?</FieldLabel>
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

                    <Controller
                      name="reportsToCreditBureau"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="reportsToCreditBureau">Reporta centrales?</FieldLabel>
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
                  </div>
                </FieldGroup>
              </TabsContent>

              <TabsContent value="categories" className="pt-2">
                <CreditProductCategoriesForm />
              </TabsContent>

              <TabsContent value="requiredDocuments" className="pt-2">
                <CreditProductRequiredDocumentsForm />
              </TabsContent>

              <TabsContent value="refinancePolicy" className="pt-2">
                <CreditProductRefinancePolicyForm />
              </TabsContent>

              <TabsContent value="accounts" className="pt-2">
                <CreditProductAccountsForm />
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
