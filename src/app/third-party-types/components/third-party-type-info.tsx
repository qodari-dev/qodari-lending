import { DescriptionList, DescriptionSection } from '@/components/description-list';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ThirdPartyType } from '@/schemas/third-party-type';
import { formatDate } from '@/utils/formatters';

export function ThirdPartyTypeInfo({
  thirdPartyType,
  opened,
  onOpened,
}: {
  thirdPartyType: ThirdPartyType | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  if (!thirdPartyType) return null;

  const sections: DescriptionSection[] = [
    {
      title: 'Informacion Basica',
      columns: 2,
      items: [
        { label: 'Nombre', value: thirdPartyType.name },
      ],
    },
    {
      title: 'Actividad',
      columns: 2,
      items: [
        {
          label: 'Creado',
          value: formatDate(thirdPartyType.createdAt),
        },
        {
          label: 'Actualizado',
          value: formatDate(thirdPartyType.updatedAt),
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
