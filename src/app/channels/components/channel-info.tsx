import { DescriptionList, DescriptionSection } from '@/components/description-list';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Channel } from '@/schemas/channel';
import { formatDate } from '@/utils/formatters';

export function ChannelInfo({
  channel,
  opened,
  onOpened,
}: {
  channel: Channel | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  if (!channel) return null;

  const sections: DescriptionSection[] = [
    {
      title: 'Información Básica',
      columns: 2,
      items: [
        { label: 'Código', value: <span className="font-mono">{channel.code}</span> },
        { label: 'Nombre', value: channel.name },
        {
          label: 'Descripción',
          value: channel.description || '-',
        },
        {
          label: 'Estado',
          value: (
            <Badge variant={channel.isActive ? 'default' : 'outline'}>
              {channel.isActive ? 'Activo' : 'Inactivo'}
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
          value: formatDate(channel.createdAt),
        },
        {
          label: 'Actualizado',
          value: formatDate(channel.updatedAt),
        },
      ],
    },
  ];

  return (
    <Sheet open={opened} onOpenChange={(open) => onOpened(open)}>
      <SheetContent className="overflow-y-scroll sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Información del Canal</SheetTitle>
        </SheetHeader>
        <div className="px-4">
          <DescriptionList sections={sections} columns={2} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
