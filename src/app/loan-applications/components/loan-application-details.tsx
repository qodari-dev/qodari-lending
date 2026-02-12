'use client';

import { DescriptionList, DescriptionSection } from '@/components/description-list';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePresignLoanApplicationDocumentView } from '@/hooks/queries/use-loan-application-queries';
import {
  bankAccountTypeLabels,
  categoryCodeLabels,
  LoanApplication,
  loanApplicationStatusLabels,
} from '@/schemas/loan-application';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { Eye } from 'lucide-react';

function getApplicantLabel(application: LoanApplication): string {
  const person = application.thirdParty;
  if (!person) return String(application.thirdPartyId);

  if (person.personType === 'LEGAL') {
    return person.businessName ?? person.documentNumber;
  }

  const fullName = [
    person.firstName,
    person.secondName,
    person.firstLastName,
    person.secondLastName,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();
  return fullName || person.documentNumber;
}

function getThirdPartyLabel(party: LoanApplication['thirdParty'] | null): string {
  if (!party) return '-';
  if (party.personType === 'LEGAL') return party.businessName ?? party.documentNumber;
  const fullName = [party.firstName, party.secondName, party.firstLastName, party.secondLastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  return fullName || party.documentNumber;
}

export function LoanApplicationDetails({
  loanApplication,
  className,
}: {
  loanApplication: LoanApplication;
  className?: string;
}) {
  const { mutateAsync: presignView } = usePresignLoanApplicationDocumentView();

  const openDocumentFile = async (fileKey: string) => {
    const response = await presignView({ body: { fileKey } });
    window.open(response.body.viewUrl, '_blank', 'noopener,noreferrer');
  };

  const sections: DescriptionSection[] = [
    {
      title: 'General',
      columns: 3,
      items: [
        { label: 'Numero solicitud', value: loanApplication.creditNumber },
        {
          label: 'Estado',
          value: (
            <Badge variant={loanApplication.status === 'PENDING' ? 'outline' : 'default'}>
              {loanApplicationStatusLabels[loanApplication.status]}
            </Badge>
          ),
        },
        { label: 'Fecha solicitud', value: formatDate(loanApplication.applicationDate) },
        {
          label: 'Oficina',
          value: loanApplication.affiliationOffice?.name ?? loanApplication.affiliationOfficeId,
        },
        { label: 'Canal', value: loanApplication.channel?.name ?? loanApplication.channelId },
      ],
    },
    {
      title: 'Solicitante',
      columns: 2,
      items: [
        { label: 'Solicitante', value: getApplicantLabel(loanApplication) },
        { label: 'Categoria', value: categoryCodeLabels[loanApplication.categoryCode] },
        {
          label: 'Producto',
          value: loanApplication.creditProduct?.name ?? loanApplication.creditProductId,
        },
        { label: 'Fondo', value: loanApplication.creditFund?.name ?? loanApplication.creditFundId },
      ],
    },
    {
      title: 'Valores',
      columns: 3,
      items: [
        { label: 'Valor solicitado', value: formatCurrency(loanApplication.requestedAmount) },
        { label: 'Capacidad de pago', value: formatCurrency(loanApplication.paymentCapacity) },
        { label: 'Salario', value: formatCurrency(loanApplication.salary) },
        { label: 'Otros ingresos', value: formatCurrency(loanApplication.otherIncome) },
        { label: 'Otros creditos', value: formatCurrency(loanApplication.otherCredits) },
        { label: 'Cuotas', value: loanApplication.installments },
      ],
    },
    {
      title: 'Desembolso',
      columns: 2,
      items: [
        { label: 'Banco', value: loanApplication.bank?.name ?? loanApplication.bankId },
        { label: 'Cuenta', value: loanApplication.bankAccountNumber },
        { label: 'Tipo de cuenta', value: bankAccountTypeLabels[loanApplication.bankAccountType] },
        {
          label: 'Aseguradora',
          value: loanApplication.insuranceCompany?.businessName ?? '-',
        },
      ],
    },
    {
      title: 'Actividad',
      columns: 2,
      items: [
        { label: 'Creado', value: formatDate(loanApplication.createdAt) },
        { label: 'Actualizado', value: formatDate(loanApplication.updatedAt) },
        { label: 'Nota', value: loanApplication.note ?? '-' },
        { label: 'Nota estado', value: loanApplication.statusNote ?? '-' },
      ],
    },
  ];

  return (
    <div className={className}>
      <div className="space-y-6">
        <DescriptionList sections={sections} columns={2} />

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Terceros Asociados</h3>
          {loanApplication.loanApplicationCoDebtors?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Documento</TableHead>
                  <TableHead>Tercero</TableHead>
                  <TableHead>Ciudad hogar</TableHead>
                  <TableHead>Ciudad trabajo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loanApplication.loanApplicationCoDebtors.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.thirdParty?.documentNumber ?? row.thirdPartyId ?? '-'}</TableCell>
                    <TableCell>{getThirdPartyLabel(row.thirdParty)}</TableCell>
                    <TableCell>{row.thirdParty?.homeCity?.name ?? '-'}</TableCell>
                    <TableCell>{row.thirdParty?.workCity?.name ?? '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
              No hay terceros asociados.
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Documentos</h3>
          {loanApplication.loanApplicationDocuments?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Documento</TableHead>
                  <TableHead>Entregado</TableHead>
                  <TableHead>Archivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loanApplication.loanApplicationDocuments.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.documentType?.name ?? row.documentTypeId}</TableCell>
                    <TableCell>{row.isDelivered ? 'Si' : 'No'}</TableCell>
                    <TableCell>
                      {row.fileKey ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => row.fileKey && openDocumentFile(row.fileKey)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Ver archivo
                        </Button>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
              No hay documentos.
            </div>
          )}
        </div>

        {loanApplication.pledgesSubsidy ? (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Pignoraciones</h3>
            {loanApplication.loanApplicationPledges?.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Codigo</TableHead>
                    <TableHead>Beneficiario</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loanApplication.loanApplicationPledges.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.pledgeCode}</TableCell>
                      <TableCell>{row.beneficiaryCode}</TableCell>
                      <TableCell>{formatCurrency(row.pledgedAmount)}</TableCell>
                      <TableCell>{formatDate(row.effectiveDate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
                No hay pignoraciones.
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
