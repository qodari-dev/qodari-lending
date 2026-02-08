import { DescriptionList, DescriptionSection } from '@/components/description-list';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Agreement } from '@/schemas/agreement';
import { formatDate } from '@/utils/formatters';

export function AgreementInfo({
  agreement,
  opened,
  onOpened,
}: {
  agreement: Agreement | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  if (!agreement) return null;

  const sections: DescriptionSection[] = [
    {
      title: 'Informacion basica',
      columns: 2,
      items: [
        { label: 'Codigo convenio', value: agreement.agreementCode },
        { label: 'NIT', value: agreement.documentNumber },
        { label: 'Empresa', value: agreement.businessName },
        { label: 'Ciudad', value: agreement.city?.name ?? '—' },
        {
          label: 'Estado',
          value: (
            <Badge variant={agreement.isActive ? 'default' : 'outline'}>
              {agreement.isActive ? 'Activo' : 'Inactivo'}
            </Badge>
          ),
        },
      ],
    },
    {
      title: 'Datos de contacto',
      columns: 2,
      items: [
        { label: 'Direccion', value: agreement.address ?? '—' },
        { label: 'Telefono', value: agreement.phone ?? '—' },
        { label: 'Representante legal', value: agreement.legalRepresentative ?? '—' },
      ],
    },
    {
      title: 'Vigencia',
      columns: 2,
      items: [
        { label: 'Fecha inicio', value: formatDate(agreement.startDate) },
        { label: 'Fecha fin', value: agreement.endDate ? formatDate(agreement.endDate) : 'Vigente' },
        { label: 'Fecha estado', value: agreement.statusDate ? formatDate(agreement.statusDate) : '—' },
        { label: 'Nota', value: agreement.note ?? '—' },
      ],
    },
    {
      title: 'Actividad',
      columns: 2,
      items: [
        { label: 'Creado', value: formatDate(agreement.createdAt) },
        { label: 'Actualizado', value: formatDate(agreement.updatedAt) },
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
