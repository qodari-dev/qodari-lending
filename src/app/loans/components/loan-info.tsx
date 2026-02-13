'use client';

import { useCallback, useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { DescriptionList, DescriptionSection } from '@/components/description-list';
import { LoanApplicationDetails } from '@/app/loan-applications/components/loan-application-details';
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
import {
  useLoan,
  useLoanBalanceSummary,
  useLoanStatement,
} from '@/hooks/queries/use-loan-queries';
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
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/utils/formatters';

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

function getPartyLabel(party: {
  personType: 'NATURAL' | 'LEGAL';
  businessName?: string | null;
  firstName?: string | null;
  secondName?: string | null;
  firstLastName?: string | null;
  secondLastName?: string | null;
  documentNumber: string;
} | null | undefined): string {
  if (!party) return '-';

  if (party.personType === 'LEGAL') {
    return party.businessName ?? party.documentNumber;
  }

  const fullName = [party.firstName, party.secondName, party.firstLastName, party.secondLastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  return fullName || party.documentNumber;
}

function StatusBadge({ status }: { status: LoanStatus }) {
  return <Badge variant={status === 'ACTIVE' ? 'default' : 'outline'}>{loanStatusLabels[status]}</Badge>;
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
          { method: 'GET', credentials: 'include' },
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
    [loanId, creditNumber, printDate],
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
            {downloading === docType ? <Spinner className="mr-2" /> : <FileDown className="mr-2 size-4" />}
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
  'loanInstallments',
  'loanPayments',
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

  const { data: detailData, isLoading: isLoadingDetail } = useLoan(loanId, {
    include: LOAN_DETAIL_INCLUDES,
    enabled: opened && Boolean(loanId),
  });
  const { data: balanceData, isLoading: isLoadingBalance } = useLoanBalanceSummary(loanId, {
    enabled: opened && Boolean(loanId),
  });
  const { data: statementData, isLoading: isLoadingStatement } = useLoanStatement(
    loanId,
    {},
    { enabled: opened && Boolean(loanId) }
  );

  const detail = detailData?.body ?? loan;
  const balanceSummary = balanceData?.body;
  const statement = statementData?.body;

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
            { label: 'Fecha registro', value: formatDate(detail.recordDate) },
            { label: 'Inicio credito', value: formatDate(detail.creditStartDate) },
            { label: 'Vencimiento final', value: formatDate(detail.maturityDate) },
            { label: 'Primer recaudo', value: formatDate(detail.firstCollectionDate) },
            {
              label: 'Estado desembolso',
              value: loanDisbursementStatusLabels[detail.disbursementStatus],
            },
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
              label: 'Nota estado',
              value: detail.note ?? '-',
            },
            { label: 'Oficina', value: detail.affiliationOffice?.name ?? detail.affiliationOfficeId },
            { label: 'Canal', value: detail.channel?.name ?? '-' },
          ],
        },
        {
          title: 'Partes',
          columns: 2,
          items: [
            { label: 'Titular', value: getPartyLabel(detail.borrower) },
            { label: 'Desembolso a', value: getPartyLabel(detail.disbursementParty) },
            {
              label: 'Convenio',
              value: detail.agreement
                ? `${detail.agreement.agreementCode} - ${detail.agreement.businessName}`
                : '-',
            },
            { label: 'Banco', value: detail.bank?.name ?? '-' },
            {
              label: 'Tipo cuenta',
              value: detail.bankAccountType
                ? bankAccountTypeLabels[detail.bankAccountType as BankAccountType]
                : '-',
            },
            { label: 'Numero cuenta', value: detail.bankAccountNumber ?? '-' },
            { label: 'Fondo', value: detail.creditFund?.name ?? '-' },
            { label: 'Aseguradora', value: detail.insuranceCompany?.businessName ?? '-' },
            { label: 'Forma de pago', value: detail.repaymentMethod?.name ?? detail.repaymentMethodId },
            {
              label: 'Periodicidad',
              value: detail.paymentFrequency?.name ?? '-',
            },
            {
              label: 'Garantia',
              value: detail.paymentGuaranteeType?.name ?? detail.paymentGuaranteeTypeId,
            },
            { label: 'Centro de costo', value: detail.costCenter?.name ?? '-' },
          ],
        },
        {
          title: 'Valores',
          columns: 3,
          items: [
            { label: 'Capital', value: formatCurrency(detail.principalAmount) },
            { label: 'Total inicial', value: formatCurrency(detail.initialTotalAmount) },
            { label: 'Seguro', value: formatCurrency(detail.insuranceValue) },
            { label: 'Cuotas', value: detail.installments },
            {
              label: 'Descuenta estudio',
              value: detail.discountStudyCredit ? 'Si' : 'No',
            },
            { label: 'Documento garantia', value: detail.guaranteeDocument ?? '-' },
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
              <TabsList className="mb-4 w-full">
                <TabsTrigger value="loan">Credito</TabsTrigger>
                <TabsTrigger value="installments">Cuotas</TabsTrigger>
                <TabsTrigger value="payments">Abonos</TabsTrigger>
                <TabsTrigger value="statement">Extracto</TabsTrigger>
                <TabsTrigger value="thirdParties">Terceros</TabsTrigger>
                <TabsTrigger value="application">Solicitud</TabsTrigger>
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
                        <TableHead>Saldo capital</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.loanInstallments.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.installmentNumber}</TableCell>
                          <TableCell>{formatDate(item.dueDate)}</TableCell>
                          <TableCell>{formatCurrency(item.principalAmount)}</TableCell>
                          <TableCell>{formatCurrency(item.interestAmount)}</TableCell>
                          <TableCell>{formatCurrency(item.insuranceAmount)}</TableCell>
                          <TableCell>{formatCurrency(item.remainingPrincipal)}</TableCell>
                          <TableCell>{installmentRecordStatusLabels[item.status]}</TableCell>
                        </TableRow>
                      ))}
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
                          <TableCell>{item.paymentReceiptType?.name ?? item.receiptTypeId}</TableCell>
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

              <TabsContent value="statement" className="space-y-4 pt-2">
                {isLoadingBalance || isLoadingStatement ? (
                  <div className="flex items-center justify-center py-8">
                    <Spinner />
                  </div>
                ) : (
                  <>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-lg border p-3">
                        <div className="text-muted-foreground text-xs">Saldo actual</div>
                        <div className="text-base font-semibold">
                          {formatCurrency(balanceSummary?.currentBalance ?? '0')}
                        </div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-muted-foreground text-xs">Saldo vencido</div>
                        <div className="text-base font-semibold">
                          {formatCurrency(balanceSummary?.overdueBalance ?? '0')}
                        </div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-muted-foreground text-xs">Cuotas abiertas</div>
                        <div className="text-base font-semibold">{balanceSummary?.openInstallments ?? 0}</div>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-lg border p-3">
                        <div className="text-muted-foreground text-xs">Total causado</div>
                        <div className="text-base font-semibold">
                          {formatCurrency(balanceSummary?.totalCharged ?? '0')}
                        </div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-muted-foreground text-xs">Total pagado</div>
                        <div className="text-base font-semibold">
                          {formatCurrency(balanceSummary?.totalPaid ?? '0')}
                        </div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-muted-foreground text-xs">Proximo vencimiento</div>
                        <div className="text-base font-semibold">
                          {formatDate(balanceSummary?.nextDueDate ?? null)}
                        </div>
                      </div>
                    </div>

                    {balanceSummary?.byAccount?.length ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Auxiliar</TableHead>
                            <TableHead>Cargos</TableHead>
                            <TableHead>Pagos</TableHead>
                            <TableHead>Saldo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {balanceSummary.byAccount.map((item) => (
                            <TableRow key={item.glAccountId}>
                              <TableCell>
                                {[item.glAccountCode, item.glAccountName].filter(Boolean).join(' - ') || '-'}
                              </TableCell>
                              <TableCell>{formatCurrency(item.chargeAmount)}</TableCell>
                              <TableCell>{formatCurrency(item.paymentAmount)}</TableCell>
                              <TableCell>{formatCurrency(item.balance)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
                        No hay saldo de cartera para este credito.
                      </div>
                    )}

                    {statement?.entries?.length ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Fuente</TableHead>
                            <TableHead>Documento</TableHead>
                            <TableHead>Cuenta</TableHead>
                            <TableHead>Naturaleza</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Delta cartera</TableHead>
                            <TableHead>Saldo cartera</TableHead>
                            <TableHead>Estado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {statement.entries.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>{formatDate(item.entryDate)}</TableCell>
                              <TableCell>
                                {item.relatedPaymentNumber
                                  ? `${item.sourceLabel} (${item.relatedPaymentNumber})`
                                  : item.sourceLabel}
                              </TableCell>
                              <TableCell>{`${item.documentCode}-${item.sequence}`}</TableCell>
                              <TableCell>
                                {[item.glAccountCode, item.glAccountName].filter(Boolean).join(' - ') || '-'}
                              </TableCell>
                              <TableCell>{item.nature}</TableCell>
                              <TableCell>{formatCurrency(item.amount)}</TableCell>
                              <TableCell>{formatCurrency(item.receivableDelta)}</TableCell>
                              <TableCell>{formatCurrency(item.runningBalance)}</TableCell>
                              <TableCell>{item.status}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
                        No hay movimientos para el rango seleccionado.
                      </div>
                    )}
                  </>
                )}
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

              <TabsContent value="thirdParties" className="pt-2">
                {detail.loanApplication?.loanApplicationCoDebtors?.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Documento</TableHead>
                        <TableHead>Tercero</TableHead>
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
                          <TableCell>{getPartyLabel(item.thirdParty)}</TableCell>
                          <TableCell>{item.thirdParty?.homeCity?.name ?? '-'}</TableCell>
                          <TableCell>{item.thirdParty?.workCity?.name ?? '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
                    No hay terceros asociados en la solicitud.
                  </div>
                )}
              </TabsContent>

              <TabsContent value="documents" className="pt-2">
                <LoanDocumentsTab loanId={detail.id} creditNumber={detail.creditNumber} />
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="text-muted-foreground px-4 py-6 text-sm">No fue posible cargar la informacion.</div>
        )}
      </SheetContent>
    </Sheet>
  );
}
