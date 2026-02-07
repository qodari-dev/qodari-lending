import { DescriptionList, DescriptionSection } from '@/components/description-list';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  categoryCodeLabels,
  ThirdParty,
  personTypeLabels,
  sexLabels,
  taxpayerTypeLabels,
} from '@/schemas/third-party';
import { formatDate, formatCurrency } from '@/utils/formatters';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function ThirdPartyInfo({
  thirdParty,
  opened,
  onOpened,
}: {
  thirdParty: ThirdParty | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  if (!thirdParty) return null;

  const isNatural = thirdParty.personType === 'NATURAL';
  const displayName = isNatural
    ? `${thirdParty.firstName ?? ''} ${thirdParty.secondName ?? ''} ${thirdParty.firstLastName ?? ''} ${thirdParty.secondLastName ?? ''}`.trim()
    : (thirdParty.businessName ?? '');

  const sections: DescriptionSection[] = [
    {
      title: 'Identificacion',
      columns: 2,
      items: [
        { label: 'Tipo de Documento', value: thirdParty.identificationType?.name },
        { label: 'Numero de Documento', value: thirdParty.documentNumber },
        { label: 'Digito Verificacion', value: thirdParty.verificationDigit ?? '-' },
        {
          label: 'Tipo de Persona',
          value: (
            <Badge variant={isNatural ? 'default' : 'secondary'}>
              {personTypeLabels[thirdParty.personType]}
            </Badge>
          ),
        },
      ],
    },
    ...(isNatural
      ? [
          {
            title: 'Datos Persona Natural',
            columns: 2,
            items: [
              { label: 'Primer Nombre', value: thirdParty.firstName ?? '-' },
              { label: 'Segundo Nombre', value: thirdParty.secondName ?? '-' },
              { label: 'Primer Apellido', value: thirdParty.firstLastName ?? '-' },
              { label: 'Segundo Apellido', value: thirdParty.secondLastName ?? '-' },
              {
                label: 'Sexo',
                value: thirdParty.sex ? sexLabels[thirdParty.sex] : '-',
              },
            ],
          } satisfies DescriptionSection,
        ]
      : [
          {
            title: 'Datos Persona Juridica',
            columns: 2,
            items: [
              { label: 'Razon Social', value: thirdParty.businessName ?? '-' },
              { label: 'Cedula Representante', value: thirdParty.representativeIdNumber ?? '-' },
            ],
          } satisfies DescriptionSection,
        ]),
    {
      title: 'Contacto',
      columns: 2,
      items: [
        { label: 'Ciudad', value: thirdParty.city?.name ?? '-' },
        { label: 'Direccion', value: thirdParty.address ?? '-' },
        { label: 'Telefono', value: thirdParty.phone },
        { label: 'Celular', value: thirdParty.mobilePhone ?? '-' },
        { label: 'Correo', value: thirdParty.email ?? '-' },
      ],
    },
    {
      title: 'Clasificacion',
      columns: 2,
      items: [
        { label: 'Tipo de Tercero', value: thirdParty.thirdPartyType?.name ?? '-' },
        { label: 'Tipo Contribuyente', value: taxpayerTypeLabels[thirdParty.taxpayerType] },
        {
          label: 'Codigo Categoria',
          value: thirdParty.categoryCode ? categoryCodeLabels[thirdParty.categoryCode] : '-',
        },
        {
          label: 'Tiene RUT',
          value: (
            <Badge variant={thirdParty.hasRut ? 'default' : 'outline'}>
              {thirdParty.hasRut ? 'Si' : 'No'}
            </Badge>
          ),
        },
      ],
    },
    {
      title: 'Datos Empleador',
      columns: 2,
      items: [
        { label: 'NIT Empleador', value: thirdParty.employerDocumentNumber ?? '-' },
        { label: 'Razon Social Empleador', value: thirdParty.employerBusinessName ?? '-' },
      ],
    },
    {
      title: 'Notas',
      columns: 1,
      items: [{ label: 'Observaciones', value: thirdParty.note ?? '-' }],
    },
    {
      title: 'Actividad',
      columns: 2,
      items: [
        {
          label: 'Creado',
          value: formatDate(thirdParty.createdAt),
        },
        {
          label: 'Actualizado',
          value: formatDate(thirdParty.updatedAt),
        },
      ],
    },
  ];

  const loanApplications = thirdParty.loanApplications ?? [];
  const loans = thirdParty.loans ?? [];

  return (
    <Sheet open={opened} onOpenChange={(open) => onOpened(open)}>
      <SheetContent className="overflow-y-scroll sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>Informacion del Tercero</SheetTitle>
          <p className="text-muted-foreground text-sm">
            {thirdParty.identificationType?.name} {thirdParty.documentNumber} - {displayName}
          </p>
        </SheetHeader>
        <div className="px-4">
          <DescriptionList sections={sections} columns={2} />

          {/* Solicitudes de credito */}
          <div className="mt-6">
            <h3 className="mb-4 text-lg font-semibold">Solicitudes de Credito</h3>
            {loanApplications.length > 0 ? (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Codigo</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loanApplications.map((app) => (
                      <TableRow key={app.id}>
                        <TableCell className="font-medium">{app.id}</TableCell>
                        <TableCell>{app.code ?? '-'}</TableCell>
                        <TableCell>{app.creditProduct?.name ?? '-'}</TableCell>
                        <TableCell>
                          {app.requestedAmount ? formatCurrency(Number(app.requestedAmount)) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{app.status ?? '-'}</Badge>
                        </TableCell>
                        <TableCell>{app.createdAt ? formatDate(app.createdAt) : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-muted-foreground rounded-lg border py-8 text-center">
                No hay solicitudes de credito para este tercero.
              </div>
            )}
          </div>

          {/* Creditos */}
          <div className="mt-6">
            <h3 className="mb-4 text-lg font-semibold">Creditos Actuales</h3>
            {loans.length > 0 ? (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Codigo</TableHead>
                      <TableHead>Fondo</TableHead>
                      <TableHead>Monto Capital</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha Inicio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loans.map((loan) => (
                      <TableRow key={loan.id}>
                        <TableCell className="font-medium">{loan.id}</TableCell>
                        <TableCell>{loan.code ?? '-'}</TableCell>
                        <TableCell>{loan.creditFund?.name ?? '-'}</TableCell>
                        <TableCell>
                          {loan.principalAmount
                            ? formatCurrency(Number(loan.principalAmount))
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{loan.status ?? '-'}</Badge>
                        </TableCell>
                        <TableCell>
                          {loan.creditStartDate ? formatDate(loan.creditStartDate) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-muted-foreground rounded-lg border py-8 text-center">
                No hay creditos activos para este tercero.
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
