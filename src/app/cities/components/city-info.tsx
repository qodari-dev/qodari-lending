import { DescriptionList, DescriptionSection } from '@/components/description-list';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { City } from '@/schemas/city';
import { formatDate } from '@/utils/formatters';

export function CityInfo({
  city,
  opened,
  onOpened,
}: {
  city: City | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  if (!city) return null;

  const sections: DescriptionSection[] = [
    {
      title: 'Información Básica',
      columns: 2,
      items: [
        { label: 'Código', value: city.code },
        { label: 'Nombre', value: city.name },
        {
          label: 'Estado',
          value: (
            <Badge variant={city.isActive ? 'default' : 'outline'}>
              {city.isActive ? 'Activo' : 'Inactivo'}
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
          value: formatDate(city.createdAt),
        },
        {
          label: 'Actualizado',
          value: formatDate(city.updatedAt),
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
