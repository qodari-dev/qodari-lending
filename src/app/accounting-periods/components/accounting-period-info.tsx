import { DescriptionList, DescriptionSection } from '@/components/description-list';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AccountingPeriod, MONTH_LABELS } from '@/schemas/accounting-period';
import { formatDate } from '@/utils/formatters';

export function AccountingPeriodInfo({
  accountingPeriod,
  opened,
  onOpened,
}: {
  accountingPeriod: AccountingPeriod | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  if (!accountingPeriod) return null;

  const sections: DescriptionSection[] = [
    {
      title: 'Periodo',
      columns: 2,
      items: [
        { label: 'Año', value: accountingPeriod.year },
        { label: 'Mes', value: MONTH_LABELS[accountingPeriod.month] ?? accountingPeriod.month },
        {
          label: 'Estado',
          value: (
            <Badge variant={accountingPeriod.isClosed ? 'destructive' : 'default'}>
              {accountingPeriod.isClosed ? 'Cerrado' : 'Abierto'}
            </Badge>
          ),
        },
      ],
    },
    ...(accountingPeriod.isClosed
      ? [
          {
            title: 'Información de Cierre',
            columns: 2,
            items: [
              {
                label: 'Fecha de Cierre',
                value: accountingPeriod.closedAt ? formatDate(accountingPeriod.closedAt) : '-',
              },
              {
                label: 'Usuario que Cerró',
                value: accountingPeriod.closedByUserName ?? accountingPeriod.closedByUserId ?? '-',
              },
            ],
          } as DescriptionSection,
        ]
      : []),
    {
      title: 'Actividad',
      columns: 2,
      items: [
        {
          label: 'Creado',
          value: formatDate(accountingPeriod.createdAt),
        },
        {
          label: 'Actualizado',
          value: formatDate(accountingPeriod.updatedAt),
        },
      ],
    },
  ];

  return (
    <Sheet open={opened} onOpenChange={(open) => onOpened(open)}>
      <SheetContent className="overflow-y-scroll sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>
            Periodo: {accountingPeriod.year} - {MONTH_LABELS[accountingPeriod.month]}
          </SheetTitle>
        </SheetHeader>
        <div className="px-4">
          <DescriptionList sections={sections} columns={2} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
