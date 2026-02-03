import { DescriptionList, DescriptionSection } from '@/components/description-list';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { CostCenter } from '@/schemas/cost-center';
import { formatDate } from '@/utils/formatters';

export function CostCenterInfo({
  costCenter,
  opened,
  onOpened,
}: {
  costCenter: CostCenter | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  if (!costCenter) return null;

  const sections: DescriptionSection[] = [
    {
      title: 'Informacion Basica',
      columns: 2,
      items: [
        { label: 'Codigo', value: costCenter.code },
        { label: 'Nombre', value: costCenter.name },
        {
          label: 'Estado',
          value: (
            <Badge variant={costCenter.isActive ? 'default' : 'outline'}>
              {costCenter.isActive ? 'Activo' : 'Inactivo'}
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
          value: formatDate(costCenter.createdAt),
        },
        {
          label: 'Actualizado',
          value: formatDate(costCenter.updatedAt),
        },
      ],
    },
  ];

  return (
    <Sheet open={opened} onOpenChange={(open) => onOpened(open)}>
      <SheetContent className="overflow-y-scroll sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Informacion</SheetTitle>
        </SheetHeader>
        <div className="px-4">
          <DescriptionList sections={sections} columns={2} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
