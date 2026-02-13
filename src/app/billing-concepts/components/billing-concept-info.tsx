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
  BillingConcept,
  BillingConceptBaseAmount,
  BillingConceptCalcMethod,
  BillingConceptFrequency,
  BillingConceptFinancingMode,
  BillingConceptRangeMetric,
  BillingConceptType,
  billingConceptBaseAmountLabels,
  billingConceptCalcMethodLabels,
  billingConceptFinancingModeLabels,
  billingConceptFrequencyLabels,
  billingConceptRangeMetricLabels,
  billingConceptTypeLabels,
} from '@/schemas/billing-concept';
import { formatDate, formatDateOnly } from '@/utils/formatters';

export function BillingConceptInfo({
  billingConcept,
  opened,
  onOpened,
}: {
  billingConcept: BillingConcept | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  if (!billingConcept) return null;

  const rules = billingConcept.billingConceptRules ?? [];
  const calcMethod = billingConcept.calcMethod as BillingConceptCalcMethod;
  const isTieredMethod =
    calcMethod === 'TIERED_FIXED_AMOUNT' || calcMethod === 'TIERED_PERCENTAGE';
  const sortedRules = rules.slice().sort((a, b) => {
    if (isTieredMethod) {
      return Number(a.valueFrom ?? '0') - Number(b.valueFrom ?? '0');
    }
    return formatDateOnly(a.effectiveFrom ?? null).localeCompare(formatDateOnly(b.effectiveFrom ?? null));
  });

  const sections: DescriptionSection[] = [
    {
      title: 'Informacion basica',
      columns: 2,
      items: [
        { label: 'Codigo', value: billingConcept.code },
        { label: 'Nombre', value: billingConcept.name },
        {
          label: 'Tipo',
          value:
            billingConceptTypeLabels[billingConcept.conceptType as BillingConceptType] ??
            billingConcept.conceptType,
        },
        {
          label: 'Frecuencia default',
          value:
            billingConceptFrequencyLabels[
              billingConcept.defaultFrequency as BillingConceptFrequency
            ] ?? billingConcept.defaultFrequency,
        },
        {
          label: 'Modo financiacion default',
          value:
            billingConceptFinancingModeLabels[
              billingConcept.defaultFinancingMode as BillingConceptFinancingMode
            ] ?? billingConcept.defaultFinancingMode,
        },
        {
          label: 'Metodo calculo',
          value: billingConceptCalcMethodLabels[calcMethod] ?? billingConcept.calcMethod,
        },
        {
          label: 'Base',
          value: billingConcept.baseAmount
            ? billingConceptBaseAmountLabels[billingConcept.baseAmount as BillingConceptBaseAmount]
            : '-',
        },
        {
          label: 'Metrica rango',
          value: billingConcept.rangeMetric
            ? billingConceptRangeMetricLabels[billingConcept.rangeMetric as BillingConceptRangeMetric]
            : '-',
        },
        { label: 'Valor minimo', value: billingConcept.minAmount ?? '-' },
        { label: 'Valor maximo', value: billingConcept.maxAmount ?? '-' },
        {
          label: 'Redondeo',
          value: `${billingConcept.roundingMode} (${billingConcept.roundingDecimals} dec)`,
        },
        {
          label: 'Cuenta default',
          value: billingConcept.defaultGlAccount
            ? `${billingConcept.defaultGlAccount.code} - ${billingConcept.defaultGlAccount.name}`
            : '-',
        },
        {
          label: 'Sistema',
          value: <Badge variant={billingConcept.isSystem ? 'secondary' : 'outline'}>{billingConcept.isSystem ? 'Si' : 'No'}</Badge>,
        },
        {
          label: 'Estado',
          value: (
            <Badge variant={billingConcept.isActive ? 'default' : 'outline'}>
              {billingConcept.isActive ? 'Activo' : 'Inactivo'}
            </Badge>
          ),
        },
        { label: 'Descripcion', value: billingConcept.description ?? '-' },
      ],
    },
    {
      title: 'Actividad',
      columns: 2,
      items: [
        { label: 'Creado', value: formatDate(billingConcept.createdAt) },
        { label: 'Actualizado', value: formatDate(billingConcept.updatedAt) },
      ],
    },
  ];

  return (
    <Sheet open={opened} onOpenChange={(open) => onOpened(open)}>
      <SheetContent className="overflow-y-scroll sm:max-w-4xl">
        <SheetHeader>
          <SheetTitle>Informacion</SheetTitle>
        </SheetHeader>
        <div className="space-y-6 px-4">
          <DescriptionList sections={sections} columns={2} />

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Reglas</h3>
            {rules.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tasa</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Rango</TableHead>
                    <TableHead>Vigencia</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell className="font-mono text-xs">{rule.rate ?? '-'}</TableCell>
                        <TableCell className="font-mono text-xs">{rule.amount ?? '-'}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {rule.valueFrom ?? '-'} / {rule.valueTo ?? '-'}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {formatDateOnly(rule.effectiveFrom) || '-'} /{' '}
                          {formatDateOnly(rule.effectiveTo) || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={rule.isActive ? 'default' : 'outline'}>
                            {rule.isActive ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            ) : (
              <div className={cn('text-muted-foreground rounded-md border border-dashed p-4 text-sm')}>
                No hay reglas configuradas.
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
