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
  AccountingDistribution,
  entryNatureLabels,
  EntryNature,
} from '@/schemas/accounting-distribution';
import { formatDate, formatPercent } from '@/utils/formatters';

export function AccountingDistributionInfo({
  accountingDistribution,
  opened,
  onOpened,
}: {
  accountingDistribution: AccountingDistribution | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  if (!accountingDistribution) return null;

  const lines = accountingDistribution.accountingDistributionLines ?? [];
  const totals = lines.reduce(
    (acc, line) => {
      const value = Number(line.percentage) || 0;
      if (line.nature === 'DEBIT') acc.debit += value;
      if (line.nature === 'CREDIT') acc.credit += value;
      return acc;
    },
    { debit: 0, credit: 0 }
  );
  const epsilon = 0.01;
  const debitOk = Math.abs(totals.debit - 100) <= epsilon;
  const creditOk = Math.abs(totals.credit - 100) <= epsilon;
  const isBalanced = debitOk && creditOk;

  const sections: DescriptionSection[] = [
    {
      title: 'Informacion Basica',
      columns: 2,
      items: [
        { label: 'Nombre', value: accountingDistribution.name },
        {
          label: 'Estado',
          value: (
            <Badge variant={accountingDistribution.isActive ? 'default' : 'outline'}>
              {accountingDistribution.isActive ? 'Activo' : 'Inactivo'}
            </Badge>
          ),
        },
      ],
    },
    {
      title: 'Control de Distribucion',
      columns: 3,
      items: [
        { label: 'Total lineas', value: lines.length },
        { label: '% Debito', value: formatPercent(totals.debit, 2) },
        { label: '% Credito', value: formatPercent(totals.credit, 2) },
        {
          label: 'Estado cuadre',
          value: (
            <Badge variant={isBalanced ? 'default' : 'outline'}>
              {isBalanced ? 'Cuadrado' : 'Descuadrado'}
            </Badge>
          ),
        },
        {
          label: 'Diferencia debito',
          value: formatPercent(totals.debit - 100, 2),
        },
        {
          label: 'Diferencia credito',
          value: formatPercent(totals.credit - 100, 2),
        },
      ],
    },
    {
      title: 'Actividad',
      columns: 2,
      items: [
        {
          label: 'Creado',
          value: formatDate(accountingDistribution.createdAt),
        },
        {
          label: 'Actualizado',
          value: formatDate(accountingDistribution.updatedAt),
        },
      ],
    },
  ];

  return (
    <Sheet open={opened} onOpenChange={(open) => onOpened(open)}>
      <SheetContent className="overflow-y-scroll sm:max-w-5xl">
        <SheetHeader>
        <SheetTitle>Informacion</SheetTitle>
        </SheetHeader>
        <div className="space-y-6 px-4">
          <DescriptionList sections={sections} columns={2} />

          {/* Lineas de Distribucion */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Lineas de Distribucion</h3>
            {lines.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Cuenta</TableHead>
                    <TableHead>Centro de Costo</TableHead>
                    <TableHead>Naturaleza</TableHead>
                    <TableHead>Porcentaje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line, index) => (
                    <TableRow key={line.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        {line.glAccount
                          ? `${line.glAccount.code} - ${line.glAccount.name}`
                          : line.glAccountId}
                      </TableCell>
                      <TableCell>
                        {line.costCenter
                          ? `${line.costCenter.code} - ${line.costCenter.name}`
                          : (line.costCenterId ?? '-')}
                      </TableCell>
                      <TableCell>
                        {entryNatureLabels[line.nature as EntryNature] ?? line.nature}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {formatPercent(line.percentage, 2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div
                className={cn('text-muted-foreground rounded-md border border-dashed p-4 text-sm')}
              >
                No hay lineas de distribucion configuradas.
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
