'use client';

import { DescriptionList, DescriptionSection } from '@/components/description-list';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePresignLoanApplicationDocumentView } from '@/hooks/queries/use-loan-application-queries';
import { financingTypeLabels } from '@/schemas/credit-product';
import {
  bankAccountTypeLabels,
  categoryCodeLabels,
  LoanApplication,
  loanApplicationStatusLabels,
} from '@/schemas/loan-application';
import { calculateCreditSimulation } from '@/utils/credit-simulation';
import { formatCurrency, formatDate, formatPercent } from '@/utils/formatters';
import { assessPaymentCapacity } from '@/utils/payment-capacity';
import {
  formatPaymentFrequencyRule,
  resolvePaymentFrequencyIntervalDays,
} from '@/utils/payment-frequency';
import { getThirdPartyLabel } from '@/utils/third-party';
import { Eye } from 'lucide-react';
import { useMemo } from 'react';

function getApplicantLabel(application: LoanApplication): string {
  const person = application.thirdParty;
  if (!person) return String(application.thirdPartyId);
  return getThirdPartyLabel(person);
}

export function LoanApplicationDetails({
  loanApplication,
  className,
}: {
  loanApplication: LoanApplication;
  className?: string;
}) {
  const { mutateAsync: presignView } = usePresignLoanApplicationDocumentView();
  const amortizationData = useMemo(() => {
    const financingType = loanApplication.creditProduct?.financingType;
    const daysInterval = loanApplication.paymentFrequency
      ? resolvePaymentFrequencyIntervalDays({
          scheduleMode: loanApplication.paymentFrequency.scheduleMode,
          intervalDays: loanApplication.paymentFrequency.intervalDays,
          dayOfMonth: loanApplication.paymentFrequency.dayOfMonth,
          semiMonthDay1: loanApplication.paymentFrequency.semiMonthDay1,
          semiMonthDay2: loanApplication.paymentFrequency.semiMonthDay2,
        })
      : 0;
    const installments = Number(loanApplication.installments ?? 0);
    const principal = Number(loanApplication.approvedAmount ?? loanApplication.requestedAmount ?? 0);
    const annualRatePercent = Number(loanApplication.financingFactor ?? 0);
    const insuranceRatePercent = Number(loanApplication.insuranceFactor ?? 0);
    const firstPaymentDate = loanApplication.applicationDate
      ? new Date(`${loanApplication.applicationDate}T00:00:00`)
      : null;

    if (!financingType || !daysInterval || !installments || !firstPaymentDate) {
      return null;
    }

    if (Number.isNaN(firstPaymentDate.getTime())) {
      return null;
    }

    return calculateCreditSimulation({
      financingType,
      principal,
      annualRatePercent,
      interestRateType: loanApplication.creditProduct?.interestRateType,
      interestDayCountConvention: loanApplication.creditProduct?.interestDayCountConvention,
      installments,
      firstPaymentDate,
      daysInterval,
      paymentScheduleMode: loanApplication.paymentFrequency?.scheduleMode,
      dayOfMonth: loanApplication.paymentFrequency?.dayOfMonth ?? null,
      semiMonthDay1: loanApplication.paymentFrequency?.semiMonthDay1 ?? null,
      semiMonthDay2: loanApplication.paymentFrequency?.semiMonthDay2 ?? null,
      useEndOfMonthFallback: loanApplication.paymentFrequency?.useEndOfMonthFallback,
      insuranceAccrualMethod: loanApplication.creditProduct?.insuranceAccrualMethod,
      insuranceRatePercent,
    });
  }, [loanApplication]);

  const paymentCapacityAssessment = useMemo(() => {
    if (!amortizationData) return null;
    return assessPaymentCapacity({
      paymentCapacity: loanApplication.paymentCapacity,
      installmentPayment: amortizationData.summary.maxInstallmentPayment,
    });
  }, [amortizationData, loanApplication.paymentCapacity]);

  const openDocumentFile = async (fileKey: string) => {
    const response = await presignView({ body: { fileKey } });
    window.open(response.body.viewUrl, '_blank', 'noopener,noreferrer');
  };
  const applicant = loanApplication.thirdParty;
  const applicantDocument = applicant
    ? `${applicant.identificationType?.name ?? 'Documento'} ${applicant.documentNumber}${applicant.verificationDigit ? `-${applicant.verificationDigit}` : ''}`
    : String(loanApplication.thirdPartyId);
  const applicantPersonType = applicant
    ? applicant.personType === 'LEGAL'
      ? 'Juridica'
      : 'Natural'
    : '-';
  const paymentFrequencyLabel = loanApplication.paymentFrequency
    ? `${loanApplication.paymentFrequency.name} (${formatPaymentFrequencyRule({
        scheduleMode: loanApplication.paymentFrequency.scheduleMode,
        intervalDays: loanApplication.paymentFrequency.intervalDays,
        dayOfMonth: loanApplication.paymentFrequency.dayOfMonth,
        semiMonthDay1: loanApplication.paymentFrequency.semiMonthDay1,
        semiMonthDay2: loanApplication.paymentFrequency.semiMonthDay2,
      })})`
    : loanApplication.paymentFrequencyId ?? '-';
  const financingTypeLabel = loanApplication.creditProduct?.financingType
    ? (financingTypeLabels[loanApplication.creditProduct.financingType] ??
      loanApplication.creditProduct.financingType)
    : '-';
  const applicantCategoryLabel = applicant?.categoryCode
    ? (categoryCodeLabels[applicant.categoryCode] ?? applicant.categoryCode)
    : '-';

  const sections: DescriptionSection[] = [
    {
      title: 'Solicitud',
      columns: 3,
      items: [
        { label: 'Numero solicitud', value: loanApplication.creditNumber },
        {
          label: 'Estado',
          value: (
            <Badge variant={loanApplication.status === 'PENDING' ? 'outline' : 'default'}>
              {loanApplicationStatusLabels[loanApplication.status]}
            </Badge>
          ),
        },
        { label: 'Fecha solicitud', value: formatDate(loanApplication.applicationDate) },
        {
          label: 'Oficina',
          value: loanApplication.affiliationOffice?.name ?? loanApplication.affiliationOfficeId,
        },
        { label: 'Canal', value: loanApplication.channel?.name ?? loanApplication.channelId },
        { label: 'Acta', value: loanApplication.actNumber ?? '-' },
        { label: 'Motivo rechazo', value: loanApplication.rejectionReason?.name ?? '-' },
      ],
    },
    {
      title: 'Credito y condiciones',
      columns: 3,
      items: [
        {
          label: 'Producto',
          value: loanApplication.creditProduct?.name ?? loanApplication.creditProductId,
        },
        { label: 'Fondo', value: loanApplication.creditFund?.name ?? loanApplication.creditFundId },
        { label: 'Categoria solicitud', value: categoryCodeLabels[loanApplication.categoryCode] },
        { label: 'Tipo financiacion', value: financingTypeLabel },
        { label: 'Periodicidad', value: paymentFrequencyLabel },
        { label: 'Cuotas', value: loanApplication.installments },
        { label: 'Tasa financiacion', value: formatPercent(loanApplication.financingFactor, 4) },
        { label: 'Tasa seguro', value: formatPercent(loanApplication.insuranceFactor, 4) },
        { label: 'Valor solicitado', value: formatCurrency(loanApplication.requestedAmount) },
        { label: 'Valor aprobado', value: formatCurrency(loanApplication.approvedAmount ?? '-') },
      ],
    },
    {
      title: 'Capacidad y desembolso',
      columns: 3,
      items: [
        { label: 'Salario', value: formatCurrency(loanApplication.salary) },
        { label: 'Otros ingresos', value: formatCurrency(loanApplication.otherIncome) },
        { label: 'Otros creditos', value: formatCurrency(loanApplication.otherCredits) },
        { label: 'Capacidad de pago', value: formatCurrency(loanApplication.paymentCapacity) },
        {
          label: 'Viabilidad cuota estimada',
          value: paymentCapacityAssessment
            ? paymentCapacityAssessment.canPay
              ? `Puede pagar (margen ${formatCurrency(paymentCapacityAssessment.margin)})`
              : `No puede pagar (faltante ${formatCurrency(paymentCapacityAssessment.shortfall)})`
            : 'No evaluable',
        },
        { label: 'Forma de pago', value: loanApplication.repaymentMethod?.name ?? '-' },
        { label: 'Garantia de pago', value: loanApplication.paymentGuaranteeType?.name ?? '-' },
        { label: 'Banco', value: loanApplication.bank?.name ?? loanApplication.bankId },
        { label: 'Tipo de cuenta', value: bankAccountTypeLabels[loanApplication.bankAccountType] },
        { label: 'Cuenta', value: loanApplication.bankAccountNumber },
        {
          label: 'Aseguradora',
          value: loanApplication.insuranceCompany?.businessName ?? '-',
        },
      ],
    },
    {
      title: 'Solicitante (Tercero)',
      columns: 3,
      items: [
        { label: 'Solicitante', value: getApplicantLabel(loanApplication) },
        { label: 'Tipo de persona', value: applicantPersonType },
        { label: 'Documento', value: applicantDocument },
        { label: 'Tipo de tercero', value: applicant?.thirdPartyType?.name ?? '-' },
        { label: 'Categoria tercero', value: applicantCategoryLabel },
        { label: 'Email', value: applicant?.email ?? '-' },
        { label: 'Celular', value: applicant?.mobilePhone ?? '-' },
        { label: 'Telefono hogar', value: applicant?.homePhone ?? '-' },
        { label: 'Telefono trabajo', value: applicant?.workPhone ?? '-' },
        { label: 'Direccion hogar', value: applicant?.homeAddress ?? '-' },
        { label: 'Ciudad hogar', value: applicant?.homeCity?.name ?? '-' },
        { label: 'Direccion trabajo', value: applicant?.workAddress ?? '-' },
        { label: 'Ciudad trabajo', value: applicant?.workCity?.name ?? '-' },
      ],
    },
    {
      title: 'Seguimiento',
      columns: 2,
      items: [
        { label: 'Creado', value: formatDate(loanApplication.createdAt) },
        { label: 'Actualizado', value: formatDate(loanApplication.updatedAt) },
        { label: 'Nota', value: loanApplication.note ?? '-' },
        { label: 'Nota estado', value: loanApplication.statusNote ?? '-' },
      ],
    },
  ];

  return (
    <div className={className}>
      <div className="space-y-6">
        <DescriptionList sections={sections} columns={2} />

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Tabla de amortizacion estimada</h3>
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
          ) : null}
          {amortizationData ? (
            <div className="max-h-120 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cuota</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Saldo inicial</TableHead>
                    <TableHead>Capital</TableHead>
                    <TableHead>Interes</TableHead>
                    <TableHead>Seguro</TableHead>
                    <TableHead>Pago</TableHead>
                    <TableHead>Saldo final</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {amortizationData.installments.map((item) => (
                    <TableRow key={item.installmentNumber}>
                      <TableCell>{item.installmentNumber}</TableCell>
                      <TableCell>{item.dueDate}</TableCell>
                      <TableCell>{formatCurrency(item.openingBalance)}</TableCell>
                      <TableCell>{formatCurrency(item.principal)}</TableCell>
                      <TableCell>{formatCurrency(item.interest)}</TableCell>
                      <TableCell>{formatCurrency(item.insurance)}</TableCell>
                      <TableCell>{formatCurrency(item.payment)}</TableCell>
                      <TableCell>{formatCurrency(item.closingBalance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
              No se pudo calcular la tabla de amortizacion (faltan datos de tasa o periodicidad).
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Codeudores</h3>
          {loanApplication.loanApplicationCoDebtors?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Documento</TableHead>
                  <TableHead>Codeudor</TableHead>
                  <TableHead>Ciudad hogar</TableHead>
                  <TableHead>Ciudad trabajo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loanApplication.loanApplicationCoDebtors.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.thirdParty?.documentNumber ?? row.thirdPartyId ?? '-'}</TableCell>
                    <TableCell>{getThirdPartyLabel(row.thirdParty)}</TableCell>
                    <TableCell>{row.thirdParty?.homeCity?.name ?? '-'}</TableCell>
                    <TableCell>{row.thirdParty?.workCity?.name ?? '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
              No hay codeudores asociados.
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Documentos</h3>
          {loanApplication.loanApplicationDocuments?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Documento</TableHead>
                  <TableHead>Entregado</TableHead>
                  <TableHead>Archivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loanApplication.loanApplicationDocuments.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.documentType?.name ?? row.documentTypeId}</TableCell>
                    <TableCell>{row.isDelivered ? 'Si' : 'No'}</TableCell>
                    <TableCell>
                      {row.fileKey ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => row.fileKey && openDocumentFile(row.fileKey)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Ver archivo
                        </Button>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
              No hay documentos.
            </div>
          )}
        </div>

        {loanApplication.pledgesSubsidy ? (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Pignoraciones</h3>
            {loanApplication.loanApplicationPledges?.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Codigo</TableHead>
                    <TableHead>Beneficiario</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loanApplication.loanApplicationPledges.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.pledgeCode}</TableCell>
                      <TableCell>{row.beneficiaryCode}</TableCell>
                      <TableCell>{formatCurrency(row.pledgedAmount)}</TableCell>
                      <TableCell>{formatDate(row.effectiveDate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
                No hay pignoraciones.
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
