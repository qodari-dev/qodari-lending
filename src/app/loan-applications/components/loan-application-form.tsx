'use client';

import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAffiliationOffices } from '@/hooks/queries/use-affiliation-office-queries';
import { useBanks } from '@/hooks/queries/use-bank-queries';
import { useChannels } from '@/hooks/queries/use-channel-queries';
import { useCreditProducts } from '@/hooks/queries/use-credit-product-queries';
import { useInsuranceCompanies } from '@/hooks/queries/use-insurance-company-queries';
import { useInvestmentTypes } from '@/hooks/queries/use-investment-type-queries';
import {
  useCreateLoanApplication,
  usePresignLoanApplicationDocumentView,
  usePresignLoanApplicationDocumentUpload,
  useUpdateLoanApplication,
} from '@/hooks/queries/use-loan-application-queries';
import { usePaymentFrequencies } from '@/hooks/queries/use-payment-frequency-queries';
import { useThirdParties } from '@/hooks/queries/use-third-party-queries';
import {
  categoryCodeLabels,
  categoryCodeSelectOptions,
  type CategoryCode,
} from '@/schemas/category';
import {
  bankAccountTypeLabels,
  BANK_ACCOUNT_TYPE_OPTIONS,
  CreateLoanApplicationBodySchema,
  LoanApplication,
} from '@/schemas/loan-application';
import { ThirdParty } from '@/schemas/third-party';
import {
  assessPaymentCapacity,
  calculateLoanApplicationPaymentCapacity,
} from '@/utils/payment-capacity';
import { calculateCreditSimulation } from '@/utils/credit-simulation';
import { formatCurrency, formatDateISO } from '@/utils/formatters';
import { isUpdatedToday } from '@/utils/date-utils';
import { onSubmitError } from '@/utils/on-submit-error';
import { getThirdPartyLabel } from '@/utils/third-party';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDownIcon, Plus } from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Controller, FormProvider, type Resolver, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { LoanApplicationThirdPartiesForm } from './loan-application-co-debtors-form';
import {
  LoanApplicationDocumentsForm,
  RequiredDocumentItem,
} from './loan-application-documents-form';
import { LoanApplicationPledgesForm } from './loan-application-pledges-form';
import { ThirdPartyForm } from '@/app/third-parties/components/third-party-form';

type FormValues = z.infer<typeof CreateLoanApplicationBodySchema>;

