import { DescriptionList, DescriptionSection } from '@/components/description-list';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { IdentificationType } from '@/schemas/identification-type';
import { formatDate } from '@/utils/formatters';

export function IdentificationTypeInfo({
  identificationType,
  opened,
  onOpened,
}: {
  identificationType: IdentificationType | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  if (!identificationType) return null;

  const sections: DescriptionSection[] = [
    {
      title: 'Información Básica',
      columns: 2,
      items: [
        { label: 'Código', value: identificationType.code },
        { label: 'Nombre', value: identificationType.name },
        {
          label: 'Estado',
          value: (
            <Badge variant={identificationType.isActive ? 'default' : 'outline'}>
              {identificationType.isActive ? 'Activo' : 'Inactivo'}
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
          value: formatDate(identificationType.createdAt),
        },
        {
          label: 'Actualizado',
          value: formatDate(identificationType.updatedAt),
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
