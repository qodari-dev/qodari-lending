'use client';

import { api } from '@/clients/api';
import { PageContent, PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useSimulateLoanRefinancing } from '@/hooks/queries/use-loan-refinancing-queries';
import { useCreditProducts } from '@/hooks/queries/use-credit-product-queries';
import { useInsuranceCompanies } from '@/hooks/queries/use-insurance-company-queries';
import { usePaymentFrequencies } from '@/hooks/queries/use-payment-frequency-queries';
import { categoryCodeLabels } from '@/schemas/category';
import { SimulateLoanRefinancingResult } from '@/schemas/loan-refinancing';
import { Loan, LoanBalanceSummaryResponse } from '@/schemas/loan';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { formatCurrency, formatDate, formatDateTime, formatNumber } from '@/utils/formatters';
import { getThirdPartyLabel } from '@/utils/third-party';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDownIcon, Lock, Search } from 'lucide-react';
import React from 'react';
import { Controller, type Resolver, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
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

type CandidateLoan = {
  id: number;
  creditNumber: string;
  status: string;
  principalAmount: number;
  currentBalance: number;
  overdueBalance: number;
  currentDueBalance: number;
  openInstallments: number;
  nextDueDate: string | null;
  isOrigin: boolean;
};

type OriginLoanHeader = {
  id: number;
  creditNumber: string;
  status: string;
  borrowerName: string;
  borrowerDocumentNumber: string | null;
};

const SimulationParamsSchema = z.object({
  includeOverdueBalance: z.boolean(),
  creditProductId: z.number().int().positive(),
  categoryCode: z.enum(['A', 'B', 'C', 'D']),
  installments: z.number().int().positive(),
  paymentFrequencyId: z.number().int().positive(),
  firstPaymentDate: z.coerce.date(),
  insuranceCompanyId: z.number().int().positive().nullable().optional(),
});

type SimulationParamsForm = z.infer<typeof SimulationParamsSchema>;

export function LoanRefinancing() {
  const [creditNumberInput, setCreditNumberInput] = React.useState('');
  const [isConsultingLoans, setIsConsultingLoans] = React.useState(false);
  const [originLoan, setOriginLoan] = React.useState<OriginLoanHeader | null>(null);
  const [candidateLoans, setCandidateLoans] = React.useState<CandidateLoan[]>([]);
  const [selectedLoanIds, setSelectedLoanIds] = React.useState<number[]>([]);
  const [simulation, setSimulation] = React.useState<SimulateLoanRefinancingResult | null>(null);

  const form = useForm<SimulationParamsForm>({
    resolver: zodResolver(SimulationParamsSchema) as Resolver<SimulationParamsForm>,
    defaultValues: {
      includeOverdueBalance: true,
      creditProductId: undefined,
      categoryCode: undefined,
      installments: 24,
      paymentFrequencyId: undefined,
      firstPaymentDate: new Date(),
      insuranceCompanyId: null,
    },
  });

  const selectedCreditProductId = useWatch({
    control: form.control,
    name: 'creditProductId',
  });
  const includeOverdueBalance = useWatch({
    control: form.control,
    name: 'includeOverdueBalance',
  });

  const { data: creditProductsData, isLoading: isLoadingCreditProducts } = useCreditProducts({
    limit: 1000,
    include: ['creditProductCategories'],
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'name', order: 'asc' }],
  });
  const { data: paymentFrequenciesData, isLoading: isLoadingPaymentFrequencies } =
    usePaymentFrequencies({
      limit: 1000,
      where: { and: [{ isActive: true }] },
      sort: [{ field: 'name', order: 'asc' }],
    });
  const { data: insuranceCompaniesData, isLoading: isLoadingInsuranceCompanies } =
    useInsuranceCompanies({
      limit: 1000,
      include: [],
      where: { and: [{ isActive: true }] },
      sort: [{ field: 'businessName', order: 'asc' }],
    });

  const creditProducts = React.useMemo(() => creditProductsData?.body.data ?? [], [creditProductsData]);
  const paymentFrequencies = React.useMemo(
    () => paymentFrequenciesData?.body.data ?? [],
    [paymentFrequenciesData]
  );
  const insuranceCompanies = React.useMemo(
    () => insuranceCompaniesData?.body.data ?? [],
    [insuranceCompaniesData]
  );

  const selectedProduct = React.useMemo(
    () => creditProducts.find((item) => item.id === selectedCreditProductId),
    [creditProducts, selectedCreditProductId]
  );
  const categoryOptions = React.useMemo(() => {
    const source = selectedProduct?.creditProductCategories ?? [];
    const unique = new Set(source.map((item) => item.categoryCode));
    return Array.from(unique);
  }, [selectedProduct]);

  React.useEffect(() => {
    form.resetField('categoryCode');
    if (!selectedProduct?.paysInsurance) {
      form.setValue('insuranceCompanyId', null);
    }
  }, [form, selectedCreditProductId, selectedProduct?.paysInsurance]);

  const selectedLoans = React.useMemo(
    () => candidateLoans.filter((item) => selectedLoanIds.includes(item.id)),
    [candidateLoans, selectedLoanIds]
  );

  const selectedTotals = React.useMemo(() => {
    const totalCurrentBalance = selectedLoans.reduce((acc, loan) => acc + loan.currentBalance, 0);
    const totalOverdueBalance = selectedLoans.reduce((acc, loan) => acc + loan.overdueBalance, 0);
    const totalCurrentDueBalance = selectedLoans.reduce((acc, loan) => acc + loan.currentDueBalance, 0);
    const totalOpenInstallments = selectedLoans.reduce((acc, loan) => acc + loan.openInstallments, 0);

    return {
      totalCurrentBalance,
      totalOverdueBalance,
      totalCurrentDueBalance,
      totalOpenInstallments,
      estimatedPrincipal: includeOverdueBalance ? totalCurrentBalance : totalCurrentDueBalance,
    };
  }, [includeOverdueBalance, selectedLoans]);

  const handleConsultLoans = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const normalizedCreditNumber = creditNumberInput.trim();
      if (!normalizedCreditNumber) return;

      try {
        setIsConsultingLoans(true);
        setSimulation(null);

        const originResponse = await api.loan.list.query({
          query: {
            page: 1,
            limit: 1,
            include: ['borrower'],
            sort: [],
            where: { and: [{ creditNumber: { eq: normalizedCreditNumber } }] },
          },
        });

        const originData = (originResponse.body as { data: Loan[] })?.data ?? [];
        const originItem = originData[0];
        if (!originItem) {
          toast.error('No se encontro el credito ingresado');
          setOriginLoan(null);
          setCandidateLoans([]);
          setSelectedLoanIds([]);
          return;
        }

        const borrowerResponse = await api.loan.list.query({
          query: {
            page: 1,
            limit: 200,
            include: ['borrower'],
            sort: [{ field: 'creditStartDate', order: 'desc' }],
            where: {
              and: [
                { thirdPartyId: { eq: originItem.thirdPartyId } },
                { status: { in: ['ACTIVE', 'GENERATED', 'ACCOUNTED', 'RELIQUIDATED'] } },
              ],
            },
          },
        });

        const borrowerLoans = (borrowerResponse.body as { data: Loan[] })?.data ?? [];
        const balanceResponses = await Promise.all(
          borrowerLoans.map((loan) =>
            api.loan.getBalanceSummary.query({
              params: {
                id: loan.id,
              },
            })
          )
        );

        const rows: CandidateLoan[] = borrowerLoans.map((loan, index) => {
          const summary = balanceResponses[index]?.body as LoanBalanceSummaryResponse | undefined;
          return {
            id: loan.id,
            creditNumber: loan.creditNumber,
            status: loan.status,
            principalAmount: Number(loan.principalAmount ?? 0),
            currentBalance: Number(summary?.currentBalance ?? 0),
            overdueBalance: Number(summary?.overdueBalance ?? 0),
            currentDueBalance: Number(summary?.currentDueBalance ?? 0),
            openInstallments: summary?.openInstallments ?? 0,
            nextDueDate: summary?.nextDueDate ?? null,
            isOrigin: loan.id === originItem.id,
          };
        });

        setOriginLoan({
          id: originItem.id,
          creditNumber: originItem.creditNumber,
          status: originItem.status,
          borrowerName: getThirdPartyLabel(originItem.borrower),
          borrowerDocumentNumber: originItem.borrower?.documentNumber ?? null,
        });
        setCandidateLoans(rows);
        setSelectedLoanIds([originItem.id]);
      } catch (error) {
        toast.error(getTsRestErrorMessage(error));
      } finally {
        setIsConsultingLoans(false);
      }
    },
    [creditNumberInput]
  );

  const toggleLoanSelection = React.useCallback(
    (loan: CandidateLoan, checked: boolean) => {
      if (loan.isOrigin) return;

      setSelectedLoanIds((current) => {
        if (checked) {
          return Array.from(new Set([...current, loan.id]));
        }
        return current.filter((id) => id !== loan.id);
      });
      setSimulation(null);
    },
    []
  );

  const { mutateAsync: simulateRefinancing, isPending: isSimulating } = useSimulateLoanRefinancing();

  const onSubmitSimulation = async (values: SimulationParamsForm) => {
    if (!originLoan) {
      toast.error('Primero debe consultar un credito origen');
      return;
    }

    if (!selectedLoanIds.length) {
      toast.error('Debe seleccionar al menos un credito');
      return;
    }

    const response = await simulateRefinancing({
      body: {
        originLoanId: originLoan.id,
        selectedLoanIds,
        includeOverdueBalance: values.includeOverdueBalance,
        creditProductId: values.creditProductId,
        categoryCode: values.categoryCode,
        installments: values.installments,
        paymentFrequencyId: values.paymentFrequencyId,
        firstPaymentDate: values.firstPaymentDate,
        insuranceCompanyId: values.insuranceCompanyId ?? null,
      },
    });

    setSimulation(response.body);
  };

  const isLoadingCatalogs =
    isLoadingCreditProducts || isLoadingPaymentFrequencies || isLoadingInsuranceCompanies;

  return (
    <>
      <PageHeader
        title="Refinanciacion"
        description="Seleccione un credito origen, agregue otros creditos del titular y simule el nuevo plan."
      />
      <PageContent>
        <Card>
          <CardHeader>
            <CardTitle>1. Buscar credito origen</CardTitle>
            <CardDescription>Ingrese el numero de credito para iniciar la refinanciacion.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleConsultLoans}>
              <FieldGroup className="grid gap-3 md:grid-cols-[1fr_auto]">
                <Field>
                  <FieldLabel htmlFor="originCreditNumber">Numero de credito</FieldLabel>
                  <Input
                    id="originCreditNumber"
                    placeholder="Ej: CR2501010001"
                    value={creditNumberInput}
                    onChange={(event) => setCreditNumberInput(event.target.value)}
                  />
                </Field>
                <Button type="submit" className="self-end" disabled={!creditNumberInput.trim() || isConsultingLoans}>
                  {isConsultingLoans ? <Spinner /> : <Search />}
                  Consultar
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>

        {originLoan ? (
          <Card>
            <CardHeader>
              <CardTitle>2. Informacion del credito origen</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              <div>
                <p className="text-muted-foreground text-xs">Credito</p>
                <p className="font-medium">{originLoan.creditNumber}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Titular</p>
                <p className="font-medium">{originLoan.borrowerName}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Documento</p>
                <p className="font-medium">{originLoan.borrowerDocumentNumber ?? '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Estado</p>
                <p className="font-medium">{originLoan.status}</p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {candidateLoans.length ? (
          <Card>
            <CardHeader>
              <CardTitle>3. Seleccionar creditos del titular</CardTitle>
              <CardDescription>
                Puede incluir mas creditos de la misma persona para consolidar en la refinanciacion.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14">Sel.</TableHead>
                    <TableHead>Credito</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Capital</TableHead>
                    <TableHead>Saldo actual</TableHead>
                    <TableHead>Saldo vencido</TableHead>
                    <TableHead>Saldo corriente</TableHead>
                    <TableHead>Cuotas abiertas</TableHead>
                    <TableHead>Proximo venc.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidateLoans.map((loan) => {
                    const isChecked = selectedLoanIds.includes(loan.id);
                    return (
                      <TableRow key={loan.id}>
                        <TableCell>
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(checked) => toggleLoanSelection(loan, Boolean(checked))}
                            disabled={loan.isOrigin}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {loan.creditNumber} {loan.isOrigin ? '(Origen)' : ''}
                        </TableCell>
                        <TableCell>{loan.status}</TableCell>
                        <TableCell>{formatCurrency(loan.principalAmount)}</TableCell>
                        <TableCell>{formatCurrency(loan.currentBalance)}</TableCell>
                        <TableCell>{formatCurrency(loan.overdueBalance)}</TableCell>
                        <TableCell>{formatCurrency(loan.currentDueBalance)}</TableCell>
                        <TableCell>{formatNumber(loan.openInstallments)}</TableCell>
                        <TableCell>{formatDate(loan.nextDueDate)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : null}

        {candidateLoans.length ? (
          <Card>
            <CardHeader>
              <CardTitle>4. Datos del nuevo credito</CardTitle>
              <CardDescription>Configure lo necesario para simular la refinanciacion.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingCatalogs ? (
                <div className="flex items-center gap-2 text-sm">
                  <Spinner />
                  Cargando catalogos...
                </div>
              ) : (
                <form onSubmit={form.handleSubmit(onSubmitSimulation)} className="space-y-4">
                  <FieldGroup>
                    <Controller
                      name="includeOverdueBalance"
                      control={form.control}
                      render={({ field }) => (
                        <Field orientation="horizontal">
                          <Checkbox
                            id="includeOverdueBalance"
                            checked={field.value}
                            onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                          />
                          <FieldLabel htmlFor="includeOverdueBalance">
                            Incluir saldo vencido en el nuevo capital
                          </FieldLabel>
                        </Field>
                      )}
                    />

                    <div className="grid gap-4 md:grid-cols-3">
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
                              <ComboboxContent>
                                <ComboboxInput
                                  placeholder="Buscar linea..."
                                  showClear
                                  showTrigger={false}
                                />
                                <ComboboxList>
                                  <ComboboxEmpty>No se encontraron lineas</ComboboxEmpty>
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
                        name="categoryCode"
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor="categoryCode">Categoria</FieldLabel>
                            <Select
                              onValueChange={(value) => field.onChange(value || undefined)}
                              value={field.value ?? ''}
                              disabled={!selectedCreditProductId}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccione..." />
                              </SelectTrigger>
                              <SelectContent>
                                {categoryOptions.map((code) => (
                                  <SelectItem key={code} value={code}>
                                    {categoryCodeLabels[code]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )}
                      />

                      <Controller
                        name="installments"
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor="installments">Numero de cuotas</FieldLabel>
                            <Input
                              id="installments"
                              type="number"
                              min={1}
                              value={field.value ?? ''}
                              onChange={(event) => field.onChange(Number(event.target.value))}
                            />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )}
                      />

                      <Controller
                        name="paymentFrequencyId"
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor="paymentFrequencyId">Periodicidad</FieldLabel>
                            <Select
                              onValueChange={(value) => field.onChange(value ? Number(value) : undefined)}
                              value={field.value ? String(field.value) : ''}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccione..." />
                              </SelectTrigger>
                              <SelectContent>
                                {paymentFrequencies.map((item) => (
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
                        name="firstPaymentDate"
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor="firstPaymentDate">Fecha primer pago</FieldLabel>
                            <DatePicker
                              id="firstPaymentDate"
                              value={field.value ?? null}
                              onChange={(value) => field.onChange(value ?? new Date())}
                              ariaInvalid={fieldState.invalid}
                            />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )}
                      />

                      {selectedProduct?.paysInsurance ? (
                        <Controller
                          name="insuranceCompanyId"
                          control={form.control}
                          render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                              <FieldLabel htmlFor="insuranceCompanyId">Aseguradora</FieldLabel>
                              <Select
                                onValueChange={(value) =>
                                  field.onChange(value ? Number(value) : undefined)
                                }
                                value={field.value ? String(field.value) : ''}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccione..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {insuranceCompanies.map((item) => (
                                    <SelectItem key={item.id} value={String(item.id)}>
                                      {item.businessName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                            </Field>
                          )}
                        />
                      ) : null}
                    </div>
                  </FieldGroup>

                  <Card className="bg-muted/40 border-dashed">
                    <CardContent className="grid gap-3 pt-6 md:grid-cols-5">
                      <div>
                        <p className="text-muted-foreground text-xs">Creditos seleccionados</p>
                        <p className="font-medium">{formatNumber(selectedLoans.length)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Saldo actual total</p>
                        <p className="font-medium">{formatCurrency(selectedTotals.totalCurrentBalance)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Saldo vencido total</p>
                        <p className="font-medium">{formatCurrency(selectedTotals.totalOverdueBalance)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Saldo corriente total</p>
                        <p className="font-medium">{formatCurrency(selectedTotals.totalCurrentDueBalance)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Capital estimado nuevo</p>
                        <p className="font-medium">{formatCurrency(selectedTotals.estimatedPrincipal)}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="submit" disabled={isSimulating}>
                      {isSimulating ? <Spinner /> : null}
                      Simular
                    </Button>
                    <Button type="button" variant="secondary" disabled>
                      <Lock />
                      Refinanciar (Proximamente)
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        ) : null}

        {simulation ? (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>5. Resultado de la simulacion</CardTitle>
                <CardDescription>
                  Titular: {simulation.borrower.fullName} | Documento:{' '}
                  {simulation.borrower.documentNumber ?? '-'}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-4">
                <div>
                  <p className="text-muted-foreground text-xs">Deuda total actual</p>
                  <p className="font-medium">{formatCurrency(simulation.before.totalCurrentBalance)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Capital a refinanciar</p>
                  <p className="font-medium">{formatCurrency(simulation.after.principalToRefinance)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Cuota estimada actual</p>
                  <p className="font-medium">
                    {formatCurrency(simulation.comparison.estimatedCurrentInstallment)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Cuota estimada nueva</p>
                  <p className="font-medium">{formatCurrency(simulation.comparison.estimatedNewInstallment)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Diferencia cuota</p>
                  <p className="font-medium">{formatCurrency(simulation.comparison.installmentDelta)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Diferencia deuda</p>
                  <p className="font-medium">{formatCurrency(simulation.comparison.debtDelta)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Total proyectado a pagar</p>
                  <p className="font-medium">{formatCurrency(simulation.after.projectedTotalPayment)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Generado</p>
                  <p className="font-medium">{formatDateTime(new Date())}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Creditos incluidos</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Credito</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Saldo actual</TableHead>
                      <TableHead>Saldo vencido</TableHead>
                      <TableHead>Saldo corriente</TableHead>
                      <TableHead>Cuotas abiertas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {simulation.selectedLoans.map((loan) => (
                      <TableRow key={loan.loanId}>
                        <TableCell className="font-medium">{loan.creditNumber}</TableCell>
                        <TableCell>{loan.status}</TableCell>
                        <TableCell>{formatCurrency(loan.currentBalance)}</TableCell>
                        <TableCell>{formatCurrency(loan.overdueBalance)}</TableCell>
                        <TableCell>{formatCurrency(loan.currentDueBalance)}</TableCell>
                        <TableCell>{formatNumber(loan.openInstallments)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Amortizacion (primeras 12 cuotas)</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Vencimiento</TableHead>
                      <TableHead>Capital</TableHead>
                      <TableHead>Interes</TableHead>
                      <TableHead>Seguro</TableHead>
                      <TableHead>Cuota</TableHead>
                      <TableHead>Saldo final</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {simulation.installments.slice(0, 12).map((row) => (
                      <TableRow key={row.installmentNumber}>
                        <TableCell>{row.installmentNumber}</TableCell>
                        <TableCell>{formatDate(row.dueDate)}</TableCell>
                        <TableCell>{formatCurrency(row.principal)}</TableCell>
                        <TableCell>{formatCurrency(row.interest)}</TableCell>
                        <TableCell>{formatCurrency(row.insurance)}</TableCell>
                        <TableCell>{formatCurrency(row.payment)}</TableCell>
                        <TableCell>{formatCurrency(row.closingBalance)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </PageContent>
    </>
  );
}
