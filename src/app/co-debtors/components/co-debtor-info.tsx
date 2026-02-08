import { DescriptionList, DescriptionSection } from '@/components/description-list';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { CoDebtor } from '@/schemas/co-debtor';
import { formatDate, formatCurrency } from '@/utils/formatters';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function CoDebtorInfo({
  coDebtor,
  opened,
  onOpened,
}: {
  coDebtor: CoDebtor | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  if (!coDebtor) return null;

  const sections: DescriptionSection[] = [
    {
      title: 'Identificacion',
      columns: 2,
      items: [
        { label: 'Tipo de Documento', value: coDebtor.identificationType?.name },
        { label: 'Numero de Documento', value: coDebtor.documentNumber },
      ],
    },
    {
      title: 'Datos de Residencia',
      columns: 2,
      items: [
        { label: 'Direccion', value: coDebtor.homeAddress },
        { label: 'Codigo Ciudad', value: coDebtor.homeCity?.name },
        { label: 'Telefono', value: coDebtor.homePhone },
      ],
    },
    {
      title: 'Datos Laborales',
      columns: 2,
      items: [
        { label: 'Empresa', value: coDebtor.companyName },
        { label: 'Direccion Trabajo', value: coDebtor.workAddress },
        { label: 'Codigo Ciudad Trabajo', value: coDebtor.workCity?.name },
        { label: 'Telefono Trabajo', value: coDebtor.workPhone },
      ],
    },
    {
      title: 'Actividad',
      columns: 2,
      items: [
        {
          label: 'Creado',
          value: formatDate(coDebtor.createdAt),
        },
        {
          label: 'Actualizado',
          value: formatDate(coDebtor.updatedAt),
        },
      ],
    },
  ];

  const loanApplications =
    coDebtor.loanApplicationCoDebtors?.map((lac) => lac.loanApplication).filter(Boolean) ?? [];

  return (
    <Sheet open={opened} onOpenChange={(open) => onOpened(open)}>
      <SheetContent className="overflow-y-scroll sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Informacion del Codeudor</SheetTitle>
        </SheetHeader>
        <div className="px-4">
          <DescriptionList sections={sections} columns={2} />

          {/* Solicitudes de credito asociadas */}
          <div className="mt-6">
            <h3 className="mb-4 text-lg font-semibold">Solicitudes de Credito Asociadas</h3>
            {loanApplications.length > 0 ? (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>No. Solicitud</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loanApplications.map((app) => (
                      <TableRow key={app?.id}>
                        <TableCell className="font-medium">{app?.id}</TableCell>
                        <TableCell>{app?.creditNumber ?? '-'}</TableCell>
                        <TableCell>
                          {app?.requestedAmount ? formatCurrency(Number(app.requestedAmount)) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{app?.status ?? '-'}</Badge>
                        </TableCell>
                        <TableCell>{app?.createdAt ? formatDate(app.createdAt) : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-muted-foreground rounded-lg border py-8 text-center">
                No hay solicitudes de credito asociadas a este codeudor.
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
