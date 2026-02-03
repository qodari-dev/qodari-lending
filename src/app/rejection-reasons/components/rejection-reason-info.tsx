import { DescriptionList, DescriptionSection } from '@/components/description-list';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { RejectionReason } from '@/schemas/rejection-reason';
import { formatDate } from '@/utils/formatters';

export function RejectionReasonInfo({
  rejectionReason,
  opened,
  onOpened,
}: {
  rejectionReason: RejectionReason | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  if (!rejectionReason) return null;

  const sections: DescriptionSection[] = [
    {
      title: 'Información Básica',
      columns: 2,
      items: [
        { label: 'Nombre', value: rejectionReason.name },
        {
          label: 'Estado',
          value: (
            <Badge variant={rejectionReason.isActive ? 'default' : 'outline'}>
              {rejectionReason.isActive ? 'Activo' : 'Inactivo'}
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
          value: formatDate(rejectionReason.createdAt),
        },
        {
          label: 'Actualizado',
          value: formatDate(rejectionReason.updatedAt),
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
