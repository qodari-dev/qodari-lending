import { DescriptionList, DescriptionSection } from '@/components/description-list';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { PaymentTenderType, PaymentTenderTypeLabels, PaymentTenderTypeValue } from '@/schemas/payment-tender-type';
import { formatDate } from '@/utils/formatters';

export function PaymentTenderTypeInfo({
  paymentTenderType,
  opened,
  onOpened,
}: {
  paymentTenderType: PaymentTenderType | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  if (!paymentTenderType) return null;

  const sections: DescriptionSection[] = [
    {
      title: 'Información Básica',
      columns: 2,
      items: [
        { label: 'Nombre', value: paymentTenderType.name },
        {
          label: 'Tipo',
          value: PaymentTenderTypeLabels[paymentTenderType.type as PaymentTenderTypeValue],
        },
        {
          label: 'Estado',
          value: (
            <Badge variant={paymentTenderType.isActive ? 'default' : 'outline'}>
              {paymentTenderType.isActive ? 'Activo' : 'Inactivo'}
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
          value: formatDate(paymentTenderType.createdAt),
        },
        {
          label: 'Actualizado',
          value: formatDate(paymentTenderType.updatedAt),
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
