import { DescriptionList, DescriptionSection } from '@/components/description-list';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { PaymentFrequency } from '@/schemas/payment-frequency';
import { formatDate } from '@/utils/formatters';

export function PaymentFrequencyInfo({
  paymentFrequency,
  opened,
  onOpened,
}: {
  paymentFrequency: PaymentFrequency | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  if (!paymentFrequency) return null;

  const sections: DescriptionSection[] = [
    {
      title: 'Información Básica',
      columns: 2,
      items: [
        { label: 'Nombre', value: paymentFrequency.name },
        { label: 'Intervalo de días', value: `${paymentFrequency.daysInterval} días` },
        {
          label: 'Estado',
          value: (
            <Badge variant={paymentFrequency.isActive ? 'default' : 'outline'}>
              {paymentFrequency.isActive ? 'Activo' : 'Inactivo'}
            </Badge>
          ),
        },
      ],
    },
    {
      title: 'Actividad',
      columns: 2,
      items: [
        {
          label: 'Creado',
          value: formatDate(paymentFrequency.createdAt),
        },
        {
          label: 'Actualizado',
          value: formatDate(paymentFrequency.updatedAt),
        },
      ],
    },
  ];

  return (
    <Sheet open={opened} onOpenChange={(open) => onOpened(open)}>
      <SheetContent className="overflow-y-scroll sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Información</SheetTitle>
        </SheetHeader>
        <div className="px-4">
          <DescriptionList sections={sections} columns={2} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
