import { DescriptionList, DescriptionSection } from '@/components/description-list';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { RepaymentMethod } from '@/schemas/repayment-method';
import { formatDate } from '@/utils/formatters';

export function RepaymentMethodInfo({
  repaymentMethod,
  opened,
  onOpened,
}: {
  repaymentMethod: RepaymentMethod | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  if (!repaymentMethod) return null;

  const sections: DescriptionSection[] = [
    {
      title: 'Información Básica',
      columns: 2,
      items: [
        { label: 'Nombre', value: repaymentMethod.name },
        {
          label: 'Estado',
          value: (
            <Badge variant={repaymentMethod.isActive ? 'default' : 'outline'}>
              {repaymentMethod.isActive ? 'Activo' : 'Inactivo'}
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
          value: formatDate(repaymentMethod.createdAt),
        },
        {
          label: 'Actualizado',
          value: formatDate(repaymentMethod.updatedAt),
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
