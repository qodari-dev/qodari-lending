import { DescriptionList, DescriptionSection } from '@/components/description-list';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  allocationOrderWithinLabels,
  allocationScopeLabels,
  overpaymentHandlingLabels,
  OverpaymentHandling,
  PaymentAllocationPolicy,
} from '@/schemas/payment-allocation-policy';
import { formatDate } from '@/utils/formatters';

export function PaymentAllocationPolicyInfo({
  paymentAllocationPolicy,
  opened,
  onOpened,
}: {
  paymentAllocationPolicy: PaymentAllocationPolicy | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  if (!paymentAllocationPolicy) return null;

  const rules = paymentAllocationPolicy.paymentAllocationPolicyRules ?? [];

  const sections: DescriptionSection[] = [
    {
      title: 'Informacion basica',
      columns: 2,
      items: [
        { label: 'Nombre', value: paymentAllocationPolicy.name },
        {
          label: 'Manejo excedente',
          value:
            overpaymentHandlingLabels[
              paymentAllocationPolicy.overpaymentHandling as OverpaymentHandling
            ] ?? paymentAllocationPolicy.overpaymentHandling,
        },
        {
          label: 'Estado',
          value: (
            <Badge variant={paymentAllocationPolicy.isActive ? 'default' : 'outline'}>
              {paymentAllocationPolicy.isActive ? 'Activo' : 'Inactivo'}
            </Badge>
          ),
        },
        { label: 'Nota', value: paymentAllocationPolicy.note ?? '-' },
      ],
    },
    {
      title: 'Actividad',
      columns: 2,
      items: [
        { label: 'Creado', value: formatDate(paymentAllocationPolicy.createdAt) },
        { label: 'Actualizado', value: formatDate(paymentAllocationPolicy.updatedAt) },
      ],
    },
  ];

  return (
    <Sheet open={opened} onOpenChange={(open) => onOpened(open)}>
      <SheetContent className="overflow-y-scroll sm:max-w-4xl">
        <SheetHeader>
          <SheetTitle>Informacion</SheetTitle>
        </SheetHeader>
        <div className="space-y-6 px-4">
          <DescriptionList sections={sections} columns={2} />

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Reglas</h3>
            {rules.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prioridad</TableHead>
                    <TableHead>Concepto</TableHead>
                    <TableHead>Alcance</TableHead>
                    <TableHead>Orden</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules
                    .slice()
                    .sort((a, b) => a.priority - b.priority)
                    .map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell>{rule.priority}</TableCell>
                        <TableCell>
                          {rule.billingConcept
                            ? `${rule.billingConcept.code} - ${rule.billingConcept.name}`
                            : rule.billingConceptId}
                        </TableCell>
                        <TableCell>{allocationScopeLabels[rule.scope]}</TableCell>
                        <TableCell>{allocationOrderWithinLabels[rule.orderWithin]}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            ) : (
              <div className={cn('text-muted-foreground rounded-md border border-dashed p-4 text-sm')}>
                No hay reglas configuradas.
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
