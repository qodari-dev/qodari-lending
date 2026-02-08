'use client';

import { DescriptionList, DescriptionSection } from '@/components/description-list';
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
import { useLoanPayment } from '@/hooks/queries/use-loan-payment-queries';
import {
  LoanPayment,
  LoanPaymentInclude,
  loanPaymentStatusLabels,
  paymentReceiptMovementTypeLabels,
} from '@/schemas/loan-payment';
import { formatCurrency, formatDate } from '@/utils/formatters';

const DETAIL_INCLUDES: LoanPaymentInclude[] = [
  'loan',
  'paymentReceiptType',
  'glAccount',
  'loanPaymentMethodAllocations',
];

export function LoanPaymentInfo({
  loanPayment,
  opened,
  onOpened,
}: {
  loanPayment: LoanPayment | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  const loanPaymentId = loanPayment?.id ?? 0;

  const { data: detailData, isLoading: isLoadingDetail } = useLoanPayment(loanPaymentId, {
    include: DETAIL_INCLUDES,
    enabled: opened && Boolean(loanPaymentId),
  });

  const detail = detailData?.body ?? loanPayment;

  if (!loanPayment) return null;

  const sections: DescriptionSection[] = detail
    ? [
        {
          title: 'General',
          columns: 3,
          items: [
            { label: 'Recibo', value: detail.paymentNumber },
            {
              label: 'Estado',
              value: (
                <Badge variant={detail.status === 'VOID' ? 'destructive' : 'outline'}>
                  {loanPaymentStatusLabels[detail.status]}
                </Badge>
              ),
            },
            { label: 'Fecha pago', value: formatDate(detail.paymentDate) },
            { label: 'Fecha emision', value: formatDate(detail.issuedDate) },
            { label: 'Credito', value: detail.loan?.creditNumber ?? detail.loanId },
            { label: 'Valor', value: formatCurrency(detail.amount) },
            {
              label: 'Tipo recibo',
              value: detail.paymentReceiptType?.name ?? detail.receiptTypeId,
            },
            {
              label: 'Movimiento',
              value: detail.movementType ? paymentReceiptMovementTypeLabels[detail.movementType] : '-',
            },
            {
              label: 'Cuenta contable',
              value: detail.glAccount ? `${detail.glAccount.code} - ${detail.glAccount.name}` : '-',
            },
          ],
        },
        {
          title: 'Auditoria',
          columns: 2,
          items: [
            { label: 'Creado por', value: detail.createdByUserName },
            { label: 'Fecha creacion', value: formatDate(detail.createdAt) },
            { label: 'Actualizado por', value: detail.updatedByUserName ?? '-' },
            { label: 'Fecha actualizacion', value: formatDate(detail.updatedAt) },
            { label: 'Nota', value: detail.note ?? '-' },
            { label: 'Nota estado', value: detail.noteStatus ?? '-' },
          ],
        },
      ]
    : [];

  return (
    <Sheet open={opened} onOpenChange={(open) => onOpened(open)}>
      <SheetContent className="overflow-y-scroll sm:max-w-5xl">
        <SheetHeader>
          <SheetTitle>Informacion de abono</SheetTitle>
        </SheetHeader>

        {isLoadingDetail ? (
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        ) : detail ? (
          <div className="space-y-4 px-4">
            <DescriptionList sections={sections} columns={2} />

            <div className="space-y-2">
              <h4 className="text-md font-semibold">Formas de pago</h4>
              {detail.loanPaymentMethodAllocations?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Forma pago</TableHead>
                      <TableHead>Referencia</TableHead>
                      <TableHead>Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.loanPaymentMethodAllocations.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.lineNumber}</TableCell>
                        <TableCell>{item.collectionMethod?.name ?? item.collectionMethodId}</TableCell>
                        <TableCell>{item.tenderReference ?? '-'}</TableCell>
                        <TableCell>{formatCurrency(item.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
                  No hay formas de pago registradas.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground px-4 py-6 text-sm">No fue posible cargar la informacion.</div>
        )}
      </SheetContent>
    </Sheet>
  );
}
