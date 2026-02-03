import { DescriptionList, DescriptionSection } from '@/components/description-list';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { DocumentType } from '@/schemas/document-type';
import { formatDate } from '@/utils/formatters';

export function DocumentTypeInfo({
  documentType,
  opened,
  onOpened,
}: {
  documentType: DocumentType | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  if (!documentType) return null;

  const sections: DescriptionSection[] = [
    {
      title: 'Información Básica',
      columns: 2,
      items: [
        { label: 'Nombre', value: documentType.name },
        {
          label: 'Estado',
          value: (
            <Badge variant={documentType.isActive ? 'default' : 'outline'}>
              {documentType.isActive ? 'Activo' : 'Inactivo'}
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
          value: formatDate(documentType.createdAt),
        },
        {
          label: 'Actualizado',
          value: formatDate(documentType.updatedAt),
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
