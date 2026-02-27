import { DescriptionList, DescriptionSection } from '@/components/description-list';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  useAgreement,
  useAgreementBillingEmailDispatches,
  useRetryAgreementBillingEmailDispatch,
} from '@/hooks/queries/use-agreement-queries';
import {
  Agreement,
  agreementBillingEmailDispatchStatusLabels,
} from '@/schemas/agreement';
import { useHasPermission } from '@/stores/auth-store-provider';
import { formatDate, formatDateTime } from '@/utils/formatters';
import { RotateCcw } from 'lucide-react';
import { useMemo } from 'react';

export function AgreementInfo({
  agreement,
  opened,
  onOpened,
}: {
  agreement: Agreement | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  const agreementId = agreement?.id ?? 0;
  const canRun = useHasPermission('agreements:run');
  const { data: agreementResponse } = useAgreement(agreementId, {
    include: ['city', 'billingEmailTemplate'],
    enabled: opened && Boolean(agreementId),
  });
  const { data: dispatchesResponse, refetch: refetchDispatches } = useAgreementBillingEmailDispatches(
    agreementId,
    25,
    opened && Boolean(agreementId)
  );
  const { mutateAsync: retryDispatch, isPending: isRetryingDispatch } =
    useRetryAgreementBillingEmailDispatch();
  const agreementDetail = agreementResponse?.body ?? agreement;
  const dispatches = useMemo(() => dispatchesResponse?.body?.data ?? [], [dispatchesResponse]);

  if (!agreement || !agreementDetail) return null;

  const handleRetryDispatch = async (dispatchId: number) => {
    await retryDispatch({ params: { id: dispatchId } });
    await refetchDispatches();
  };

  const sections: DescriptionSection[] = [
    {
      title: 'Informacion basica',
      columns: 2,
      items: [
        { label: 'Codigo convenio', value: agreement.agreementCode },
        { label: 'NIT', value: agreementDetail.documentNumber },
        { label: 'Empresa', value: agreementDetail.businessName },
        { label: 'Ciudad', value: agreementDetail.city?.name ?? '—' },
        {
          label: 'Estado',
          value: (
            <Badge variant={agreementDetail.isActive ? 'default' : 'outline'}>
              {agreementDetail.isActive ? 'Activo' : 'Inactivo'}
            </Badge>
          ),
        },
      ],
    },
    {
      title: 'Datos de contacto',
      columns: 2,
      items: [
        { label: 'Direccion', value: agreementDetail.address ?? '—' },
        { label: 'Telefono', value: agreementDetail.phone ?? '—' },
        { label: 'Representante legal', value: agreementDetail.legalRepresentative ?? '—' },
      ],
    },
    {
      title: 'Correo de facturacion',
      columns: 2,
      items: [
        { label: 'Plantilla', value: agreementDetail.billingEmailTemplate?.name ?? '—' },
        { label: 'Correo principal', value: agreementDetail.billingEmailTo ?? '—' },
        { label: 'Correo copia', value: agreementDetail.billingEmailCc ?? '—' },
      ],
    },
    {
      title: 'Vigencia',
      columns: 2,
      items: [
        { label: 'Fecha inicio', value: formatDate(agreementDetail.startDate) },
        {
          label: 'Fecha fin',
          value: agreementDetail.endDate ? formatDate(agreementDetail.endDate) : 'Vigente',
        },
        {
          label: 'Fecha estado',
          value: agreementDetail.statusDate ? formatDate(agreementDetail.statusDate) : '—',
        },
        { label: 'Nota', value: agreementDetail.note ?? '—' },
      ],
    },
    {
      title: 'Actividad',
      columns: 2,
      items: [
        { label: 'Creado', value: formatDate(agreementDetail.createdAt) },
        { label: 'Actualizado', value: formatDate(agreementDetail.updatedAt) },
      ],
    },
  ];

  return (
    <Sheet open={opened} onOpenChange={(open) => onOpened(open)}>
      <SheetContent className="overflow-y-scroll sm:max-w-4xl">
        <SheetHeader>
          <SheetTitle>Informacion</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-4">
          <DescriptionList sections={sections} columns={2} />
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm font-medium">Historial de envios</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Intentos</TableHead>
                  <TableHead>Ultimo evento</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead className="w-[100px]">Accion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dispatches.length ? (
                  dispatches.map((dispatch) => (
                    <TableRow key={dispatch.id}>
                      <TableCell className="font-mono text-xs">#{dispatch.id}</TableCell>
                      <TableCell>{dispatch.period}</TableCell>
                      <TableCell>
                        {agreementBillingEmailDispatchStatusLabels[dispatch.status] ?? dispatch.status}
                      </TableCell>
                      <TableCell>{dispatch.attempts}</TableCell>
                      <TableCell>
                        {formatDateTime(
                          dispatch.sentAt ??
                            dispatch.failedAt ??
                            dispatch.startedAt ??
                            dispatch.queuedAt ??
                            dispatch.createdAt
                        )}
                      </TableCell>
                      <TableCell className="max-w-[260px] truncate" title={dispatch.lastError ?? ''}>
                        {dispatch.lastError ?? '—'}
                      </TableCell>
                      <TableCell>
                        {dispatch.status === 'FAILED' && canRun ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isRetryingDispatch}
                            onClick={() => handleRetryDispatch(dispatch.id)}
                          >
                            <RotateCcw className="mr-1 h-3 w-3" />
                            Reenviar
                          </Button>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-muted-foreground text-center">
                      Sin envios registrados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
