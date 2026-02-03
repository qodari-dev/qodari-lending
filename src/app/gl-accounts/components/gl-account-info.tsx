import { DescriptionList, DescriptionSection } from '@/components/description-list';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  GlAccount,
  thirdPartySettingLabels,
  accountDetailTypeLabels,
  ThirdPartySetting,
  AccountDetailType,
} from '@/schemas/gl-account';
import { formatDate } from '@/utils/formatters';

export function GlAccountInfo({
  glAccount,
  opened,
  onOpened,
}: {
  glAccount: GlAccount | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  if (!glAccount) return null;

  const sections: DescriptionSection[] = [
    {
      title: 'Informacion Basica',
      columns: 2,
      items: [
        { label: 'Codigo', value: glAccount.code },
        { label: 'Nombre', value: glAccount.name },
        {
          label: 'Configuracion de Tercero',
          value: (
            <Badge variant="outline">
              {thirdPartySettingLabels[glAccount.thirdPartySetting as ThirdPartySetting]}
            </Badge>
          ),
        },
        {
          label: 'Tipo de Detalle',
          value: (
            <Badge variant="outline">
              {accountDetailTypeLabels[glAccount.detailType as AccountDetailType]}
            </Badge>
          ),
        },
        {
          label: 'Requiere Centro de Costo',
          value: (
            <Badge variant={glAccount.requiresCostCenter ? 'default' : 'outline'}>
              {glAccount.requiresCostCenter ? 'Si' : 'No'}
            </Badge>
          ),
        },
        {
          label: 'Es Cuenta Bancaria',
          value: (
            <Badge variant={glAccount.isBank ? 'default' : 'outline'}>
              {glAccount.isBank ? 'Si' : 'No'}
            </Badge>
          ),
        },
        {
          label: 'Estado',
          value: (
            <Badge variant={glAccount.isActive ? 'default' : 'outline'}>
              {glAccount.isActive ? 'Activo' : 'Inactivo'}
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
          value: formatDate(glAccount.createdAt),
        },
        {
          label: 'Actualizado',
          value: formatDate(glAccount.updatedAt),
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
