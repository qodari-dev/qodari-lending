'use client';

import { useCallback, useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Download, FileDown, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { DescriptionList, DescriptionSection } from '@/components/description-list';
import { LoanApplicationDetails } from '@/app/loan-applications/components/loan-application-details';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCreditExtractReportByLoanId } from '@/hooks/queries/use-credit-report-queries';
import {
  useLoan,
  usePresignLoanSignatureFileView,
  useResendLoanSignatureEnvelope,
  useSendLoanToSignature,
} from '@/hooks/queries/use-loan-queries';
import {
  billingConceptCalcMethodLabels,
  billingConceptFinancingModeLabels,
  billingConceptFrequencyLabels,
} from '@/schemas/billing-concept';
import {
  installmentRecordStatusLabels,
  loanDisbursementStatusLabels,
  LoanInclude,
  loanPaymentStatusLabels,
  loanStatusLabels,
  Loan,
  LoanStatus,
} from '@/schemas/loan';
import { BankAccountType, bankAccountTypeLabels } from '@/schemas/loan-application';
import { signerRoleLabels } from '@/schemas/document-template';
import {
  loanDocumentStatusLabels,
  signatureEnvelopeStatusLabels,
  signatureSignerStatusLabels,
  signatureProviderLabels,
} from '@/schemas/signature-webhook';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate, formatDateTime, formatPercent } from '@/utils/formatters';
import { getThirdPartyLabel } from '@/utils/third-party';

const LOAN_DOCUMENT_TYPES = [
  'plan-de-pagos',
  'pignoracion',
  'pagare',
  'carta-instrucciones',
  'liquidacion',
  'aceptacion',
  'libranza',
] as const;

type LoanDocumentType = (typeof LOAN_DOCUMENT_TYPES)[number];

const loanDocumentLabels: Record<LoanDocumentType, string> = {
  'plan-de-pagos': 'Plan de pagos',
  pignoracion: 'Pignoración',
  pagare: 'Pagaré',
  'carta-instrucciones': 'Carta de instrucciones',
  liquidacion: 'Liquidación del crédito',
  aceptacion: 'Aceptación del crédito',
  libranza: 'Libranza',
};

function getSignatureBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'SIGNED') return 'default';
  if (status === 'SENT' || status === 'PARTIALLY_SIGNED' || status === 'VIEWED') return 'secondary';
  if (status === 'REJECTED' || status === 'ERROR') return 'destructive';
  return 'outline';
}

function toTimestamp(value: string | Date | null | undefined): number {
  if (!value) return 0;
  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();
  return Number.isNaN(time) ? 0 : time;
}

function extensionFromMimeType(mimeType: string): string {
  const normalized = mimeType.toLowerCase();
  if (normalized.includes('pdf')) return 'pdf';
  if (normalized.includes('json')) return 'json';
  if (normalized.includes('xml')) return 'xml';
  if (normalized.includes('zip')) return 'zip';
  return 'bin';
}

function StatusBadge({ status }: { status: LoanStatus }) {
  return (
    <Badge variant={status === 'ACTIVE' ? 'default' : 'outline'}>{loanStatusLabels[status]}</Badge>
  );
}

function LoanDocumentsTab({ loanId, creditNumber }: { loanId: number; creditNumber: string }) {
  const [printDate, setPrintDate] = useState<Date>(new Date());
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = useCallback(
    async (docType: LoanDocumentType) => {
      try {
        setDownloading(docType);
        const dateStr = format(printDate, 'yyyy-MM-dd');
        const response = await fetch(
          `/api/v1/loans/${loanId}/documents/${docType}/pdf?printDate=${dateStr}`,
          { method: 'GET', credentials: 'include' }
        );

        if (!response.ok) {
          let message = 'No fue posible generar el PDF';
          try {
            const body = (await response.json()) as { message?: string };
            if (body?.message) message = body.message;
          } catch {
            // keep fallback message
          }
          toast.error(message);
          return;
        }

        const blob = await response.blob();
        const objectUrl = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = `${docType}-${creditNumber}.pdf`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.URL.revokeObjectURL(objectUrl);
      } catch {
        toast.error('No fue posible descargar el PDF');
      } finally {
        setDownloading(null);
      }
    },
    [loanId, creditNumber, printDate]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Fecha de impresion</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn('w-[220px] justify-start text-left font-normal')}
              >
                <CalendarIcon className="mr-2 size-4" />
                {format(printDate, 'PPP')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={printDate}
                onSelect={(value) => setPrintDate(value ?? new Date())}
                captionLayout="dropdown"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {LOAN_DOCUMENT_TYPES.map((docType) => (
          <Button
            key={docType}
            variant="outline"
            className="justify-start"
            disabled={downloading !== null}
            onClick={() => handleDownload(docType)}
          >
            {downloading === docType ? (
              <Spinner className="mr-2" />
            ) : (
              <FileDown className="mr-2 size-4" />
            )}
            {loanDocumentLabels[docType]}
          </Button>
        ))}
      </div>
    </div>
  );
}

const LOAN_DETAIL_INCLUDES: LoanInclude[] = [
  'borrower',
  'disbursementParty',
  'bank',
  'agreement',
  'creditFund',
  'repaymentMethod',
  'paymentFrequency',
  'paymentGuaranteeType',
  'affiliationOffice',
  'insuranceCompany',
  'costCenter',
  'channel',
  'loanProcessStates',
  'loanInstallments',
  'loanPayments',
  'portfolioEntries',
  'accountingEntries',
  'loanAgreementHistory',
  'loanStatusHistory',
  'loanBillingConcepts',
  'loanDocumentInstances',
  'signatureEnvelopes',
  'loanRefinancingLinksRefinanced',
  'loanRefinancingLinksReference',
  'loanApplication',
];

