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
import { usePaymentAllocationPolicies } from '@/hooks/queries/use-payment-allocation-policy-queries';
import { AccountingDistribution } from '@/schemas/accounting-distribution';
import { CostCenter } from '@/schemas/cost-center';
import { CreditFund } from '@/schemas/credit-fund';
import { PaymentAllocationPolicy } from '@/schemas/payment-allocation-policy';
import {
  CreateCreditProductBodySchema,
  CreditProduct,
  DAY_COUNT_CONVENTION_OPTIONS,
  dayCountConventionLabels,
  FINANCING_TYPE_OPTIONS,
  financingTypeLabels,
  INSURANCE_ACCRUAL_METHOD_OPTIONS,
  insuranceAccrualMethodLabels,
  INSURANCE_RANGE_METRIC_OPTIONS,
  insuranceRangeMetricLabels,
  INTEREST_ACCRUAL_METHOD_OPTIONS,
  interestAccrualMethodLabels,
  LATE_INTEREST_AGE_BASIS_OPTIONS,
  lateInterestAgeBasisLabels,
  INTEREST_RATE_TYPE_OPTIONS,
  interestRateTypeLabels,
  RISK_EVALUATION_MODE_OPTIONS,
  riskEvaluationModeLabels,
} from '@/schemas/credit-product';
import { onSubmitError } from '@/utils/on-submit-error';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDownIcon } from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useRef } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { CreditProductAccountsForm } from './credit-product-accounts-form';
import { CreditProductBillingConceptsForm } from './credit-product-billing-concepts-form';
import { CreditProductCategoriesForm } from './credit-product-categories-form';
import { CreditProductChargeOffPolicyForm } from './credit-product-charge-off-policy-form';
import { CreditProductLateInterestRulesForm } from './credit-product-late-interest-rules-form';
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
      ageBasis: 'OLDEST_OVERDUE_INSTALLMENT',
      interestRateType: 'EFFECTIVE_ANNUAL',
      interestAccrualMethod: 'DAILY',
      interestDayCountConvention: 'ACTUAL_360',
      lateInterestRateType: 'EFFECTIVE_ANNUAL',
      lateInterestAccrualMethod: 'DAILY',
      lateInterestDayCountConvention: 'ACTUAL_360',
      insuranceAccrualMethod: 'PER_INSTALLMENT',
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
      creditProductChargeOffPolicy: {
        allowChargeOff: false,
        minDaysPastDue: 180,
      },
      creditProductCategories: [],
      creditProductLateInterestRules: [],
      creditProductRequiredDocuments: [],
      creditProductAccounts: [],
      creditProductBillingConcepts: [],
    },
  });

  const paysInsurance = useWatch({
    control: form.control,
    name: 'paysInsurance',
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

  const { data: paymentAllocationPoliciesData } = usePaymentAllocationPolicies({
    limit: 1000,
    sort: [{ field: 'name', order: 'asc' }],
  });
  const paymentAllocationPolicies = useMemo(
    () => paymentAllocationPoliciesData?.body?.data ?? [],
    [paymentAllocationPoliciesData]
  );

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

  const findPaymentAllocationPolicy = useCallback(
    (id: number | undefined) => paymentAllocationPolicies.find((item) => item.id === id) ?? null,
    [paymentAllocationPolicies]
  );

  useEffect(() => {
    if (opened) {
      const currentDocuments =
        (
          creditProduct as
            | (CreditProduct & {
                creditProductDocuments?: { documentTypeId: number; isRequired: boolean }[];
              })
            | undefined
        )?.creditProductDocuments ?? [];

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
        ageBasis: creditProduct?.ageBasis ?? 'OLDEST_OVERDUE_INSTALLMENT',
        interestRateType: creditProduct?.interestRateType ?? 'EFFECTIVE_ANNUAL',
        interestAccrualMethod: creditProduct?.interestAccrualMethod ?? 'DAILY',
        interestDayCountConvention: creditProduct?.interestDayCountConvention ?? 'ACTUAL_360',
        lateInterestRateType: creditProduct?.lateInterestRateType ?? 'EFFECTIVE_ANNUAL',
        lateInterestAccrualMethod: creditProduct?.lateInterestAccrualMethod ?? 'DAILY',
        lateInterestDayCountConvention:
          creditProduct?.lateInterestDayCountConvention ?? 'ACTUAL_360',
        insuranceAccrualMethod: creditProduct?.insuranceAccrualMethod ?? 'PER_INSTALLMENT',
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
        creditProductChargeOffPolicy: creditProduct?.creditProductChargeOffPolicy
          ? {
              allowChargeOff: creditProduct.creditProductChargeOffPolicy.allowChargeOff,
              minDaysPastDue: creditProduct.creditProductChargeOffPolicy.minDaysPastDue,
            }
          : {
              allowChargeOff: false,
              minDaysPastDue: 180,
            },
        creditProductCategories:
          creditProduct?.creditProductCategories?.map((category) => ({
            categoryCode: category.categoryCode,
            installmentsFrom: category.installmentsFrom,
            installmentsTo: category.installmentsTo,
            financingFactor: category.financingFactor,
          })) ?? [],
        creditProductLateInterestRules:
          creditProduct?.creditProductLateInterestRules?.map((rule) => ({
            categoryCode: rule.categoryCode,
            daysFrom: rule.daysFrom,
            daysTo: rule.daysTo ?? null,
            lateFactor: rule.lateFactor,
            isActive: rule.isActive,
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
        creditProductBillingConcepts:
          creditProduct?.creditProductBillingConcepts?.map((billingConcept) => ({
            billingConceptId: billingConcept.billingConceptId,
            isEnabled: billingConcept.isEnabled,
            overrideFrequency: billingConcept.overrideFrequency ?? null,
            overrideFinancingMode: billingConcept.overrideFinancingMode ?? null,
            overrideGlAccountId: billingConcept.overrideGlAccountId ?? null,
            overrideRuleId: billingConcept.overrideRuleId ?? null,
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
          <SheetTitle>
            {creditProduct ? 'Editar Tipo de Credito' : 'Nuevo Tipo de Credito'}
          </SheetTitle>
          <SheetDescription>
            Configure el producto de credito, categorias, reglas de mora, documentos y cuentas.
          </SheetDescription>
        </SheetHeader>

        <FormProvider {...form}>
          <form id={formId} onSubmit={form.handleSubmit(onSubmit, onSubmitError)} className="px-4">
            <Tabs defaultValue="product" className="w-full">
              <TabsList className="mb-4 w-full">
                <TabsTrigger value="product">Producto</TabsTrigger>
                <TabsTrigger value="categories">Categorias</TabsTrigger>
                <TabsTrigger value="lateInterestRules">Reglas mora</TabsTrigger>
                <TabsTrigger value="requiredDocuments">Documentos</TabsTrigger>
                <TabsTrigger value="refinancePolicy">Refinanciacion</TabsTrigger>
                <TabsTrigger value="chargeOffPolicy">Castigo cartera</TabsTrigger>
                <TabsTrigger value="accounts">Cuentas</TabsTrigger>
                <TabsTrigger value="billingConcepts">Conceptos</TabsTrigger>
              </TabsList>

              <TabsContent value="product" className="space-y-4 pt-2">
                <FieldGroup>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 pt-1">
                      <p className="text-sm font-semibold">General</p>
                    </div>
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
                            onValueChange={(value: CreditFund | null) =>
                              field.onChange(value?.id ?? undefined)
                            }
                            itemToStringValue={(item: CreditFund) => String(item.id)}
                            itemToStringLabel={(item: CreditFund) => item.name}
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
                            <ComboboxContent portalContainer={sheetContentRef}>
                              <ComboboxInput
                                placeholder="Buscar fondo..."
                                showClear
                                showTrigger={false}
                              />
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
                          <FieldLabel htmlFor="paymentAllocationPolicyId">
                            Politica de aplicacion
                          </FieldLabel>
                          <Combobox
                            items={paymentAllocationPolicies}
                            value={findPaymentAllocationPolicy(field.value)}
                            onValueChange={(value: PaymentAllocationPolicy | null) =>
                              field.onChange(value?.id ?? undefined)
                            }
                            itemToStringValue={(item: PaymentAllocationPolicy) => String(item.id)}
                            itemToStringLabel={(item: PaymentAllocationPolicy) => item.name}
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
                            <ComboboxContent portalContainer={sheetContentRef}>
                              <ComboboxInput
                                placeholder="Buscar politica..."
                                showClear
                                showTrigger={false}
                              />
                              <ComboboxList>
                                <ComboboxEmpty>No se encontraron politicas</ComboboxEmpty>
                                <ComboboxCollection>
                                  {(item: PaymentAllocationPolicy) => (
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

                    <div className="col-span-2 pt-2">
                      <p className="text-sm font-semibold">Interes y mora</p>
                    </div>

                    <Controller
                      name="interestRateType"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="interestRateType">Tipo tasa interes</FieldLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {INTEREST_RATE_TYPE_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {interestRateTypeLabels[option]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller
                      name="interestAccrualMethod"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="interestAccrualMethod">Causacion interes</FieldLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {INTEREST_ACCRUAL_METHOD_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {interestAccrualMethodLabels[option]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller
                      name="interestDayCountConvention"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="interestDayCountConvention">
                            Convencion dias interes
                          </FieldLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {DAY_COUNT_CONVENTION_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {dayCountConventionLabels[option]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller
                      name="lateInterestRateType"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="lateInterestRateType">Tipo tasa mora</FieldLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {INTEREST_RATE_TYPE_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {interestRateTypeLabels[option]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller
                      name="lateInterestAccrualMethod"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="lateInterestAccrualMethod">
                            Causacion mora
                          </FieldLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {INTEREST_ACCRUAL_METHOD_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {interestAccrualMethodLabels[option]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller
                      name="lateInterestDayCountConvention"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="lateInterestDayCountConvention">
                            Convencion dias mora
                          </FieldLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {DAY_COUNT_CONVENTION_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {dayCountConventionLabels[option]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller
                      name="ageBasis"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="ageBasis">Base edad mora</FieldLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {LATE_INTEREST_AGE_BASIS_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {lateInterestAgeBasisLabels[option]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <div className="col-span-2 pt-2">
                      <p className="text-sm font-semibold">Seguro</p>
                    </div>

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
                      name="insuranceRangeMetric"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="insuranceRangeMetric">Metrica seguro</FieldLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={!paysInsurance}
                          >
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
                      name="insuranceAccrualMethod"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="insuranceAccrualMethod">Causacion seguro</FieldLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={!paysInsurance}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {INSURANCE_ACCRUAL_METHOD_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {insuranceAccrualMethodLabels[option]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <div className="col-span-2 pt-2">
                      <p className="text-sm font-semibold">Distribuciones contables</p>
                    </div>

                    <Controller
                      name="capitalDistributionId"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="capitalDistributionId">
                            Distribucion capital
                          </FieldLabel>
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
                            <ComboboxContent portalContainer={sheetContentRef}>
                              <ComboboxInput
                                placeholder="Buscar distribucion..."
                                showClear
                                showTrigger={false}
                              />
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
                          <FieldLabel htmlFor="interestDistributionId">
                            Distribucion interes
                          </FieldLabel>
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
                            <ComboboxContent portalContainer={sheetContentRef}>
                              <ComboboxInput
                                placeholder="Buscar distribucion..."
                                showClear
                                showTrigger={false}
                              />
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
                          <FieldLabel htmlFor="lateInterestDistributionId">
                            Distribucion mora
                          </FieldLabel>
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
                            <ComboboxContent portalContainer={sheetContentRef}>
                              <ComboboxInput
                                placeholder="Buscar distribucion..."
                                showClear
                                showTrigger={false}
                              />
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

                    <div className="col-span-2 pt-2">
                      <p className="text-sm font-semibold">Parametros operativos</p>
                    </div>

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
                            onValueChange={(value: CostCenter | null) =>
                              field.onChange(value?.id ?? null)
                            }
                            itemToStringValue={(item: CostCenter) => String(item.id)}
                            itemToStringLabel={(item: CostCenter) => `${item.code} - ${item.name}`}
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
                            <ComboboxContent portalContainer={sheetContentRef}>
                              <ComboboxInput
                                placeholder="Buscar centro..."
                                showClear
                                showTrigger={false}
                              />
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

                    <div className="col-span-2 pt-2">
                      <p className="text-sm font-semibold">Riesgo</p>
                    </div>

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

                  <div className="pt-2">
                    <p className="text-sm font-semibold">Estado y reportes</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Controller
                      name="reportsToCreditBureau"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="reportsToCreditBureau">
                            Reporta centrales?
                          </FieldLabel>
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

              <TabsContent value="lateInterestRules" className="pt-2">
                <CreditProductLateInterestRulesForm />
              </TabsContent>

              <TabsContent value="requiredDocuments" className="pt-2">
                <CreditProductRequiredDocumentsForm />
              </TabsContent>

              <TabsContent value="refinancePolicy" className="pt-2">
                <CreditProductRefinancePolicyForm />
              </TabsContent>

              <TabsContent value="chargeOffPolicy" className="pt-2">
                <CreditProductChargeOffPolicyForm />
              </TabsContent>

              <TabsContent value="accounts" className="pt-2">
                <CreditProductAccountsForm />
              </TabsContent>

              <TabsContent value="billingConcepts" className="pt-2">
                <CreditProductBillingConceptsForm />
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
