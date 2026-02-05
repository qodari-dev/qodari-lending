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
  INSURANCE_RATE_RANGE_METRIC_LABELS,
  InsuranceCompany,
} from '@/schemas/insurance-company';
import { formatDate } from '@/utils/formatters';

export function InsuranceCompanyInfo({
  insuranceCompany,
  opened,
  onOpened,
}: {
  insuranceCompany: InsuranceCompany | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  if (!insuranceCompany) return null;

  const rateRanges = insuranceCompany.insuranceRateRanges ?? [];

  const sections: DescriptionSection[] = [
    {
      title: 'Identificación',
      columns: 2,
      items: [
        { label: 'Razón Social', value: insuranceCompany.businessName },
        {
          label: 'Documento',
          value: `${insuranceCompany.documentNumber}${insuranceCompany.verificationDigit ? `-${insuranceCompany.verificationDigit}` : ''}`,
        },
      ],
    },
    {
      title: 'Contacto',
      columns: 2,
      items: [
        { label: 'Dirección', value: insuranceCompany.address },
        { label: 'Teléfono', value: insuranceCompany.phone ?? '-' },
        { label: 'Celular', value: insuranceCompany.mobileNumber ?? '-' },
        { label: 'Email', value: insuranceCompany.email ?? '-' },
      ],
    },
    {
      title: 'Parámetros de Seguro',
      columns: 2,
      items: [
        { label: 'Factor', value: insuranceCompany.factor },
        { label: 'Valor Mínimo', value: insuranceCompany.minimumValue ?? '-' },
      ],
    },
    {
      title: 'Estado',
      columns: 2,
      items: [
        {
          label: 'Estado',
          value: (
            <Badge variant={insuranceCompany.isActive ? 'default' : 'outline'}>
              {insuranceCompany.isActive ? 'Activo' : 'Inactivo'}
            </Badge>
          ),
        },
        { label: 'Nota', value: insuranceCompany.note ?? '-' },
      ],
    },
    {
      title: 'Actividad',
      columns: 2,
      items: [
        {
          label: 'Creado',
          value: formatDate(insuranceCompany.createdAt),
        },
        {
          label: 'Actualizado',
          value: formatDate(insuranceCompany.updatedAt),
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
        <div className="space-y-6 px-4">
          <DescriptionList sections={sections} columns={2} />

          {/* Rangos de Tasas de Seguro */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Rangos de Tasas de Seguro</h3>
            {rateRanges.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Métrica</TableHead>
                    <TableHead>Desde</TableHead>
                    <TableHead>Hasta</TableHead>
                    <TableHead>Tasa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rateRanges.map((range) => (
                    <TableRow key={range.id}>
                      <TableCell>
                        {INSURANCE_RATE_RANGE_METRIC_LABELS[range.rangeMetric] ?? range.rangeMetric}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {range.valueFrom}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {range.valueTo}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {range.rateValue}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div
                className={cn(
                  'text-muted-foreground rounded-md border border-dashed p-4 text-sm'
                )}
              >
                No hay rangos de tasas configurados.
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
