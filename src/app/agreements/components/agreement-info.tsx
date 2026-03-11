import { DescriptionList, DescriptionSection } from '@/components/description-list';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  useAgreement,
} from '@/hooks/queries/use-agreement-queries';
import {
  Agreement,
} from '@/schemas/agreement';
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
  const agreementId = agreement?.id ?? 0;
  const { data: agreementResponse } = useAgreement(agreementId, {
    include: ['city', 'billingEmailTemplate'],
    enabled: opened && Boolean(agreementId),
  });
  const agreementDetail = agreementResponse?.body ?? agreement;

  if (!agreement || !agreementDetail) return null;

  const sections: DescriptionSection[] = [
    {
      title: 'Informacion basica',
      columns: 2,
      items: [
        { label: 'Codigo convenio', value: agreement.agreementCode },
        { label: 'NIT', value: agreementDetail.documentNumber },
        { label: 'Empresa', value: agreementDetail.businessName },
        { label: 'Ciudad', value: agreementDetail.city?.name ?? '—' },
        {
          label: 'Estado',
          value: (
            <Badge variant={agreementDetail.isActive ? 'default' : 'outline'}>
              {agreementDetail.isActive ? 'Activo' : 'Inactivo'}
            </Badge>
          ),
        },
      ],
    },
    {
      title: 'Datos de contacto',
      columns: 2,
      items: [
        { label: 'Direccion', value: agreementDetail.address ?? '—' },
        { label: 'Telefono', value: agreementDetail.phone ?? '—' },
        { label: 'Representante legal', value: agreementDetail.legalRepresentative ?? '—' },
      ],
    },
    {
      title: 'Correo de facturacion',
      columns: 2,
      items: [
        { label: 'Plantilla', value: agreementDetail.billingEmailTemplate?.name ?? '—' },
        { label: 'Correo principal', value: agreementDetail.billingEmailTo ?? '—' },
        { label: 'Correo copia', value: agreementDetail.billingEmailCc ?? '—' },
      ],
    },
    {
      title: 'Vigencia',
      columns: 2,
      items: [
        { label: 'Fecha inicio', value: formatDate(agreementDetail.startDate) },
        {
          label: 'Fecha fin',
          value: agreementDetail.endDate ? formatDate(agreementDetail.endDate) : 'Vigente',
        },
        {
          label: 'Fecha estado',
          value: agreementDetail.statusDate ? formatDate(agreementDetail.statusDate) : '—',
        },
        { label: 'Nota', value: agreementDetail.note ?? '—' },
      ],
    },
    {
      title: 'Actividad',
      columns: 2,
      items: [
        { label: 'Creado', value: formatDate(agreementDetail.createdAt) },
        { label: 'Actualizado', value: formatDate(agreementDetail.updatedAt) },
      ],
    },
  ];

  return (
    <Sheet open={opened} onOpenChange={(open) => onOpened(open)}>
      <SheetContent className="overflow-y-scroll sm:max-w-4xl">
        <SheetHeader>
          <SheetTitle>Informacion</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-4">
          <DescriptionList sections={sections} columns={2} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
