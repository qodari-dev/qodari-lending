import { DescriptionList, DescriptionSection } from '@/components/description-list';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { AgingProfile } from '@/schemas/aging-profile';
import { formatDate } from '@/utils/formatters';

export function AgingProfileInfo({
  agingProfile,
  opened,
  onOpened,
}: {
  agingProfile: AgingProfile | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  if (!agingProfile) return null;

  const buckets = agingProfile.agingBuckets ?? [];

  const sections: DescriptionSection[] = [
    {
      title: 'Informacion Basica',
      columns: 2,
      items: [
        { label: 'Nombre', value: agingProfile.name },
        {
          label: 'Estado',
          value: (
            <Badge variant={agingProfile.isActive ? 'default' : 'outline'}>
              {agingProfile.isActive ? 'Activo' : 'Inactivo'}
            </Badge>
          ),
        },
        { label: 'Nota', value: agingProfile.note ?? '-' },
      ],
    },
    {
      title: 'Actividad',
      columns: 2,
      items: [
        {
          label: 'Creado',
          value: formatDate(agingProfile.createdAt),
        },
        {
          label: 'Actualizado',
          value: formatDate(agingProfile.updatedAt),
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
        <div className="space-y-6 px-4">
          <DescriptionList sections={sections} columns={2} />

          {/* Buckets */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Buckets</h3>
            {buckets.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Orden</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Rango</TableHead>
                    <TableHead>Provision</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {buckets.map((bucket) => (
                    <TableRow key={bucket.id}>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {bucket.sortOrder}
                      </TableCell>
                      <TableCell>{bucket.name}</TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {bucket.daysFrom} - {bucket.daysTo ?? '...'}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {bucket.provisionRate ?? '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={bucket.isActive ? 'default' : 'outline'}>
                          {bucket.isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className={cn('text-muted-foreground rounded-md border border-dashed p-4 text-sm')}>
                No hay buckets configurados.
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
