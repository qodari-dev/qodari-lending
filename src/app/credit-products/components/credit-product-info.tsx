import { DescriptionList, DescriptionSection } from '@/components/description-list';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { categoryCodeLabels } from '@/schemas/category';
import {
  CreditProduct,
  financingTypeLabels,
  insuranceAccrualMethodLabels,
  insuranceRangeMetricLabels,
  interestAccrualMethodLabels,
  interestRateTypeLabels,
  dayCountConventionLabels,
  riskEvaluationModeLabels,
} from '@/schemas/credit-product';
import {
  billingConceptFinancingModeLabels,
  billingConceptFrequencyLabels,
} from '@/schemas/billing-concept';
import { formatDate } from '@/utils/formatters';

export function CreditProductInfo({
  creditProduct,
  opened,
  onOpened,
}: {
  creditProduct: CreditProduct | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  if (!creditProduct) return null;

  type RequiredDocumentView = {
    id: number;
    documentTypeId: number;
    isRequired: boolean;
    documentType?: { name: string };
  };

  type AccountView = {
    id: number;
    capitalGlAccountId: number;
    interestGlAccountId: number;
    lateInterestGlAccountId: number;
    capitalGlAccount?: { code: string; name: string };
    interestGlAccount?: { code: string; name: string };
    lateInterestGlAccount?: { code: string; name: string };
  };

  type BillingConceptView = {
    id: number;
    billingConceptId: number;
    isEnabled: boolean;
    overrideFrequency: 'ONE_TIME' | 'MONTHLY' | 'PER_INSTALLMENT' | null;
    overrideFinancingMode:
      | 'DISCOUNT_FROM_DISBURSEMENT'
      | 'FINANCED_IN_LOAN'
      | 'BILLED_SEPARATELY'
      | null;
    overrideGlAccountId: number | null;
    overrideRuleId: number | null;
    billingConcept?: { code: string; name: string };
    overrideGlAccount?: { code: string; name: string };
  };

  const requiredDocuments = ((creditProduct as unknown as { creditProductDocuments?: unknown[] })
    .creditProductDocuments ?? []) as RequiredDocumentView[];

  const accounts = ((creditProduct as unknown as { creditProductAccounts?: unknown[] })
    .creditProductAccounts ?? []) as AccountView[];
  const account = accounts[0];

  const billingConcepts = ((creditProduct as unknown as { creditProductBillingConcepts?: unknown[] })
    .creditProductBillingConcepts ?? []) as BillingConceptView[];

  const sections: DescriptionSection[] = [
    {
      title: 'General',
      columns: 2,
      items: [
        { label: 'Nombre', value: creditProduct.name },
        { label: 'Fondo', value: creditProduct.creditFund?.name ?? creditProduct.creditFundId },
        {
          label: 'Politica aplicacion',
          value: creditProduct.paymentAllocationPolicy?.name ?? creditProduct.paymentAllocationPolicyId,
        },
        { label: 'Modelo XML', value: creditProduct.xmlModelId ?? '-' },
        {
          label: 'Tipo financiacion',
          value: financingTypeLabels[creditProduct.financingType] ?? creditProduct.financingType,
        },
      ],
    },
    {
      title: 'Interes corriente',
      columns: 2,
      items: [
        {
          label: 'Tipo de tasa',
          value:
            interestRateTypeLabels[creditProduct.interestRateType] ??
            creditProduct.interestRateType,
        },
        {
          label: 'Causacion',
          value:
            interestAccrualMethodLabels[creditProduct.interestAccrualMethod] ??
            creditProduct.interestAccrualMethod,
        },
        {
          label: 'Convencion de dias',
          value:
            dayCountConventionLabels[creditProduct.interestDayCountConvention] ??
            creditProduct.interestDayCountConvention,
        },
      ],
    },
    {
      title: 'Mora',
      columns: 2,
      items: [
        {
          label: 'Tipo de tasa mora',
          value:
            interestRateTypeLabels[creditProduct.lateInterestRateType] ??
            creditProduct.lateInterestRateType,
        },
        {
          label: 'Causacion mora',
          value:
            interestAccrualMethodLabels[creditProduct.lateInterestAccrualMethod] ??
            creditProduct.lateInterestAccrualMethod,
        },
        {
          label: 'Convencion de dias mora',
          value:
            dayCountConventionLabels[creditProduct.lateInterestDayCountConvention] ??
            creditProduct.lateInterestDayCountConvention,
        },
      ],
    },
    {
      title: 'Seguro',
      columns: 2,
      items: [
        {
          label: 'Paga seguro',
          value: (
            <Badge variant={creditProduct.paysInsurance ? 'default' : 'outline'}>
              {creditProduct.paysInsurance ? 'Si' : 'No'}
            </Badge>
          ),
        },
        {
          label: 'Metrica seguro',
          value: creditProduct.paysInsurance
            ? (insuranceRangeMetricLabels[creditProduct.insuranceRangeMetric] ??
              creditProduct.insuranceRangeMetric)
            : '-',
        },
        {
          label: 'Causacion seguro',
          value: creditProduct.paysInsurance
            ? (insuranceAccrualMethodLabels[creditProduct.insuranceAccrualMethod] ??
              creditProduct.insuranceAccrualMethod)
            : '-',
        },
      ],
    },
    {
      title: 'Distribuciones contables',
      columns: 2,
      items: [
        {
          label: 'Distribucion capital',
          value:
            creditProduct.capitalDistribution?.name ?? creditProduct.capitalDistributionId,
        },
        {
          label: 'Distribucion interes',
          value:
            creditProduct.interestDistribution?.name ?? creditProduct.interestDistributionId,
        },
        {
          label: 'Distribucion mora',
          value:
            creditProduct.lateInterestDistribution?.name ?? creditProduct.lateInterestDistributionId,
        },
      ],
    },
    {
      title: 'Parametros operativos y riesgo',
      columns: 2,
      items: [
        { label: 'Maximo cuotas', value: creditProduct.maxInstallments ?? '-' },
        {
          label: 'Modo riesgo',
          value:
            riskEvaluationModeLabels[creditProduct.riskEvaluationMode] ??
            creditProduct.riskEvaluationMode,
        },
        { label: 'Score minimo riesgo', value: creditProduct.riskMinScore ?? '-' },
      ],
    },
    {
      title: 'Estado y reportes',
      columns: 2,
      items: [
        {
          label: 'Reporta centrales',
          value: (
            <Badge variant={creditProduct.reportsToCreditBureau ? 'default' : 'outline'}>
              {creditProduct.reportsToCreditBureau ? 'Si' : 'No'}
            </Badge>
          ),
        },
        {
          label: 'Estado',
          value: (
            <Badge variant={creditProduct.isActive ? 'default' : 'outline'}>
              {creditProduct.isActive ? 'Activo' : 'Inactivo'}
            </Badge>
          ),
        },
      ],
    },
    {
      title: 'Actividad',
      columns: 2,
      items: [
        { label: 'Creado', value: formatDate(creditProduct.createdAt) },
        { label: 'Actualizado', value: formatDate(creditProduct.updatedAt) },
      ],
    },
  ];

  return (
    <Sheet open={opened} onOpenChange={(open) => onOpened(open)}>
      <SheetContent className="overflow-y-scroll sm:max-w-4xl">
        <SheetHeader>
          <SheetTitle>Informacion</SheetTitle>
        </SheetHeader>
        <div className="px-4">
          <Tabs defaultValue="product" className="w-full">
            <TabsList className="mb-4 w-full justify-start overflow-x-auto">
              <TabsTrigger value="product">Producto</TabsTrigger>
              <TabsTrigger value="categories">Categorias</TabsTrigger>
              <TabsTrigger value="lateRules">Reglas mora</TabsTrigger>
              <TabsTrigger value="documents">Documentos</TabsTrigger>
              <TabsTrigger value="accounts">Cuentas</TabsTrigger>
              <TabsTrigger value="billingConcepts">Conceptos</TabsTrigger>
              <TabsTrigger value="refinance">Refinanciacion</TabsTrigger>
              <TabsTrigger value="chargeOff">Castigo cartera</TabsTrigger>
            </TabsList>

            <TabsContent value="product">
              <DescriptionList sections={sections} columns={2} />
            </TabsContent>

            <TabsContent value="categories" className="space-y-2">
              <h3 className="text-sm font-semibold">Categorias</h3>
              {creditProduct.creditProductCategories?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Rango cuotas</TableHead>
                      <TableHead>Factor fin.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {creditProduct.creditProductCategories.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{categoryCodeLabels[item.categoryCode]}</TableCell>
                        <TableCell>
                          {item.installmentsFrom} - {item.installmentsTo}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{item.financingFactor}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
                  No hay categorias configuradas.
                </div>
              )}
            </TabsContent>

            <TabsContent value="lateRules" className="space-y-2">
              <h3 className="text-sm font-semibold">Reglas de mora</h3>
              {creditProduct.creditProductLateInterestRules?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Rango dias</TableHead>
                      <TableHead>Factor mora</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {creditProduct.creditProductLateInterestRules.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{categoryCodeLabels[item.categoryCode]}</TableCell>
                        <TableCell>
                          {item.daysFrom} - {item.daysTo ?? '...'}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{item.lateFactor}</TableCell>
                        <TableCell>
                          <Badge variant={item.isActive ? 'default' : 'outline'}>
                            {item.isActive ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
                  No hay reglas de mora configuradas.
                </div>
              )}
            </TabsContent>

            <TabsContent value="documents" className="space-y-2">
              <h3 className="text-sm font-semibold">Documentos requeridos</h3>
              {requiredDocuments.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Documento</TableHead>
                      <TableHead>Obligatorio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requiredDocuments.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.documentType?.name ?? item.documentTypeId}</TableCell>
                        <TableCell>
                          <Badge variant={item.isRequired ? 'default' : 'outline'}>
                            {item.isRequired ? 'Si' : 'No'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
                  No hay documentos configurados.
                </div>
              )}
            </TabsContent>

            <TabsContent value="accounts" className="space-y-2">
              <h3 className="text-sm font-semibold">Cuentas contables</h3>
              {account ? (
                <div className="space-y-3">
                  <DescriptionList
                    columns={2}
                    sections={[
                      {
                        title: 'Configuracion',
                        columns: 2,
                        items: [
                          {
                            label: 'Cuenta capital',
                            value: account.capitalGlAccount
                              ? `${account.capitalGlAccount.code} - ${account.capitalGlAccount.name}`
                              : account.capitalGlAccountId,
                          },
                          {
                            label: 'Cuenta interes',
                            value: account.interestGlAccount
                              ? `${account.interestGlAccount.code} - ${account.interestGlAccount.name}`
                              : account.interestGlAccountId,
                          },
                          {
                            label: 'Cuenta mora',
                            value: account.lateInterestGlAccount
                              ? `${account.lateInterestGlAccount.code} - ${account.lateInterestGlAccount.name}`
                              : account.lateInterestGlAccountId,
                          },
                        ],
                      },
                    ]}
                  />
                  {accounts.length > 1 ? (
                    <div className="text-muted-foreground rounded-md border border-dashed p-3 text-xs">
                      Se encontraron multiples configuraciones de cuentas; se muestra la primera.
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
                  No hay cuentas configuradas.
                </div>
              )}
            </TabsContent>

            <TabsContent value="billingConcepts" className="space-y-2">
              <h3 className="text-sm font-semibold">Conceptos de facturacion</h3>
              {billingConcepts.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Concepto</TableHead>
                      <TableHead>Frecuencia</TableHead>
                      <TableHead>Modo</TableHead>
                      <TableHead>Cuenta</TableHead>
                      <TableHead>Regla</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billingConcepts.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          {item.billingConcept
                            ? `${item.billingConcept.code} - ${item.billingConcept.name}`
                            : item.billingConceptId}
                        </TableCell>
                        <TableCell>
                          {item.overrideFrequency
                            ? billingConceptFrequencyLabels[item.overrideFrequency]
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {item.overrideFinancingMode
                            ? billingConceptFinancingModeLabels[item.overrideFinancingMode]
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {item.overrideGlAccount
                            ? `${item.overrideGlAccount.code} - ${item.overrideGlAccount.name}`
                            : '-'}
                        </TableCell>
                        <TableCell>{item.overrideRuleId ? `Regla #${item.overrideRuleId}` : '-'}</TableCell>
                        <TableCell>
                          <Badge variant={item.isEnabled ? 'default' : 'outline'}>
                            {item.isEnabled ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
                  No hay conceptos configurados.
                </div>
              )}
            </TabsContent>

            <TabsContent value="refinance" className="space-y-2">
              <h3 className="text-sm font-semibold">Politica de refinanciacion</h3>
              {creditProduct.creditProductRefinancePolicy ? (
                <DescriptionList
                  columns={2}
                  sections={[
                    {
                      title: 'Configuracion',
                      columns: 2,
                      items: [
                        {
                          label: 'Permite refinanciacion',
                          value: (
                            <Badge
                              variant={
                                creditProduct.creditProductRefinancePolicy.allowRefinance
                                  ? 'default'
                                  : 'outline'
                              }
                            >
                              {creditProduct.creditProductRefinancePolicy.allowRefinance
                                ? 'Si'
                                : 'No'}
                            </Badge>
                          ),
                        },
                        {
                          label: 'Permite consolidacion',
                          value: (
                            <Badge
                              variant={
                                creditProduct.creditProductRefinancePolicy.allowConsolidation
                                  ? 'default'
                                  : 'outline'
                              }
                            >
                              {creditProduct.creditProductRefinancePolicy.allowConsolidation
                                ? 'Si'
                                : 'No'}
                            </Badge>
                          ),
                        },
                        {
                          label: 'Maximo creditos a consolidar',
                          value:
                            creditProduct.creditProductRefinancePolicy.maxLoansToConsolidate,
                        },
                        {
                          label: 'Minimo edad credito (dias)',
                          value: creditProduct.creditProductRefinancePolicy.minLoanAgeDays,
                        },
                        {
                          label: 'Maximo mora permitida (dias)',
                          value: creditProduct.creditProductRefinancePolicy.maxDaysPastDue,
                        },
                        {
                          label: 'Minimo cuotas pagadas',
                          value: creditProduct.creditProductRefinancePolicy.minPaidInstallments,
                        },
                        {
                          label: 'Maximo refinanciaciones',
                          value: creditProduct.creditProductRefinancePolicy.maxRefinanceCount,
                        },
                        {
                          label: 'Capitaliza mora',
                          value: (
                            <Badge
                              variant={
                                creditProduct.creditProductRefinancePolicy.capitalizeArrears
                                  ? 'default'
                                  : 'outline'
                              }
                            >
                              {creditProduct.creditProductRefinancePolicy.capitalizeArrears
                                ? 'Si'
                                : 'No'}
                            </Badge>
                          ),
                        },
                        {
                          label: 'Requiere aprobacion',
                          value: (
                            <Badge
                              variant={
                                creditProduct.creditProductRefinancePolicy.requireApproval
                                  ? 'default'
                                  : 'outline'
                              }
                            >
                              {creditProduct.creditProductRefinancePolicy.requireApproval
                                ? 'Si'
                                : 'No'}
                            </Badge>
                          ),
                        },
                        {
                          label: 'Estado',
                          value: (
                            <Badge
                              variant={
                                creditProduct.creditProductRefinancePolicy.isActive
                                  ? 'default'
                                  : 'outline'
                              }
                            >
                              {creditProduct.creditProductRefinancePolicy.isActive
                                ? 'Activo'
                                : 'Inactivo'}
                            </Badge>
                          ),
                        },
                      ],
                    },
                  ]}
                />
              ) : (
                <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
                  No hay politica configurada.
                </div>
              )}
            </TabsContent>

            <TabsContent value="chargeOff" className="space-y-2">
              <h3 className="text-sm font-semibold">Politica de castigo de cartera</h3>
              {creditProduct.creditProductChargeOffPolicy ? (
                <DescriptionList
                  columns={2}
                  sections={[
                    {
                      title: 'Configuracion',
                      columns: 2,
                      items: [
                        {
                          label: 'Permite castigo',
                          value: (
                            <Badge
                              variant={
                                creditProduct.creditProductChargeOffPolicy.allowChargeOff
                                  ? 'default'
                                  : 'outline'
                              }
                            >
                              {creditProduct.creditProductChargeOffPolicy.allowChargeOff
                                ? 'Si'
                                : 'No'}
                            </Badge>
                          ),
                        },
                        {
                          label: 'Minimo mora (dias)',
                          value: creditProduct.creditProductChargeOffPolicy.minDaysPastDue,
                        },
                      ],
                    },
                  ]}
                />
              ) : (
                <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
                  No hay politica de castigo configurada.
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
