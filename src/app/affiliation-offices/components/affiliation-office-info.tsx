import { DescriptionList, DescriptionSection } from '@/components/description-list';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AffiliationOffice } from '@/schemas/affiliation-office';
import { formatDate } from '@/utils/formatters';

export function AffiliationOfficeInfo({
  affiliationOffice,
  opened,
  onOpened,
}: {
  affiliationOffice: AffiliationOffice | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  if (!affiliationOffice) return null;

  const users = affiliationOffice.userAffiliationOffices ?? [];

  const sections: DescriptionSection[] = [
    {
      title: 'Informacion Basica',
      columns: 2,
      items: [
        { label: 'Nombre', value: affiliationOffice.name },
        { label: 'Ciudad', value: affiliationOffice.city?.name ?? affiliationOffice.cityId },
        { label: 'Direccion', value: affiliationOffice.address },
        { label: 'Telefono', value: affiliationOffice.phone ?? '-' },
        { label: 'Representante', value: affiliationOffice.representativeName },
        { label: 'Email', value: affiliationOffice.email ?? '-' },
        {
          label: 'Centro de costo',
          value: affiliationOffice.costCenter
            ? `${affiliationOffice.costCenter.code} - ${affiliationOffice.costCenter.name}`
            : '-',
        },
        {
          label: 'Estado',
          value: (
            <Badge variant={affiliationOffice.isActive ? 'default' : 'outline'}>
              {affiliationOffice.isActive ? 'Activo' : 'Inactivo'}
            </Badge>
          ),
        },
      ],
    },
    {
      title: 'Actividad',
      columns: 2,
      items: [
        { label: 'Creado', value: formatDate(affiliationOffice.createdAt) },
        { label: 'Actualizado', value: formatDate(affiliationOffice.updatedAt) },
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

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Usuarios</h3>
            {users.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Principal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.userName}</TableCell>
                      <TableCell>
                        <Badge variant={user.isPrimary ? 'default' : 'outline'}>
                          {user.isPrimary ? 'Si' : 'No'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
                No hay usuarios configurados.
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