export function LoanApplicationForm({
  loanApplication,
  opened,
  onOpened,
}: {
  loanApplication: LoanApplication | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  const formId = useId();
  const sheetContentRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState('application');
  const [openedThirdPartyForm, setOpenedThirdPartyForm] = useState(false);
  const [thirdPartyFormMode, setThirdPartyFormMode] = useState<'applicant' | 'coDebtor'>(
    'applicant'
  );
  const [thirdPartyToEdit, setThirdPartyToEdit] = useState<ThirdParty | undefined>(undefined);
  const [localThirdParty, setLocalThirdParty] = useState<ThirdParty | null>(null);
  const [showAmortizationPreview, setShowAmortizationPreview] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(CreateLoanApplicationBodySchema) as Resolver<FormValues>,
    defaultValues: {
      channelId: undefined,
      applicationDate: new Date(),
      affiliationOfficeId: undefined,
      thirdPartyId: undefined,
      categoryCode: undefined,
      repaymentMethodId: null,
      paymentGuaranteeTypeId: null,
      pledgesSubsidy: false,
      salary: '0',
      otherIncome: '0',
      otherCredits: '0',
      paymentCapacity: '0',
      bankAccountNumber: '',
      bankAccountType: 'SAVINGS',
      bankId: undefined,
      creditProductId: undefined,
      paymentFrequencyId: null,
      installments: 12,
      insuranceCompanyId: null,
      requestedAmount: '0',
      investmentTypeId: null,
      note: '',
      isInsuranceApproved: false,
      creditStudyFee: '0',
      loanApplicationCoDebtors: [],
      loanApplicationDocuments: [],
      loanApplicationPledges: [],
    },
  });

  const { mutateAsync: create, isPending: isCreating } = useCreateLoanApplication();
  const { mutateAsync: update, isPending: isUpdating } = useUpdateLoanApplication();
  const { mutateAsync: presignUpload } = usePresignLoanApplicationDocumentUpload();
  const { mutateAsync: presignView } = usePresignLoanApplicationDocumentView();

  const isLoading = isCreating || isUpdating;

  const { data: channelsData } = useChannels({
    limit: 200,
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'name', order: 'asc' }],
  });
  const channels = useMemo(() => channelsData?.body?.data ?? [], [channelsData]);

  const { data: officesData } = useAffiliationOffices({
    limit: 1000,
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'name', order: 'asc' }],
  });
  const offices = useMemo(() => officesData?.body?.data ?? [], [officesData]);

  const { data: thirdPartiesData } = useThirdParties({
    limit: 1000,
    include: ['identificationType', 'homeCity', 'workCity'],
    sort: [{ field: 'createdAt', order: 'desc' }],
  });
  const thirdParties = useMemo(() => {
    const base = thirdPartiesData?.body?.data ?? [];
    if (!localThirdParty) return base;
    if (base.some((item) => item.id === localThirdParty.id)) return base;
    return [localThirdParty, ...base];
  }, [thirdPartiesData, localThirdParty]);

  const { data: creditProductsData } = useCreditProducts({
    limit: 1000,
    include: ['creditProductCategories', 'creditProductRequiredDocuments'],
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'name', order: 'asc' }],
  });
  const creditProducts = useMemo(() => creditProductsData?.body?.data ?? [], [creditProductsData]);

  const { data: banksData } = useBanks({
    limit: 1000,
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'name', order: 'asc' }],
  });
  const banks = useMemo(() => banksData?.body?.data ?? [], [banksData]);

  const { data: paymentFrequenciesData } = usePaymentFrequencies({
    limit: 1000,
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'name', order: 'asc' }],
  });
  const paymentFrequencies = useMemo(
    () => paymentFrequenciesData?.body?.data ?? [],
    [paymentFrequenciesData]
  );

  const { data: insuranceCompaniesData } = useInsuranceCompanies({
    limit: 1000,
    include: ['insuranceRateRanges'],
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'businessName', order: 'asc' }],
  });
  const insuranceCompanies = useMemo(
    () => insuranceCompaniesData?.body?.data ?? [],
    [insuranceCompaniesData]
  );

  const { data: investmentTypesData } = useInvestmentTypes({
    limit: 1000,
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'name', order: 'asc' }],
  });
  const investmentTypes = useMemo(
    () => investmentTypesData?.body?.data ?? [],
    [investmentTypesData]
  );

  const selectedThirdPartyId = useWatch({
    control: form.control,
    name: 'thirdPartyId',
  });
  const selectedCreditProductId = useWatch({
    control: form.control,
    name: 'creditProductId',
  });
  const selectedCategoryCode = useWatch({
    control: form.control,
    name: 'categoryCode',
  });
  const applicationDateValue = useWatch({
    control: form.control,
    name: 'applicationDate',
  });
  const selectedPaymentFrequencyId = useWatch({
    control: form.control,
    name: 'paymentFrequencyId',
  });
  const installmentsValue = useWatch({
    control: form.control,
    name: 'installments',
  });
  const requestedAmountValue = useWatch({
    control: form.control,
    name: 'requestedAmount',
  });
  const selectedInsuranceCompanyId = useWatch({
    control: form.control,
    name: 'insuranceCompanyId',
  });
  const salaryValue = useWatch({
    control: form.control,
    name: 'salary',
  });
  const otherIncomeValue = useWatch({
    control: form.control,
    name: 'otherIncome',
  });
  const otherCreditsValue = useWatch({
    control: form.control,
    name: 'otherCredits',
  });
  const pledgesSubsidy = useWatch({
    control: form.control,
    name: 'pledgesSubsidy',
  });

  const selectedThirdParty = useMemo(
    () => thirdParties.find((item) => item.id === selectedThirdPartyId),
    [thirdParties, selectedThirdPartyId]
  );
  const selectedThirdPartyNeedsUpdate = useMemo(
    () => !isUpdatedToday(selectedThirdParty?.updatedAt),
    [selectedThirdParty]
  );
  const selectedCreditProduct = useMemo(
    () => creditProducts.find((item) => item.id === selectedCreditProductId),
    [creditProducts, selectedCreditProductId]
  );

  const loanApplicationCategoryCode = loanApplication?.categoryCode;
  const categoryOptions: CategoryCode[] = (() => {
    const categories = new Set<CategoryCode>();
    selectedCreditProduct?.creditProductCategories?.forEach((item) => {
      categories.add(item.categoryCode);
    });
    if (selectedCategoryCode) {
      categories.add(selectedCategoryCode as CategoryCode);
    }
    if (loanApplicationCategoryCode) {
      categories.add(loanApplicationCategoryCode as CategoryCode);
    }
    if (categories.size === 0) {
      return categoryCodeSelectOptions.map((option) => option.value);
    }
    return Array.from(categories);
  })();

  const maxInstallmentsForCategory = useMemo(() => {
    if (!selectedCreditProduct) return null;
    if (!selectedCategoryCode) return selectedCreditProduct.maxInstallments ?? null;

    const rows = (selectedCreditProduct.creditProductCategories ?? []).filter(
      (item) => item.categoryCode === selectedCategoryCode
    );
    if (!rows.length) return selectedCreditProduct.maxInstallments ?? null;

    const maxByCategory = Math.max(...rows.map((item) => item.installmentsTo));
    if (!selectedCreditProduct.maxInstallments) return maxByCategory;
    return Math.min(selectedCreditProduct.maxInstallments, maxByCategory);
  }, [selectedCategoryCode, selectedCreditProduct]);

  const requiredDocuments = useMemo<RequiredDocumentItem[]>(() => {
    const docs = selectedCreditProduct?.creditProductDocuments ?? [];
    if (!docs?.length) return [];
    return docs.map((doc) => ({
      documentTypeId: doc.documentTypeId,
      isRequired: doc.isRequired,
      documentTypeName: doc.documentType?.name ?? `Documento ${doc.documentTypeId}`,
    }));
  }, [selectedCreditProduct]);
  const calculatedPaymentCapacity = useMemo(() => {
    return calculateLoanApplicationPaymentCapacity({
      salary: salaryValue,
      otherIncome: otherIncomeValue,
      otherCredits: otherCreditsValue,
    });
  }, [otherCreditsValue, otherIncomeValue, salaryValue]);

  const selectedPaymentFrequency = useMemo(
    () => paymentFrequencies.find((item) => item.id === selectedPaymentFrequencyId) ?? null,
    [paymentFrequencies, selectedPaymentFrequencyId]
  );
  const selectedInsuranceCompany = useMemo(
    () => insuranceCompanies.find((item) => item.id === selectedInsuranceCompanyId) ?? null,
    [insuranceCompanies, selectedInsuranceCompanyId]
  );

  const selectedCategoryConfig = useMemo(() => {
    if (!selectedCreditProduct || !selectedCategoryCode || !installmentsValue) return null;
    return (
      selectedCreditProduct.creditProductCategories?.find(
        (item) =>
          item.categoryCode === selectedCategoryCode &&
          installmentsValue >= item.installmentsFrom &&
          installmentsValue <= item.installmentsTo
      ) ?? null
    );
  }, [installmentsValue, selectedCategoryCode, selectedCreditProduct]);

  const estimatedInsuranceFactor = useMemo(() => {
    if (!selectedCreditProduct) return null;
    if (!selectedCreditProduct.paysInsurance) return 0;

    if (!selectedInsuranceCompany || !installmentsValue || !requestedAmountValue) return null;

    const metricValue =
      selectedCreditProduct.insuranceRangeMetric === 'INSTALLMENT_COUNT'
        ? Number(installmentsValue)
        : Number(requestedAmountValue);

    if (!Number.isFinite(metricValue)) return null;

    const insuranceRange = selectedInsuranceCompany.insuranceRateRanges?.find(
      (range) =>
        range.rangeMetric === selectedCreditProduct.insuranceRangeMetric &&
        metricValue >= range.valueFrom &&
        metricValue <= range.valueTo
    );

    if (!insuranceRange) return null;

    const factor = Number(insuranceRange.rateValue ?? 0);
    return Number.isFinite(factor) ? factor : 0;
  }, [installmentsValue, requestedAmountValue, selectedCreditProduct, selectedInsuranceCompany]);

  const estimatedAmortization = useMemo(() => {
    if (!selectedCreditProduct?.financingType || !selectedPaymentFrequency?.daysInterval) return null;
    if (!selectedCategoryConfig) return null;

    const principal = Number(requestedAmountValue);
    const annualRatePercent = Number(selectedCategoryConfig.financingFactor);
    const installments = Number(installmentsValue);
    const insuranceRatePercent = Number(estimatedInsuranceFactor ?? 0);
    const firstPaymentDate = applicationDateValue ? new Date(applicationDateValue) : null;

    if (!Number.isFinite(principal) || principal <= 0) return null;
    if (!Number.isFinite(annualRatePercent)) return null;
    if (!Number.isFinite(installments) || installments <= 0) return null;
    if (!Number.isFinite(insuranceRatePercent)) return null;
    if (!firstPaymentDate || Number.isNaN(firstPaymentDate.getTime())) return null;

    return calculateCreditSimulation({
      financingType: selectedCreditProduct.financingType,
      principal,
      annualRatePercent,
      installments,
      firstPaymentDate,
      daysInterval: selectedPaymentFrequency.daysInterval,
      insuranceRatePercent,
    });
  }, [
    applicationDateValue,
    estimatedInsuranceFactor,
    installmentsValue,
    requestedAmountValue,
    selectedCategoryConfig,
    selectedCreditProduct,
    selectedPaymentFrequency,
  ]);

  const paymentCapacityAssessment = useMemo(() => {
    if (!estimatedAmortization) return null;
    return assessPaymentCapacity({
      paymentCapacity: calculatedPaymentCapacity,
      installmentPayment: estimatedAmortization.summary.maxInstallmentPayment,
    });
  }, [calculatedPaymentCapacity, estimatedAmortization]);
  const showAmortizationSection = showAmortizationPreview && !!estimatedAmortization && opened;

  const openThirdPartyCreate = useCallback((mode: 'applicant' | 'coDebtor') => {
    setThirdPartyFormMode(mode);
    setThirdPartyToEdit(undefined);
    setOpenedThirdPartyForm(true);
  }, []);

  const openThirdPartyEdit = useCallback(
    (mode: 'applicant' | 'coDebtor', thirdParty: ThirdParty) => {
      setThirdPartyFormMode(mode);
      setThirdPartyToEdit(thirdParty);
      setOpenedThirdPartyForm(true);
    },
    []
  );

  useEffect(() => {
    if (!opened) return;

    form.reset({
      channelId: loanApplication?.channelId ?? undefined,
      applicationDate: loanApplication?.applicationDate
        ? new Date(`${loanApplication.applicationDate}T00:00:00`)
        : new Date(),
      affiliationOfficeId: loanApplication?.affiliationOfficeId ?? undefined,
      thirdPartyId: loanApplication?.thirdPartyId ?? undefined,
      categoryCode: loanApplication?.categoryCode ?? undefined,
      repaymentMethodId: loanApplication?.repaymentMethodId ?? null,
      paymentGuaranteeTypeId: loanApplication?.paymentGuaranteeTypeId ?? null,
      pledgesSubsidy: loanApplication?.pledgesSubsidy ?? false,
      salary: String(loanApplication?.salary ?? '0'),
      otherIncome: String(loanApplication?.otherIncome ?? '0'),
      otherCredits: String(loanApplication?.otherCredits ?? '0'),
      paymentCapacity: String(loanApplication?.paymentCapacity ?? '0'),
      bankAccountNumber: loanApplication?.bankAccountNumber ?? '',
      bankAccountType: loanApplication?.bankAccountType ?? 'SAVINGS',
      bankId: loanApplication?.bankId ?? undefined,
      creditProductId: loanApplication?.creditProductId ?? undefined,
      paymentFrequencyId: loanApplication?.paymentFrequencyId ?? null,
      installments: loanApplication?.installments ?? 12,
      insuranceCompanyId: loanApplication?.insuranceCompanyId ?? null,
      requestedAmount: String(loanApplication?.requestedAmount ?? '0'),
      investmentTypeId: loanApplication?.investmentTypeId ?? null,
      note: loanApplication?.note ?? '',
      isInsuranceApproved: loanApplication?.isInsuranceApproved ?? false,
      creditStudyFee: String(loanApplication?.creditStudyFee ?? '0'),
      loanApplicationCoDebtors:
        loanApplication?.loanApplicationCoDebtors
          ?.map((item) => ({
            thirdPartyId: item.thirdParty?.id ?? item.thirdPartyId ?? 0,
          }))
          .filter((item) => item.thirdPartyId > 0) ?? [],
      loanApplicationDocuments:
        loanApplication?.loanApplicationDocuments?.map((item) => ({
          documentTypeId: item.documentTypeId,
          isDelivered: item.isDelivered,
          fileKey: item.fileKey ?? null,
        })) ?? [],
      loanApplicationPledges:
        loanApplication?.loanApplicationPledges?.map((item) => ({
          pledgeCode: item.pledgeCode,
          documentNumber: item.documentNumber ?? '',
          beneficiaryCode: item.beneficiaryCode,
          pledgedAmount: String(item.pledgedAmount),
          effectiveDate: new Date(`${item.effectiveDate}T00:00:00`),
        })) ?? [],
    });
  }, [opened, loanApplication, form]);

  useEffect(() => {
    if (!selectedThirdParty?.categoryCode) return;
    form.setValue('categoryCode', selectedThirdParty.categoryCode);
  }, [form, selectedThirdParty?.categoryCode]);

  useEffect(() => {
    if (!opened || !loanApplication?.categoryCode) return;
    const currentCategory = form.getValues('categoryCode');
    if (currentCategory) return;
    form.setValue('categoryCode', loanApplication.categoryCode);
  }, [form, loanApplication?.categoryCode, opened]);

  useEffect(() => {
    if (selectedCreditProduct?.paysInsurance) return;
    form.setValue('insuranceCompanyId', null);
  }, [form, selectedCreditProduct?.paysInsurance]);

  useEffect(() => {
    form.setValue('paymentCapacity', calculatedPaymentCapacity.toFixed(2), {
      shouldValidate: true,
      shouldDirty: false,
    });
  }, [calculatedPaymentCapacity, form]);

  const uploadDocumentFile = useCallback(
    async ({ file }: { file: File; documentTypeId: number }) => {
      const response = await presignUpload({
        body: {
          fileName: file.name,
          contentType: file.type || 'application/octet-stream',
        },
      });

      const upload = await fetch(response.body.uploadUrl, {
        method: response.body.method,
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
        body: file,
      });

      if (!upload.ok) {
        throw new Error('Upload failed');
      }

      return response.body.fileKey;
    },
    [presignUpload]
  );

  const viewDocumentFile = useCallback(
    async (fileKey: string) => {
      const response = await presignView({
        body: { fileKey },
      });
      window.open(response.body.viewUrl, '_blank', 'noopener,noreferrer');
    },
    [presignView]
  );

  const onSubmit = useCallback(
    async (values: FormValues) => {
      const selectedApplicant = thirdParties.find((item) => item.id === values.thirdPartyId);
      if (selectedApplicant && !isUpdatedToday(selectedApplicant.updatedAt)) {
        setActiveTab('application');
        openThirdPartyEdit('applicant', selectedApplicant);
        toast.error('Debe actualizar la informacion del solicitante hoy antes de guardar');
        return;
      }

      const staleCoDebtor = (values.loanApplicationCoDebtors ?? [])
        .map((item) => thirdParties.find((party) => party.id === item.thirdPartyId))
        .find((party) => party && !isUpdatedToday(party.updatedAt));

      if (staleCoDebtor) {
        setActiveTab('coDebtors');
        openThirdPartyEdit('coDebtor', staleCoDebtor);
        toast.error('Debe actualizar la informacion de los codeudores hoy antes de guardar');
        return;
      }

      if (maxInstallmentsForCategory && values.installments > maxInstallmentsForCategory) {
        toast.error(`El maximo de cuotas permitido es ${maxInstallmentsForCategory}`);
        return;
      }

      const missingRequiredDocument = requiredDocuments.find((requiredDocument) => {
        if (!requiredDocument.isRequired) return false;
        const submitted = values.loanApplicationDocuments?.find(
          (doc) => doc.documentTypeId === requiredDocument.documentTypeId
        );
        return !submitted || !submitted.isDelivered || !submitted.fileKey;
      });

      if (missingRequiredDocument) {
        toast.error('Debe adjuntar todos los documentos obligatorios');
        return;
      }

      if (
        values.pledgesSubsidy &&
        (!values.loanApplicationPledges || values.loanApplicationPledges.length === 0)
      ) {
        toast.error('Debe agregar al menos una pignoracion');
        return;
      }

      if (loanApplication) {
        await update({ params: { id: loanApplication.id }, body: values });
      } else {
        await create({ body: values });
      }

      onOpened(false);
    },
    [
      create,
      loanApplication,
      maxInstallmentsForCategory,
      onOpened,
      openThirdPartyEdit,
      requiredDocuments,
      thirdParties,
      update,
    ]
  );

  return (
    <Sheet
      open={opened}
      onOpenChange={(open) => {
        setShowAmortizationPreview(false);
        if (open) {
          setActiveTab('application');
        }
        onOpened(open);
      }}
    >
      <SheetContent ref={sheetContentRef} className="overflow-y-scroll sm:max-w-5xl">
        <SheetHeader>
          <SheetTitle>
            {loanApplication ? 'Editar Solicitud de Credito' : 'Nueva Solicitud de Credito'}
          </SheetTitle>
          <SheetDescription>
            Registre la solicitud, codeudores, documentos y pignoraciones.
          </SheetDescription>
        </SheetHeader>

        <FormProvider {...form}>
          <form id={formId} onSubmit={form.handleSubmit(onSubmit, onSubmitError)} className="px-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="mb-4 w-full">
                <TabsTrigger value="application">Solicitud</TabsTrigger>
                <TabsTrigger value="coDebtors">Codeudores</TabsTrigger>
                <TabsTrigger value="documents">Documentos</TabsTrigger>
                <TabsTrigger value="pledges" disabled={!pledgesSubsidy}>
                  Pignoraciones
                </TabsTrigger>
              </TabsList>

              <TabsContent value="application" className="space-y-4 pt-2">
                <FieldGroup>
                  <div className="grid grid-cols-2 gap-4">
                    <Controller
                      name="channelId"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="channelId">Canal</FieldLabel>
                          <Select
                            value={field.value ? String(field.value) : ''}
                            onValueChange={(value) =>
                              field.onChange(value ? Number(value) : undefined)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {channels.map((item) => (
                                <SelectItem key={item.id} value={String(item.id)}>
                                  {item.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller
                      name="affiliationOfficeId"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="affiliationOfficeId">Oficina afiliacion</FieldLabel>
                          <Combobox
                            items={offices}
                            value={offices.find((item) => item.id === field.value) ?? null}
                            onValueChange={(value) => field.onChange(value?.id ?? undefined)}
                            itemToStringValue={(item) => String(item.id)}
                            itemToStringLabel={(item) => item.name}
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
                                placeholder="Buscar oficina..."
                                showClear
                                showTrigger={false}
                              />
                              <ComboboxList>
                                <ComboboxEmpty>No se encontraron oficinas</ComboboxEmpty>
                                <ComboboxCollection>
                                  {(item) => (
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
                      name="applicationDate"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="applicationDate">Fecha solicitud</FieldLabel>
                          <Input
                            id="applicationDate"
                            type="date"
                            value={field.value ? formatDateISO(field.value) : ''}
                            onChange={(event) =>
                              field.onChange(
                                event.target.value
                                  ? new Date(`${event.target.value}T00:00:00`)
                                  : new Date()
                              )
                            }
                          />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller
                      name="creditProductId"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="creditProductId">Linea de credito</FieldLabel>
                          <Combobox
                            items={creditProducts}
                            value={creditProducts.find((item) => item.id === field.value) ?? null}
                            onValueChange={(value) => field.onChange(value?.id ?? undefined)}
                            itemToStringValue={(item) => String(item.id)}
                            itemToStringLabel={(item) => item.name}
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
                                placeholder="Buscar producto..."
                                showClear
                                showTrigger={false}
                              />
                              <ComboboxList>
                                <ComboboxEmpty>No se encontraron productos</ComboboxEmpty>
                                <ComboboxCollection>
                                  {(item) => (
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
                      name="thirdPartyId"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="col-span-2">
                          <div className="flex items-center justify-between gap-2">
                            <FieldLabel htmlFor="thirdPartyId">Solicitante</FieldLabel>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => openThirdPartyCreate('applicant')}
                              >
                                <Plus className="mr-1 h-4 w-4" />
                                Nuevo tercero
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={!selectedThirdParty}
                                onClick={() =>
                                  selectedThirdParty
                                    ? openThirdPartyEdit('applicant', selectedThirdParty)
                                    : undefined
                                }
                              >
                                Editar tercero
                              </Button>
                            </div>
                          </div>
                          <Combobox
                            items={thirdParties}
                            value={thirdParties.find((item) => item.id === field.value) ?? null}
                            onValueChange={(value) => field.onChange(value?.id ?? undefined)}
                            itemToStringValue={(item) => String(item.id)}
                            itemToStringLabel={(item) =>
                              `${getThirdPartyLabel(item)} (${item.documentNumber})`
                            }
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
                                placeholder="Buscar solicitante..."
                                showClear
                                showTrigger={false}
                              />
                              <ComboboxList>
                                <ComboboxEmpty>No se encontraron terceros</ComboboxEmpty>
                                <ComboboxCollection>
                                  {(item) => (
                                    <ComboboxItem key={item.id} value={item}>
                                      {getThirdPartyLabel(item)} ({item.documentNumber})
                                    </ComboboxItem>
                                  )}
                                </ComboboxCollection>
                              </ComboboxList>
                            </ComboboxContent>
                          </Combobox>
                          {selectedThirdParty && selectedThirdPartyNeedsUpdate ? (
                            <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-700">
                              El solicitante requiere actualizacion hoy.
                            </div>
                          ) : null}
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller
                      name="categoryCode"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="categoryCode">Categoria</FieldLabel>
                          <Select
                            value={field.value ?? ''}
                            onValueChange={(value) => field.onChange(value || undefined)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {(categoryOptions.length
                                ? categoryOptions
                                : categoryCodeSelectOptions.map((o) => o.value)
                              ).map((value) => (
                                <SelectItem key={value} value={value}>
                                  {categoryCodeLabels[value]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller
                      name="salary"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="salary">Salario</FieldLabel>
                          <Input id="salary" {...field} value={field.value ?? ''} />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller
                      name="otherIncome"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="otherIncome">Otros ingresos</FieldLabel>
                          <Input id="otherIncome" {...field} value={field.value ?? ''} />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller
                      name="otherCredits"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="otherCredits">Otros creditos</FieldLabel>
                          <Input id="otherCredits" {...field} value={field.value ?? ''} />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller
                      name="paymentCapacity"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="paymentCapacity">Capacidad pago</FieldLabel>
                          <Input
                            id="paymentCapacity"
                            {...field}
                            value={field.value ?? ''}
                            readOnly
                            disabled
                          />
                          <p className="text-muted-foreground text-xs">Calculado automáticamente.</p>
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller
                      name="paymentFrequencyId"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="paymentFrequencyId">Periodicidad pago</FieldLabel>
                          <Combobox
                            items={paymentFrequencies}
                            value={
                              paymentFrequencies.find((item) => item.id === field.value) ?? null
                            }
                            onValueChange={(value) => field.onChange(value?.id ?? null)}
                            itemToStringValue={(item) => String(item.id)}
                            itemToStringLabel={(item) => `${item.name} (${item.daysInterval} dias)`}
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
                                placeholder="Buscar periodicidad..."
                                showClear
                                showTrigger={false}
                              />
                              <ComboboxList>
                                <ComboboxEmpty>No se encontraron periodicidades</ComboboxEmpty>
                                <ComboboxCollection>
                                  {(item) => (
                                    <ComboboxItem key={item.id} value={item}>
                                      {item.name} ({item.daysInterval} dias)
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
                      name="installments"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="installments">Numero cuotas</FieldLabel>
                          <Input
                            id="installments"
                            type="number"
                            min={1}
                            value={field.value ?? ''}
                            onChange={(event) =>
                              field.onChange(
                                event.target.value ? Number(event.target.value) : undefined
                              )
                            }
                          />
                          {maxInstallmentsForCategory ? (
                            <p className="text-muted-foreground text-xs">
                              Maximo permitido: {maxInstallmentsForCategory}
                            </p>
                          ) : null}
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller
                      name="requestedAmount"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="requestedAmount">Valor solicitado</FieldLabel>
                          <Input id="requestedAmount" {...field} value={field.value ?? ''} />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller
                      name="bankId"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="bankId">Banco</FieldLabel>
                          <Combobox
                            items={banks}
                            value={banks.find((item) => item.id === field.value) ?? null}
                            onValueChange={(value) => field.onChange(value?.id ?? undefined)}
                            itemToStringValue={(item) => String(item.id)}
                            itemToStringLabel={(item) => item.name}
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
                                placeholder="Buscar banco..."
                                showClear
                                showTrigger={false}
                              />
                              <ComboboxList>
                                <ComboboxEmpty>No se encontraron bancos</ComboboxEmpty>
                                <ComboboxCollection>
                                  {(item) => (
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
                      name="bankAccountType"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="bankAccountType">Tipo cuenta</FieldLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {BANK_ACCOUNT_TYPE_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {bankAccountTypeLabels[option]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller
                      name="bankAccountNumber"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="bankAccountNumber">Numero cuenta</FieldLabel>
                          <Input id="bankAccountNumber" {...field} value={field.value ?? ''} />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller
                      name="investmentTypeId"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="investmentTypeId">Tipo inversion</FieldLabel>
                          <Combobox
                            items={investmentTypes}
                            value={investmentTypes.find((item) => item.id === field.value) ?? null}
                            onValueChange={(value) => field.onChange(value?.id ?? null)}
                            itemToStringValue={(item) => String(item.id)}
                            itemToStringLabel={(item) => item.name}
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
                                placeholder="Buscar tipo..."
                                showClear
                                showTrigger={false}
                              />
                              <ComboboxList>
                                <ComboboxEmpty>No se encontraron tipos</ComboboxEmpty>
                                <ComboboxCollection>
                                  {(item) => (
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
                      name="insuranceCompanyId"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="insuranceCompanyId">Aseguradora</FieldLabel>
                          <Combobox
                            items={insuranceCompanies}
                            value={
                              insuranceCompanies.find((item) => item.id === field.value) ?? null
                            }
                            onValueChange={(value) => field.onChange(value?.id ?? null)}
                            itemToStringValue={(item) => String(item.id)}
                            itemToStringLabel={(item) => item.businessName}
                            disabled={!selectedCreditProduct?.paysInsurance}
                          >
                            <ComboboxTrigger
                              render={
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="w-full justify-between font-normal"
                                  disabled={!selectedCreditProduct?.paysInsurance}
                                >
                                  <ComboboxValue placeholder="Seleccione..." />
                                  <ChevronDownIcon className="text-muted-foreground size-4" />
                                </Button>
                              }
                            />
                            <ComboboxContent portalContainer={sheetContentRef}>
                              <ComboboxInput
                                placeholder="Buscar aseguradora..."
                                showClear
                                showTrigger={false}
                              />
                              <ComboboxList>
                                <ComboboxEmpty>No se encontraron aseguradoras</ComboboxEmpty>
                                <ComboboxCollection>
                                  {(item) => (
                                    <ComboboxItem key={item.id} value={item}>
                                      {item.businessName}
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
                      name="creditStudyFee"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="creditStudyFee">Estudio credito</FieldLabel>
                          <Input id="creditStudyFee" {...field} value={field.value ?? ''} />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <div className="col-span-2 space-y-3 rounded-md border p-4">
                      <Collapsible open={showAmortizationSection} onOpenChange={setShowAmortizationPreview}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">Viabilidad de pago</p>
                            <p className="text-muted-foreground text-xs">
                              Se calcula con la cuota maxima estimada de la tabla de amortizacion.
                            </p>
                          </div>
                          {estimatedAmortization ? (
                            <CollapsibleTrigger asChild>
                              <Button type="button" variant="outline" size="sm">
                                {showAmortizationSection
                                  ? 'Ocultar tabla estimada'
                                  : 'Ver tabla estimada'}
                              </Button>
                            </CollapsibleTrigger>
                          ) : null}
                        </div>

                        {estimatedAmortization ? (
                          <CollapsibleContent className="pt-3">
                            <div className="max-h-72 overflow-auto rounded-md border">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Cuota</TableHead>
                                    <TableHead>Vencimiento</TableHead>
                                    <TableHead>Pago</TableHead>
                                    <TableHead>Capital</TableHead>
                                    <TableHead>Interes</TableHead>
                                    <TableHead>Seguro</TableHead>
                                    <TableHead>Saldo final</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {estimatedAmortization.installments.map((item) => (
                                    <TableRow key={item.installmentNumber}>
                                      <TableCell>{item.installmentNumber}</TableCell>
                                      <TableCell>{item.dueDate}</TableCell>
                                      <TableCell>{formatCurrency(item.payment)}</TableCell>
                                      <TableCell>{formatCurrency(item.principal)}</TableCell>
                                      <TableCell>{formatCurrency(item.interest)}</TableCell>
                                      <TableCell>{formatCurrency(item.insurance)}</TableCell>
                                      <TableCell>{formatCurrency(item.closingBalance)}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </CollapsibleContent>
                        ) : null}
                      </Collapsible>

                      {paymentCapacityAssessment ? (
                        <div
                          className={
                            paymentCapacityAssessment.canPay
                              ? 'rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800'
                              : 'rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800'
                          }
                        >
                          <p className="font-medium">
                            {paymentCapacityAssessment.canPay
                              ? 'Puede pagar la solicitud.'
                              : 'No puede pagar la solicitud con la capacidad actual.'}
                          </p>
                          <p className="text-xs">
                            Cuota maxima estimada: {formatCurrency(paymentCapacityAssessment.installmentPayment)}.
                            Capacidad de pago: {formatCurrency(paymentCapacityAssessment.paymentCapacity)}.
                            {paymentCapacityAssessment.canPay
                              ? ` Margen: ${formatCurrency(paymentCapacityAssessment.margin)}.`
                              : ` Faltante: ${formatCurrency(paymentCapacityAssessment.shortfall)}.`}
                          </p>
                        </div>
                      ) : (
                        <div className="text-muted-foreground rounded-md border border-dashed p-3 text-sm">
                          Complete linea, categoria, periodicidad, cuotas y valor solicitado para
                          validar la viabilidad.
                        </div>
                      )}
                    </div>

                    <Controller
                      name="pledgesSubsidy"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="pledgesSubsidy">Aplica subsidio?</FieldLabel>
                          <div>
                            <Switch
                              checked={field.value}
                              onCheckedChange={(checked) => {
                                field.onChange(checked);
                                if (!checked && activeTab === 'pledges') {
                                  setActiveTab('application');
                                }
                              }}
                              aria-invalid={fieldState.invalid}
                            />
                          </div>
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller
                      name="note"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="col-span-2">
                          <FieldLabel htmlFor="note">Nota</FieldLabel>
                          <Textarea id="note" value={field.value ?? ''} onChange={field.onChange} />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                  </div>
                </FieldGroup>
              </TabsContent>

              <TabsContent value="coDebtors" className="pt-2">
                <LoanApplicationThirdPartiesForm
                  thirdParties={thirdParties}
                  onCreateThirdParty={() => openThirdPartyCreate('coDebtor')}
                  onEditThirdParty={(thirdParty) => openThirdPartyEdit('coDebtor', thirdParty)}
                />
              </TabsContent>

              <TabsContent value="documents" className="pt-2">
                <LoanApplicationDocumentsForm
                  requiredDocuments={requiredDocuments}
                  onUploadFile={uploadDocumentFile}
                  onViewFile={viewDocumentFile}
                />
              </TabsContent>

              <TabsContent value="pledges" className="pt-2">
                <LoanApplicationPledgesForm />
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
      <ThirdPartyForm
        thirdParty={thirdPartyToEdit}
        opened={openedThirdPartyForm}
        onOpened={(open) => {
          setOpenedThirdPartyForm(open);
          if (!open) setThirdPartyToEdit(undefined);
        }}
        onSaved={(thirdParty) => {
          setLocalThirdParty(thirdParty);
          if (thirdPartyFormMode === 'applicant') {
            form.setValue('thirdPartyId', thirdParty.id, {
              shouldDirty: true,
              shouldValidate: true,
            });
          }
        }}
      />
    </Sheet>
  );
}
