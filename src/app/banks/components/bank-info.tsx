import { DescriptionList, DescriptionSection } from '@/components/description-list';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Bank } from '@/schemas/bank';
import { formatDate } from '@/utils/formatters';

export function BankInfo({
  bank,
  opened,
  onOpened,
}: {
  bank: Bank | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  if (!bank) return null;

  const sections: DescriptionSection[] = [
    {
      title: 'Información Básica',
      columns: 2,
      items: [
        { label: 'Nombre', value: bank.name },
        { label: 'Código Asobancaria', value: bank.asobancariaCode },
        {
          label: 'Estado',
          value: (
            <Badge variant={bank.isActive ? 'default' : 'outline'}>
              {bank.isActive ? 'Activo' : 'Inactivo'}
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
          value: formatDate(bank.createdAt),
        },
        {
          label: 'Actualizado',
          value: formatDate(bank.updatedAt),
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
