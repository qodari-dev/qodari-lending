import { DescriptionList, DescriptionSection } from '@/components/description-list';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { InvestmentType } from '@/schemas/investment-type';
import { formatDate } from '@/utils/formatters';

export function InvestmentTypeInfo({
  investmentType,
  opened,
  onOpened,
}: {
  investmentType: InvestmentType | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  if (!investmentType) return null;

  const sections: DescriptionSection[] = [
    {
      title: 'Información Básica',
      columns: 2,
      items: [
        { label: 'Nombre', value: investmentType.name },
        {
          label: 'Estado',
          value: (
            <Badge variant={investmentType.isActive ? 'default' : 'outline'}>
              {investmentType.isActive ? 'Activo' : 'Inactivo'}
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
          value: formatDate(investmentType.createdAt),
        },
        {
          label: 'Actualizado',
          value: formatDate(investmentType.updatedAt),
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
