'use client';

import { DescriptionList, DescriptionSection } from '@/components/description-list';
import { LoanApplicationDetails } from '@/app/loan-applications/components/loan-application-details';
import { Badge } from '@/components/ui/badge';
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
import { useLoan } from '@/hooks/queries/use-loan-queries';
import {
  installmentRecordStatusLabels,
  loanDisbursementStatusLabels,
  LoanInclude,
  loanPaymentStatusLabels,
  loanStatusLabels,
  Loan,
  LoanStatus,
} from '@/schemas/loan';
import { formatCurrency, formatDate } from '@/utils/formatters';

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

const LOAN_DETAIL_INCLUDES: LoanInclude[] = [
  'borrower',
  'disbursementParty',
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

  const detail = detailData?.body ?? loan;

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
                <TabsTrigger value="application">Solicitud</TabsTrigger>
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

              <TabsContent value="application" className="pt-2">
                {detail.loanApplication ? (
                  <LoanApplicationDetails loanApplication={detail.loanApplication} />
                ) : (
                  <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
                    No se encontro la solicitud asociada.
                  </div>
                )}
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
