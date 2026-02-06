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
import { CreditFund } from '@/schemas/credit-fund';
import { formatCurrency, formatDate } from '@/utils/formatters';

function formatPeriodLabel(period?: { year: number; month: number }) {
  if (!period) return '-';
  const month = String(period.month).padStart(2, '0');
  return `${period.year}-${month}`;
}

export function CreditFundInfo({
  creditFund,
  opened,
  onOpened,
}: {
  creditFund: CreditFund | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  if (!creditFund) return null;

  const budgets = creditFund.creditFundBudgets ?? [];

  const sections: DescriptionSection[] = [
    {
      title: 'Informacion Basica',
      columns: 2,
      items: [
        { label: 'Nombre', value: creditFund.name },
        {
          label: 'Controla',
          value: (
            <Badge variant={creditFund.isControlled ? 'default' : 'outline'}>
              {creditFund.isControlled ? 'Si' : 'No'}
            </Badge>
          ),
        },
        {
          label: 'Estado',
          value: (
            <Badge variant={creditFund.isActive ? 'default' : 'outline'}>
              {creditFund.isActive ? 'Activo' : 'Inactivo'}
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
          value: formatDate(creditFund.createdAt),
        },
        {
          label: 'Actualizado',
          value: formatDate(creditFund.updatedAt),
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

          {/* Presupuestos */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Presupuestos</h3>
            {budgets.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Periodo</TableHead>
                    <TableHead>Fondo</TableHead>
                    <TableHead>Reinversion</TableHead>
                    <TableHead>Gastos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budgets.map((budget) => (
                    <TableRow key={budget.id}>
                      <TableCell>{formatPeriodLabel(budget.accountingPeriod)}</TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {formatCurrency(budget.fundAmount)}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {formatCurrency(budget.reinvestmentAmount)}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {formatCurrency(budget.expenseAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div
                className={cn('text-muted-foreground rounded-md border border-dashed p-4 text-sm')}
              >
                No hay presupuestos configurados.
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
