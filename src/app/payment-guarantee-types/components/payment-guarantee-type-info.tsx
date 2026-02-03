import { DescriptionList, DescriptionSection } from '@/components/description-list';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { PaymentGuaranteeType } from '@/schemas/payment-guarantee-type';
import { formatDate } from '@/utils/formatters';

export function PaymentGuaranteeTypeInfo({
  paymentGuaranteeType,
  opened,
  onOpened,
}: {
  paymentGuaranteeType: PaymentGuaranteeType | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  if (!paymentGuaranteeType) return null;

  const sections: DescriptionSection[] = [
    {
      title: 'Información Básica',
      columns: 2,
      items: [
        { label: 'Nombre', value: paymentGuaranteeType.name },
        {
          label: 'Estado',
          value: (
            <Badge variant={paymentGuaranteeType.isActive ? 'default' : 'outline'}>
              {paymentGuaranteeType.isActive ? 'Activo' : 'Inactivo'}
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
          value: formatDate(paymentGuaranteeType.createdAt),
        },
        {
          label: 'Actualizado',
          value: formatDate(paymentGuaranteeType.updatedAt),
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
