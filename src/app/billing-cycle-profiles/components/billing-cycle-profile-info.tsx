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
import {
  BillingCycleProfile,
  weekendPolicyLabels,
  WeekendPolicy,
} from '@/schemas/billing-cycle-profile';
import { formatDate } from '@/utils/formatters';

export function BillingCycleProfileInfo({
  billingCycleProfile,
  opened,
  onOpened,
}: {
  billingCycleProfile: BillingCycleProfile | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  if (!billingCycleProfile) return null;

  const cycles = billingCycleProfile.billingCycleProfileCycles ?? [];

  const sections: DescriptionSection[] = [
    {
      title: 'Informacion basica',
      columns: 2,
      items: [
        { label: 'Nombre', value: billingCycleProfile.name },
        { label: 'Tipo credito', value: billingCycleProfile.creditProduct?.name ?? '—' },
        {
          label: 'Convenio',
          value: billingCycleProfile.agreement?.businessName ?? 'Default producto',
        },
        { label: 'Ciclos por mes', value: String(billingCycleProfile.cyclesPerMonth) },
        {
          label: 'Politica fin de semana',
          value: weekendPolicyLabels[billingCycleProfile.weekendPolicy as WeekendPolicy] ?? '—',
        },
        {
          label: 'Estado',
          value: (
            <Badge variant={billingCycleProfile.isActive ? 'default' : 'outline'}>
              {billingCycleProfile.isActive ? 'Activo' : 'Inactivo'}
            </Badge>
          ),
        },
      ],
    },
    {
      title: 'Actividad',
      columns: 2,
      items: [
        { label: 'Creado', value: formatDate(billingCycleProfile.createdAt) },
        { label: 'Actualizado', value: formatDate(billingCycleProfile.updatedAt) },
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
            <h3 className="text-sm font-semibold">Ciclos</h3>
            {cycles.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ciclo</TableHead>
                    <TableHead>Corte</TableHead>
                    <TableHead>Generacion</TableHead>
                    <TableHead>Pago esperado</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cycles
                    .slice()
                    .sort((a, b) => a.cycleInMonth - b.cycleInMonth)
                    .map((cycle) => (
                      <TableRow key={cycle.id}>
                        <TableCell>{cycle.cycleInMonth}</TableCell>
                        <TableCell>{cycle.cutoffDay}</TableCell>
                        <TableCell>{cycle.runDay}</TableCell>
                        <TableCell>{cycle.expectedPayDay ?? '—'}</TableCell>
                        <TableCell>{cycle.isActive ? 'Activo' : 'Inactivo'}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            ) : (
              <div className={cn('text-muted-foreground rounded-md border border-dashed p-4 text-sm')}>
                No hay ciclos configurados.
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