export function LoanInfo({
  loan,
  opened,
  onOpened,
}: {
  loan: Loan | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  const loanId = loan?.id ?? 0;
  const [signatureActionKey, setSignatureActionKey] = useState<string | null>(null);
  const [newSignatureRequestTarget, setNewSignatureRequestTarget] = useState<{
    envelopeId: number;
    providerEnvelopeId: string;
  } | null>(null);
  const { mutateAsync: presignSignatureFileView } = usePresignLoanSignatureFileView();
  const { mutateAsync: resendSignatureEnvelope } = useResendLoanSignatureEnvelope();
  const { mutateAsync: sendLoanToSignature } = useSendLoanToSignature();

  const { data: detailData, isLoading: isLoadingDetail } = useLoan(loanId, {
    include: LOAN_DETAIL_INCLUDES,
    enabled: opened && Boolean(loanId),
  });
  const {
    data: extractReportData,
    isLoading: isLoadingExtract,
    isFetching: isFetchingExtract,
  } = useCreditExtractReportByLoanId(loanId, opened && Boolean(loanId));

  const detail = detailData?.body ?? loan;
  const effectiveLoanId = detail?.id ?? loanId;
  const extractReport = extractReportData?.body;
  const loanProcessStatesRaw = (detail as { loanProcessStates?: unknown } | undefined)
    ?.loanProcessStates;
  const loanProcessStatesRows = (
    Array.isArray(loanProcessStatesRaw)
      ? loanProcessStatesRaw
      : loanProcessStatesRaw
        ? [loanProcessStatesRaw]
        : []
  ) as Array<{
    processType: string;
    lastProcessedDate: string;
    lastProcessRunId: number;
    lastError?: string | null;
    lastProcessRun?: {
      processDate: string;
      transactionDate: string;
      status: string;
      triggerSource: string;
    } | null;
  }>;
  const signatureDocuments = [...(detail?.loanDocumentInstances ?? [])].sort(
    (a, b) => toTimestamp(b.generatedAt) - toTimestamp(a.generatedAt)
  );
  const signatureEnvelopes = [...(detail?.signatureEnvelopes ?? [])].sort(
    (a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt)
  );
  const envelopeByDocumentId = new Map<number, Array<(typeof signatureEnvelopes)[number]>>();
  for (const envelope of signatureEnvelopes) {
    for (const envelopeDocument of envelope.signatureEnvelopeDocuments ?? []) {
      const current = envelopeByDocumentId.get(envelopeDocument.loanDocumentInstanceId) ?? [];
      current.push(envelope);
      envelopeByDocumentId.set(envelopeDocument.loanDocumentInstanceId, current);
    }
  }
  const signatureEvents = signatureEnvelopes
    .flatMap((envelope) =>
      (envelope.signatureEvents ?? []).map((event) => ({
        envelopeId: envelope.id,
        envelopeProviderId: envelope.providerEnvelopeId,
        provider: envelope.provider,
        event,
      }))
    )
    .sort(
      (a, b) =>
        toTimestamp(b.event.eventAt ?? b.event.receivedAt) -
        toTimestamp(a.event.eventAt ?? a.event.receivedAt)
    );
  const signatureSignerRows = signatureEnvelopes.flatMap((envelope) =>
    (envelope.signatureSigners ?? []).map((signer) => ({
      envelopeId: envelope.id,
      envelopeProviderId: envelope.providerEnvelopeId,
      signer,
    }))
  );

  const signedDocumentsCount = signatureDocuments.filter((item) => item.status === 'SIGNED').length;
  const pendingDocumentsCount = signatureDocuments.filter(
    (item) => !['SIGNED', 'CANCELED', 'VOID'].includes(item.status)
  ).length;
  const signedSignersCount = signatureEnvelopes.reduce(
    (sum, envelope) =>
      sum + (envelope.signatureSigners ?? []).filter((signer) => signer.status === 'SIGNED').length,
    0
  );
  const totalSignersCount = signatureEnvelopes.reduce(
    (sum, envelope) => sum + (envelope.signatureSigners?.length ?? 0),
    0
  );
  const handleDownloadSignatureFile = useCallback(
    async (fileKey: string, fileName: string) => {
      if (!effectiveLoanId) return;

      try {
        setSignatureActionKey(`download:${fileKey}`);

        const response = await presignSignatureFileView({
          params: { id: effectiveLoanId },
          body: { fileKey },
        });
        const viewUrl = response.body.viewUrl;

        const anchor = document.createElement('a');
        anchor.href = viewUrl;
        anchor.download = fileName;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      } catch {
        // mutation hook handles user-facing errors
      } finally {
        setSignatureActionKey(null);
      }
    },
    [effectiveLoanId, presignSignatureFileView]
  );
  const handleResendSignatureEnvelope = useCallback(
    async (envelopeId: number, action: 'REMINDER' | 'RETRY') => {
      if (!effectiveLoanId) return;

      try {
        setSignatureActionKey(`resend:${action}:${envelopeId}`);
        await resendSignatureEnvelope({
          params: {
            id: effectiveLoanId,
            envelopeId,
          },
          body: {
            action,
          },
        });
      } catch {
        // mutation hook handles user-facing errors
      } finally {
        setSignatureActionKey(null);
      }
    },
    [effectiveLoanId, resendSignatureEnvelope]
  );
  const handleCreateNewSignatureRequest = useCallback(async () => {
    if (!effectiveLoanId) return;

    try {
      setSignatureActionKey('new-request');
      await sendLoanToSignature({
        params: { id: effectiveLoanId },
      });
    } catch {
      // mutation hook handles user-facing errors
    } finally {
      setSignatureActionKey(null);
    }
  }, [effectiveLoanId, sendLoanToSignature]);
  const confirmCreateNewSignatureRequest = useCallback(async () => {
    if (!newSignatureRequestTarget) return;

    try {
      await handleCreateNewSignatureRequest();
    } finally {
      setNewSignatureRequestTarget(null);
    }
  }, [handleCreateNewSignatureRequest, newSignatureRequestTarget]);

  if (!loan) return null;

  const sections: DescriptionSection[] = detail
    ? [
        {
          title: 'General',
          columns: 3,
          items: [
            { label: 'Numero credito', value: detail.creditNumber },
            {
              label: 'Estado',
              value: <StatusBadge status={detail.status as LoanStatus} />,
            },
            {
              label: 'Estado desembolso',
              value: loanDisbursementStatusLabels[detail.disbursementStatus],
            },
            { label: 'Fecha registro', value: formatDate(detail.recordDate) },
            { label: 'Inicio credito', value: formatDate(detail.creditStartDate) },
            { label: 'Vencimiento final', value: formatDate(detail.maturityDate) },
            { label: 'Primer recaudo', value: formatDate(detail.firstCollectionDate) },
            { label: 'Fecha estado', value: formatDate(detail.statusDate) },
            { label: 'Cuotas', value: detail.installments },
            { label: 'Capital', value: formatCurrency(detail.principalAmount) },
            {
              label: 'Desembolso',
              value: detail.disbursementAmount
                ? formatCurrency(detail.disbursementAmount)
                : '-',
            },
            { label: 'Total inicial', value: formatCurrency(detail.initialTotalAmount) },
            { label: 'Seguro', value: formatCurrency(detail.insuranceValue) },
          ],
        },
        {
          title: 'Partes y recaudo',
          columns: 3,
          items: [
            { label: 'Titular', value: getThirdPartyLabel(detail.borrower) },
            { label: 'Desembolso a', value: getThirdPartyLabel(detail.disbursementParty) },
            {
              label: 'Convenio',
              value: detail.agreement
                ? `${detail.agreement.agreementCode} - ${detail.agreement.businessName}`
                : '-',
            },
            { label: 'Fondo', value: detail.creditFund?.name ?? '-' },
            { label: 'Forma de pago', value: detail.repaymentMethod?.name ?? '-' },
            { label: 'Periodicidad', value: detail.paymentFrequency?.name ?? '-' },
            { label: 'Garantia', value: detail.paymentGuaranteeType?.name ?? '-' },
            { label: 'Aseguradora', value: detail.insuranceCompany?.businessName ?? '-' },
            { label: 'Banco', value: detail.bank?.name ?? '-' },
            {
              label: 'Tipo cuenta',
              value: detail.bankAccountType
                ? bankAccountTypeLabels[detail.bankAccountType as BankAccountType]
                : '-',
            },
            { label: 'Numero cuenta', value: detail.bankAccountNumber ?? '-' },
            { label: 'Centro de costo', value: detail.costCenter?.name ?? '-' },
            { label: 'Oficina', value: detail.affiliationOffice?.name ?? '-' },
            { label: 'Canal', value: detail.channel?.name ?? '-' },
          ],
        },
        {
          title: 'Gestion',
          columns: 3,
          items: [
            {
              label: 'En juridica',
              value: detail.hasLegalProcess ? 'Si' : 'No',
            },
            {
              label: 'Fecha juridica',
              value: formatDate(detail.legalProcessDate),
            },
            {
              label: 'Acuerdo de pago',
              value: detail.hasPaymentAgreement ? 'Si' : 'No',
            },
            {
              label: 'Fecha acuerdo',
              value: formatDate(detail.paymentAgreementDate),
            },
            {
              label: 'Reportado a CIFIN',
              value: detail.isReportedToCifin ? 'Si' : 'No',
            },
            {
              label: 'Fecha reporte CIFIN',
              value: formatDate(detail.cifinReportDate),
            },
            { label: 'Ultimo pago', value: formatDate(detail.lastPaymentDate) },
            { label: 'Valor saldo retenido', value: formatCurrency(detail.withheldBalanceValue) },
          ],
        },
        {
          title: 'Castigos y garantias',
          columns: 3,
          items: [
            { label: 'Credito castigado', value: detail.isWrittenOff ? 'Si' : 'No' },
            { label: 'Fecha castigo', value: formatDate(detail.writtenOffDate) },
            { label: 'Interes castigado', value: detail.isInterestWrittenOff ? 'Si' : 'No' },
            {
              label: 'Documento castigo interes',
              value: detail.interestWriteOffDocument ?? '-',
            },
            { label: 'Documento garantia', value: detail.guaranteeDocument ?? '-' },
          ],
        },
        {
          title: 'Auditoria',
          columns: 3,
          items: [
            { label: 'Creado por', value: detail.createdByUserName ?? '-' },
            { label: 'Fecha creacion', value: formatDateTime(detail.createdAt) },
            { label: 'Ultima actualizacion', value: formatDateTime(detail.updatedAt) },
            {
              label: 'Ultimo cambio estado por',
              value: detail.statusChangedByUserName ?? '-',
            },
            {
              label: 'Nota estado',
              value: detail.note ?? '-',
            },
          ],
        },
      ]
    : [];

  return (
    <Sheet open={opened} onOpenChange={(open) => onOpened(open)}>
      <SheetContent className="overflow-y-scroll sm:max-w-6xl">
        <SheetHeader>
          <SheetTitle>Informacion de credito</SheetTitle>
        </SheetHeader>

        {isLoadingDetail ? (
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        ) : detail ? (
          <div className="space-y-4 px-4">
            <Tabs defaultValue="loan" className="w-full">
              <TabsList className="mb-4 flex h-auto w-full flex-wrap justify-start gap-1">
                <TabsTrigger value="loan">Credito</TabsTrigger>
                <TabsTrigger value="installments">Cuotas</TabsTrigger>
                <TabsTrigger value="payments">Abonos</TabsTrigger>
                <TabsTrigger value="movements">Movimientos</TabsTrigger>
                <TabsTrigger value="statement">Extracto</TabsTrigger>
                <TabsTrigger value="history">Historial</TabsTrigger>
                <TabsTrigger value="concepts">Conceptos</TabsTrigger>
                <TabsTrigger value="refinancing">Refinanciacion</TabsTrigger>
                <TabsTrigger value="codebtors">Codeudores</TabsTrigger>
                <TabsTrigger value="application">Solicitud</TabsTrigger>
                <TabsTrigger value="signature">Firma digital</TabsTrigger>
                <TabsTrigger value="documents">Impresiones</TabsTrigger>
              </TabsList>

              <TabsContent value="loan" className="pt-2">
                <DescriptionList sections={sections} columns={2} />
              </TabsContent>

              <TabsContent value="installments" className="pt-2">
                {detail.loanInstallments?.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Vencimiento</TableHead>
                        <TableHead>Capital</TableHead>
                        <TableHead>Interes</TableHead>
                        <TableHead>Seguro</TableHead>
                        <TableHead>Cuota</TableHead>
                        <TableHead>Saldo capital</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.loanInstallments.map((item) => {
                        const installmentPayment =
                          Number(item.principalAmount) +
                          Number(item.interestAmount) +
                          Number(item.insuranceAmount);

                        return (
                          <TableRow key={item.id}>
                            <TableCell>{item.installmentNumber}</TableCell>
                            <TableCell>{formatDate(item.dueDate)}</TableCell>
                            <TableCell>{formatCurrency(item.principalAmount)}</TableCell>
                            <TableCell>{formatCurrency(item.interestAmount)}</TableCell>
                            <TableCell>{formatCurrency(item.insuranceAmount)}</TableCell>
                            <TableCell>{formatCurrency(installmentPayment)}</TableCell>
                            <TableCell>{formatCurrency(item.remainingPrincipal)}</TableCell>
                            <TableCell>{installmentRecordStatusLabels[item.status]}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
                    No hay cuotas registradas.
                  </div>
                )}
              </TabsContent>

              <TabsContent value="payments" className="pt-2">
                {detail.loanPayments?.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Recibo</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Auxiliar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.loanPayments.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.paymentNumber}</TableCell>
                          <TableCell>
                            {item.paymentReceiptType?.name ?? item.receiptTypeId}
                          </TableCell>
                          <TableCell>{formatDate(item.paymentDate)}</TableCell>
                          <TableCell>{formatCurrency(item.amount)}</TableCell>
                          <TableCell>{loanPaymentStatusLabels[item.status]}</TableCell>
                          <TableCell>{item.glAccount?.name ?? '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
                    No hay abonos registrados.
                  </div>
                )}
              </TabsContent>

              <TabsContent value="movements" className="space-y-4 pt-2">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Movimientos de cartera</h3>
                  {detail.portfolioEntries?.length ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Vencimiento</TableHead>
                          <TableHead>Cuota</TableHead>
                          <TableHead>Auxiliar</TableHead>
                          <TableHead>Cargo</TableHead>
                          <TableHead>Abono</TableHead>
                          <TableHead>Saldo</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Ult. movimiento</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detail.portfolioEntries.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{formatDate(item.dueDate)}</TableCell>
                            <TableCell>{item.installmentNumber}</TableCell>
                            <TableCell>
                              {[item.glAccount?.code, item.glAccount?.name]
                                .filter(Boolean)
                                .join(' - ') || '-'}
                            </TableCell>
                            <TableCell>{formatCurrency(item.chargeAmount)}</TableCell>
                            <TableCell>{formatCurrency(item.paymentAmount)}</TableCell>
                            <TableCell>{formatCurrency(item.balance)}</TableCell>
                            <TableCell>{item.status}</TableCell>
                            <TableCell>{formatDate(item.lastMovementDate)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
                      No hay movimientos de cartera para este credito.
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Movimientos contables</h3>
                  {detail.accountingEntries?.length ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Proceso</TableHead>
                          <TableHead>Documento</TableHead>
                          <TableHead>Sec</TableHead>
                          <TableHead>Origen</TableHead>
                          <TableHead>Naturaleza</TableHead>
                          <TableHead>Auxiliar</TableHead>
                          <TableHead>Descripcion</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Cuota</TableHead>
                          <TableHead>Vencimiento</TableHead>
                          <TableHead>Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detail.accountingEntries.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{formatDate(item.entryDate)}</TableCell>
                            <TableCell>{item.processType}</TableCell>
                            <TableCell>{item.documentCode}</TableCell>
                            <TableCell>{item.sequence}</TableCell>
                            <TableCell>{`${item.sourceType} (${item.sourceId})`}</TableCell>
                            <TableCell>{item.nature === 'DEBIT' ? 'Debito' : 'Credito'}</TableCell>
                            <TableCell>
                              {[item.glAccount?.code, item.glAccount?.name]
                                .filter(Boolean)
                                .join(' - ') || '-'}
                            </TableCell>
                            <TableCell>{item.description}</TableCell>
                            <TableCell>{formatCurrency(item.amount)}</TableCell>
                            <TableCell>{item.installmentNumber ?? '-'}</TableCell>
                            <TableCell>{formatDate(item.dueDate)}</TableCell>
                            <TableCell>{item.status}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
                      No hay movimientos contables para este credito.
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="statement" className="space-y-4 pt-2">
                {isLoadingExtract || isFetchingExtract ? (
                  <div className="flex items-center justify-center py-8">
                    <Spinner />
                  </div>
                ) : (
                  <>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-lg border p-3">
                        <div className="text-muted-foreground text-xs">Saldo actual</div>
                        <div className="text-base font-semibold">
                          {formatCurrency(extractReport?.balanceSummary.currentBalance ?? '0')}
                        </div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-muted-foreground text-xs">Saldo vencido</div>
                        <div className="text-base font-semibold">
                          {formatCurrency(extractReport?.balanceSummary.overdueBalance ?? '0')}
                        </div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-muted-foreground text-xs">Cuotas abiertas</div>
                        <div className="text-base font-semibold">
                          {extractReport?.balanceSummary.openInstallments ?? 0}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-lg border p-3">
                        <div className="text-muted-foreground text-xs">Saldo al dia</div>
                        <div className="text-base font-semibold">
                          {formatCurrency(extractReport?.balanceSummary.currentDueBalance ?? '0')}
                        </div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-muted-foreground text-xs">Saldo inicial</div>
                        <div className="text-base font-semibold">
                          {formatCurrency(extractReport?.clientStatement.openingBalance ?? '0')}
                        </div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-muted-foreground text-xs">Proximo vencimiento</div>
                        <div className="text-base font-semibold">
                          {formatDate(extractReport?.balanceSummary.nextDueDate ?? null)}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-lg border p-3">
                        <div className="text-muted-foreground text-xs">Cargos del periodo</div>
                        <div className="text-base font-semibold">
                          {formatCurrency(extractReport?.clientStatement.totalCharges ?? '0')}
                        </div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-muted-foreground text-xs">Abonos del periodo</div>
                        <div className="text-base font-semibold">
                          {formatCurrency(extractReport?.clientStatement.totalPayments ?? '0')}
                        </div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-muted-foreground text-xs">Saldo final</div>
                        <div className="text-base font-semibold">
                          {formatCurrency(extractReport?.clientStatement.closingBalance ?? '0')}
                        </div>
                      </div>
                    </div>

                    {extractReport?.clientStatement.movements?.length ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Movimiento</TableHead>
                            <TableHead>Referencia</TableHead>
                            <TableHead>Concepto</TableHead>
                            <TableHead>Cargo</TableHead>
                            <TableHead>Abono</TableHead>
                            <TableHead>Saldo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {extractReport.clientStatement.movements.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>{formatDate(item.entryDate)}</TableCell>
                              <TableCell>{item.movement}</TableCell>
                              <TableCell>{item.reference}</TableCell>
                              <TableCell>{item.concept}</TableCell>
                              <TableCell>{formatCurrency(item.chargeAmount)}</TableCell>
                              <TableCell>{formatCurrency(item.paymentAmount)}</TableCell>
                              <TableCell>{formatCurrency(item.runningBalance)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
                        No hay movimientos para este credito.
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="history" className="space-y-4 pt-2">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Historial de estados</h3>
                  {detail.loanStatusHistory?.length ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha cambio</TableHead>
                          <TableHead>Estado anterior</TableHead>
                          <TableHead>Estado nuevo</TableHead>
                          <TableHead>Usuario</TableHead>
                          <TableHead>Nota</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detail.loanStatusHistory.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{formatDateTime(item.changedAt)}</TableCell>
                            <TableCell>
                              {item.fromStatus
                                ? (loanStatusLabels[item.fromStatus as LoanStatus] ??
                                  item.fromStatus)
                                : '-'}
                            </TableCell>
                            <TableCell>
                              {loanStatusLabels[item.toStatus as LoanStatus] ?? item.toStatus}
                            </TableCell>
                            <TableCell>
                              {item.changedByUserName ?? item.changedByUserId ?? '-'}
                            </TableCell>
                            <TableCell>{item.note ?? '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
                      No hay cambios de estado registrados en loan_status_history.
                      <div className="mt-2">
                        Estado actual:{' '}
                        {loanStatusLabels[detail.status as LoanStatus] ?? detail.status} (
                        {formatDate(detail.statusDate)})
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Estado de procesos</h3>
                  {loanProcessStatesRows.length ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo proceso</TableHead>
                          <TableHead>Ult. fecha procesada</TableHead>
                          <TableHead>Process run</TableHead>
                          <TableHead>Fecha corrida</TableHead>
                          <TableHead>Fecha mov.</TableHead>
                          <TableHead>Estado corrida</TableHead>
                          <TableHead>Origen</TableHead>
                          <TableHead>Error</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loanProcessStatesRows.map((item) => (
                          <TableRow key={`${item.processType}:${item.lastProcessRunId}`}>
                            <TableCell>{item.processType}</TableCell>
                            <TableCell>{formatDate(item.lastProcessedDate)}</TableCell>
                            <TableCell>{item.lastProcessRunId}</TableCell>
                            <TableCell>
                              {formatDate(item.lastProcessRun?.processDate ?? null)}
                            </TableCell>
                            <TableCell>
                              {formatDate(item.lastProcessRun?.transactionDate ?? null)}
                            </TableCell>
                            <TableCell>{item.lastProcessRun?.status ?? '-'}</TableCell>
                            <TableCell>{item.lastProcessRun?.triggerSource ?? '-'}</TableCell>
                            <TableCell>{item.lastError ?? '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
                      No hay registros en loan_process_states para este credito.
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Historial de convenios</h3>
                  {detail.loanAgreementHistory?.length ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha cambio</TableHead>
                          <TableHead>Fecha vigencia</TableHead>
                          <TableHead>Convenio</TableHead>
                          <TableHead>Usuario</TableHead>
                          <TableHead>Nota</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detail.loanAgreementHistory.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{formatDateTime(item.changedAt)}</TableCell>
                            <TableCell>{formatDate(item.effectiveDate)}</TableCell>
                            <TableCell>
                              {item.agreement
                                ? `${item.agreement.agreementCode} - ${item.agreement.businessName}`
                                : item.agreementId}
                            </TableCell>
                            <TableCell>
                              {item.changedByUserName ?? item.changedByUserId ?? '-'}
                            </TableCell>
                            <TableCell>{item.note ?? '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
                      No hay cambios de convenio registrados.
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="concepts" className="pt-2">
                {detail.loanBillingConcepts?.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Concepto</TableHead>
                        <TableHead>Frecuencia</TableHead>
                        <TableHead>Modo</TableHead>
                        <TableHead>Metodo</TableHead>
                        <TableHead>Tasa</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Auxiliar</TableHead>
                        <TableHead>Regla origen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.loanBillingConcepts.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            {item.billingConcept
                              ? `${item.billingConcept.code} - ${item.billingConcept.name}`
                              : item.billingConceptId}
                          </TableCell>
                          <TableCell>
                            {billingConceptFrequencyLabels[item.frequency] ?? item.frequency}
                          </TableCell>
                          <TableCell>
                            {billingConceptFinancingModeLabels[item.financingMode] ??
                              item.financingMode}
                          </TableCell>
                          <TableCell>
                            {billingConceptCalcMethodLabels[item.calcMethod] ?? item.calcMethod}
                          </TableCell>
                          <TableCell>{item.rate ? formatPercent(item.rate, 6) : '-'}</TableCell>
                          <TableCell>{item.amount ? formatCurrency(item.amount) : '-'}</TableCell>
                          <TableCell>
                            {[item.glAccount?.code, item.glAccount?.name]
                              .filter(Boolean)
                              .join(' - ') || '-'}
                          </TableCell>
                          <TableCell>{item.sourceRuleId ?? '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
                    No hay conceptos de cobro asociados.
                  </div>
                )}
              </TabsContent>

              <TabsContent value="refinancing" className="space-y-4 pt-2">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Creditos origen de esta refinanciacion</h3>
                  {detail.loanRefinancingLinksRefinanced?.length ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Credito origen</TableHead>
                          <TableHead>Valor cancelado</TableHead>
                          <TableHead>Creado por</TableHead>
                          <TableHead>Fecha</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detail.loanRefinancingLinksRefinanced.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              {item.referenceLoan?.creditNumber ?? item.referenceLoanId}
                            </TableCell>
                            <TableCell>{formatCurrency(item.payoffAmount)}</TableCell>
                            <TableCell>{item.createdByUserName ?? item.createdByUserId}</TableCell>
                            <TableCell>{formatDateTime(item.createdAt)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
                      Este credito no tiene origenes de refinanciacion.
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Creditos que refinanciaron este credito</h3>
                  {detail.loanRefinancingLinksReference?.length ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Credito nuevo</TableHead>
                          <TableHead>Valor cancelado</TableHead>
                          <TableHead>Creado por</TableHead>
                          <TableHead>Fecha</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detail.loanRefinancingLinksReference.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              {item.refinancedLoan?.creditNumber ?? item.loanId}
                            </TableCell>
                            <TableCell>{formatCurrency(item.payoffAmount)}</TableCell>
                            <TableCell>{item.createdByUserName ?? item.createdByUserId}</TableCell>
                            <TableCell>{formatDateTime(item.createdAt)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
                      Ningun credito ha refinanciado este credito.
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="application" className="pt-2">
                {detail.loanApplication ? (
                  <LoanApplicationDetails loanApplication={detail.loanApplication} />
                ) : (
                  <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
                    No se encontro la solicitud asociada.
                  </div>
                )}
              </TabsContent>

              <TabsContent value="codebtors" className="pt-2">
                {detail.loanApplication?.loanApplicationCoDebtors?.length ? (
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
                      {detail.loanApplication.loanApplicationCoDebtors.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            {item.thirdParty?.documentNumber ?? item.thirdPartyId ?? '-'}
                          </TableCell>
                          <TableCell>{getThirdPartyLabel(item.thirdParty)}</TableCell>
                          <TableCell>{item.thirdParty?.homeCity?.name ?? '-'}</TableCell>
                          <TableCell>{item.thirdParty?.workCity?.name ?? '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
                    No hay codeudores asociados en la solicitud.
                  </div>
                )}
              </TabsContent>

              <TabsContent value="signature" className="space-y-4 pt-2">
                {signatureDocuments.length || signatureEnvelopes.length ? (
                  <>
                    <div className="grid gap-3 md:grid-cols-4">
                      <div className="rounded-lg border p-3">
                        <div className="text-muted-foreground text-xs">Documentos</div>
                        <div className="text-base font-semibold">{signatureDocuments.length}</div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-muted-foreground text-xs">Firmados</div>
                        <div className="text-base font-semibold">{signedDocumentsCount}</div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-muted-foreground text-xs">Pendientes</div>
                        <div className="text-base font-semibold">{pendingDocumentsCount}</div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-muted-foreground text-xs">Firmantes</div>
                        <div className="text-base font-semibold">
                          {signedSignersCount}/{totalSignersCount}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold">Documentos enviados a firma</h3>
                      {signatureDocuments.length ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Documento</TableHead>
                              <TableHead>Plantilla</TableHead>
                              <TableHead>Revision</TableHead>
                              <TableHead>Estado</TableHead>
                              <TableHead>Sobres</TableHead>
                              <TableHead>Generado</TableHead>
                              <TableHead>Enviado</TableHead>
                              <TableHead>Firmado</TableHead>
                              <TableHead>Descargas</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {signatureDocuments.map((item) => {
                              const linkedEnvelopes = envelopeByDocumentId.get(item.id) ?? [];
                              const signedFileName = `${item.documentCode}-firmado-r${item.revision}.pdf`;

                              return (
                                <TableRow key={item.id}>
                                  <TableCell>
                                    <div className="font-medium">{item.documentName}</div>
                                    <div className="text-muted-foreground text-xs">
                                      {item.documentCode}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {item.documentTemplate
                                      ? `${item.documentTemplate.code} v${item.documentTemplate.version}`
                                      : item.documentTemplateId}
                                  </TableCell>
                                  <TableCell>{item.revision}</TableCell>
                                  <TableCell>
                                    <Badge variant={getSignatureBadgeVariant(item.status)}>
                                      {loanDocumentStatusLabels[item.status] ?? item.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {linkedEnvelopes.length
                                      ? linkedEnvelopes.map((envelope) => envelope.providerEnvelopeId).join(', ')
                                      : '-'}
                                  </TableCell>
                                  <TableCell>{formatDateTime(item.generatedAt)}</TableCell>
                                  <TableCell>{formatDateTime(item.sentForSignatureAt)}</TableCell>
                                  <TableCell>{formatDateTime(item.signedAt)}</TableCell>
                                  <TableCell>
                                    {item.signedStorageKey ? (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={
                                          signatureActionKey === `download:${item.signedStorageKey}`
                                        }
                                        onClick={() =>
                                          handleDownloadSignatureFile(
                                            item.signedStorageKey as string,
                                            signedFileName
                                          )
                                        }
                                      >
                                        <Download className="mr-2 size-4" />
                                        Firmado
                                      </Button>
                                    ) : (
                                      '-'
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
                          No hay documentos de firma digital para este credito.
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold">Sobres de firma</h3>
                      {signatureEnvelopes.length ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Proveedor</TableHead>
                              <TableHead>ID proveedor</TableHead>
                              <TableHead>Estado</TableHead>
                              <TableHead>Documentos</TableHead>
                              <TableHead>Firmantes</TableHead>
                              <TableHead>Enviado</TableHead>
                              <TableHead>Completado</TableHead>
                              <TableHead>Evidencias</TableHead>
                              <TableHead>Error</TableHead>
                              <TableHead>Acciones</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {signatureEnvelopes.map((item) => {
                              const totalSigners = item.signatureSigners?.length ?? 0;
                              const signedSigners =
                                item.signatureSigners?.filter((signer) => signer.status === 'SIGNED')
                                  .length ?? 0;
                              const evidenceArtifacts = (item.signatureArtifacts ?? []).filter(
                                (artifact) => artifact.artifactType !== 'SIGNED_PDF'
                              );
                              const envelopeAction =
                                item.status === 'ERROR'
                                  ? { kind: 'RETRY' as const, label: 'Reintentar envio' }
                                  : item.status === 'SENT' || item.status === 'PARTIALLY_SIGNED'
                                    ? { kind: 'REMINDER' as const, label: 'Enviar recordatorio' }
                                    : item.status === 'REJECTED' ||
                                        item.status === 'EXPIRED' ||
                                        item.status === 'CANCELED'
                                      ? {
                                          kind: 'NEW_REQUEST' as const,
                                          label: 'Nueva solicitud',
                                        }
                                      : null;

                              return (
                                <TableRow key={item.id}>
                                  <TableCell>{signatureProviderLabels[item.provider] ?? item.provider}</TableCell>
                                  <TableCell>{item.providerEnvelopeId}</TableCell>
                                  <TableCell>
                                    <Badge variant={getSignatureBadgeVariant(item.status)}>
                                      {signatureEnvelopeStatusLabels[item.status] ?? item.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>{item.signatureEnvelopeDocuments?.length ?? 0}</TableCell>
                                  <TableCell>
                                    {signedSigners}/{totalSigners}
                                  </TableCell>
                                  <TableCell>{formatDateTime(item.sentAt)}</TableCell>
                                  <TableCell>{formatDateTime(item.completedAt)}</TableCell>
                                  <TableCell>
                                    {evidenceArtifacts.length ? (
                                      <div className="flex flex-wrap gap-1">
                                        {evidenceArtifacts.map((artifact) => {
                                          const artifactFileName = `${item.providerEnvelopeId}-${artifact.artifactType.toLowerCase()}.${extensionFromMimeType(artifact.mimeType)}`;

                                          return (
                                            <Button
                                              key={artifact.id}
                                              type="button"
                                              variant="outline"
                                              size="sm"
                                              disabled={
                                                signatureActionKey ===
                                                `download:${artifact.storageKey}`
                                              }
                                              onClick={() =>
                                                handleDownloadSignatureFile(
                                                  artifact.storageKey,
                                                  artifactFileName
                                                )
                                              }
                                            >
                                              <Download className="mr-2 size-4" />
                                              {artifact.artifactType}
                                            </Button>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      '-'
                                    )}
                                  </TableCell>
                                  <TableCell>{item.errorMessage ?? '-'}</TableCell>
                                  <TableCell>
                                    {envelopeAction ? (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={
                                          signatureActionKey ===
                                          (envelopeAction.kind === 'NEW_REQUEST'
                                            ? 'new-request'
                                            : `resend:${envelopeAction.kind}:${item.id}`)
                                        }
                                        onClick={() => {
                                          if (envelopeAction.kind === 'NEW_REQUEST') {
                                            setNewSignatureRequestTarget({
                                              envelopeId: item.id,
                                              providerEnvelopeId: item.providerEnvelopeId,
                                            });
                                            return;
                                          }
                                          void handleResendSignatureEnvelope(item.id, envelopeAction.kind);
                                        }}
                                      >
                                        <RefreshCw className="mr-2 size-4" />
                                        {envelopeAction.label}
                                      </Button>
                                    ) : (
                                      '-'
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
                          No hay sobres registrados para este credito.
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold">Firmantes</h3>
                      {signatureSignerRows.length ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Sobre</TableHead>
                              <TableHead>Rol</TableHead>
                              <TableHead>Nombre</TableHead>
                              <TableHead>Estado</TableHead>
                              <TableHead>Contacto</TableHead>
                              <TableHead>Firmado</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {signatureSignerRows.map((row) => (
                              <TableRow key={row.signer.id}>
                                <TableCell>{row.envelopeProviderId || row.envelopeId}</TableCell>
                                <TableCell>
                                  {signerRoleLabels[row.signer.signerRole] ?? row.signer.signerRole}
                                </TableCell>
                                <TableCell>{row.signer.fullName}</TableCell>
                                <TableCell>
                                  <Badge variant={getSignatureBadgeVariant(row.signer.status)}>
                                    {signatureSignerStatusLabels[row.signer.status] ?? row.signer.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>{row.signer.email ?? row.signer.phone ?? '-'}</TableCell>
                                <TableCell>{formatDateTime(row.signer.signedAt)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
                          No hay firmantes registrados.
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold">Eventos</h3>
                      {signatureEvents.length ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Fecha</TableHead>
                              <TableHead>Proveedor</TableHead>
                              <TableHead>Sobre</TableHead>
                              <TableHead>Evento</TableHead>
                              <TableHead>Procesado</TableHead>
                              <TableHead>Error</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {signatureEvents.slice(0, 30).map((row) => (
                              <TableRow key={row.event.id}>
                                <TableCell>
                                  {formatDateTime(row.event.eventAt ?? row.event.receivedAt)}
                                </TableCell>
                                <TableCell>{signatureProviderLabels[row.provider] ?? row.provider}</TableCell>
                                <TableCell>{row.envelopeProviderId || row.envelopeId}</TableCell>
                                <TableCell>{row.event.eventType}</TableCell>
                                <TableCell>{row.event.processed ? 'Si' : 'No'}</TableCell>
                                <TableCell>{row.event.processingError ?? '-'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
                          No hay eventos registrados.
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
                    Este credito no tiene gestion de firma digital registrada.
                  </div>
                )}
              </TabsContent>

              <TabsContent value="documents" className="pt-2">
                <LoanDocumentsTab loanId={detail.id} creditNumber={detail.creditNumber} />
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="text-muted-foreground px-4 py-6 text-sm">
            No fue posible cargar la informacion.
          </div>
        )}

        <AlertDialog
          open={Boolean(newSignatureRequestTarget)}
          onOpenChange={(open) => {
            if (!open) setNewSignatureRequestTarget(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Crear nueva solicitud de firma</AlertDialogTitle>
              <AlertDialogDescription>
                Se creara un nuevo sobre de firma para este credito.
                {newSignatureRequestTarget
                  ? ` Sobre actual: ${newSignatureRequestTarget.providerEnvelopeId} (ID interno ${newSignatureRequestTarget.envelopeId}).`
                  : ''}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={signatureActionKey === 'new-request'}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(event) => {
                  event.preventDefault();
                  void confirmCreateNewSignatureRequest();
                }}
                disabled={signatureActionKey === 'new-request'}
              >
                {signatureActionKey === 'new-request' ? 'Creando...' : 'Crear solicitud'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}
