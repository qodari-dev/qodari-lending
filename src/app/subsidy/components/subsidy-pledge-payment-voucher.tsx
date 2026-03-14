'use client';

import { PageContent, PageHeader } from '@/components/layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import {
  useGeneratePledgePaymentVoucher,
  useSubsidyPledgePaymentVoucher,
  useSubsidyPledgePaymentVouchers,
} from '@/hooks/queries/use-subsidy-queries';
import { GeneratePledgePaymentVoucherBodySchema } from '@/schemas/subsidy';
import { formatCurrency, formatDate, formatDateTime } from '@/utils/formatters';
import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import { Controller, type Resolver, useForm } from 'react-hook-form';
import { z } from 'zod';

const FormSchema = GeneratePledgePaymentVoucherBodySchema;
type FormValues = z.infer<typeof FormSchema>;

function VoucherStatusBadge({ status }: { status: string }) {
  const variant =
    status === 'COMPLETED'
      ? 'default'
      : status === 'PARTIAL'
        ? 'secondary'
        : status === 'FAILED'
          ? 'destructive'
          : 'outline';

  return <Badge variant={variant}>{status}</Badge>;
}

export function SubsidyPledgePaymentVoucher() {
  const today = React.useMemo(() => new Date(), []);
  const [selectedVoucherId, setSelectedVoucherId] = React.useState<number | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema) as Resolver<FormValues>,
    defaultValues: {
      period: '',
      movementGenerationDate: today,
    },
  });

  const {
    data: vouchersData,
    isFetching: isFetchingVouchers,
    refetch: refetchVouchers,
  } = useSubsidyPledgePaymentVouchers(10, { refetchInterval: 3000 });

  const vouchers = React.useMemo(() => vouchersData?.body ?? [], [vouchersData]);
  const preferredVoucher =
    vouchers.find((item) => item.status === 'RUNNING') ??
    vouchers.find((item) => item.status === 'QUEUED') ??
    vouchers[0];

  React.useEffect(() => {
    if (!preferredVoucher) return;
    const selectedExists = selectedVoucherId
      ? vouchers.some((item) => item.voucherId === selectedVoucherId)
      : false;

    if (!selectedVoucherId || !selectedExists) {
      setSelectedVoucherId(preferredVoucher.voucherId);
    }
  }, [preferredVoucher, selectedVoucherId, vouchers]);

  const selectedSummary = vouchers.find((item) => item.voucherId === selectedVoucherId) ?? null;
  const shouldPollSelectedVoucher =
    selectedSummary?.status === 'QUEUED' || selectedSummary?.status === 'RUNNING';

  const { data: selectedVoucherData, isFetching: isFetchingSelectedVoucher } =
    useSubsidyPledgePaymentVoucher(selectedVoucherId ?? 0, {
      enabled: !!selectedVoucherId,
      refetchInterval: shouldPollSelectedVoucher ? 3000 : false,
    });

  const selectedVoucher = selectedVoucherData?.body ?? null;
  const { mutateAsync: generateVoucher, isPending: isGenerating } = useGeneratePledgePaymentVoucher();

  const onSubmit = async (values: FormValues) => {
    const response = await generateVoucher({
      body: values,
    });
    setSelectedVoucherId(response.body.voucherId);
  };

  return (
    <>
      <PageHeader
        title="Genera comprobante de abonos de pignoracion"
        description="Encole y monitoree el procesamiento de abonos por pignoración de subsidio."
      />
      <PageContent>
        <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Parámetros</CardTitle>
            <CardDescription>
              El período se consulta en subsidio y el proceso corre en segundo plano.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FieldGroup className="grid gap-4 md:grid-cols-2">
                <Controller
                  name="period"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="period">Periodo</FieldLabel>
                      <Input
                        id="period"
                        {...field}
                        value={field.value ?? ''}
                        placeholder="Ej: 202603"
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  name="movementGenerationDate"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="movementGenerationDate">
                        Fecha de generación de movimientos
                      </FieldLabel>
                      <DatePicker
                        id="movementGenerationDate"
                        value={field.value ?? null}
                        onChange={(value) => field.onChange(value ?? null)}
                        ariaInvalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </FieldGroup>

              <div className="flex gap-2">
                <Button type="submit" disabled={isGenerating}>
                  {isGenerating ? <Spinner /> : null}
                  Encolar comprobante
                </Button>
                <Button type="button" variant="outline" onClick={() => void refetchVouchers()}>
                  Actualizar historial
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Últimos lotes</CardTitle>
            <CardDescription>
              Se selecciona automáticamente el lote en ejecución o el más reciente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead className="text-muted-foreground border-b text-left">
                  <tr>
                    <th className="px-2 py-3 font-medium">Lote</th>
                    <th className="px-2 py-3 font-medium">Estado</th>
                    <th className="px-2 py-3 font-medium">Periodo</th>
                    <th className="px-2 py-3 font-medium">Fecha mov.</th>
                    <th className="px-2 py-3 font-medium">Abonos</th>
                    <th className="px-2 py-3 font-medium">Errores</th>
                    <th className="px-2 py-3 font-medium">Creado</th>
                    <th className="px-2 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {vouchers.map((item) => (
                    <tr
                      key={item.voucherId}
                      className={selectedVoucherId === item.voucherId ? 'bg-muted/40 border-b' : 'border-b'}
                    >
                      <td className="px-2 py-3">{item.voucherId}</td>
                      <td className="px-2 py-3">
                        <VoucherStatusBadge status={item.status} />
                      </td>
                      <td className="px-2 py-3">{item.period}</td>
                      <td className="px-2 py-3">{formatDate(item.movementGenerationDate)}</td>
                      <td className="px-2 py-3">{item.processedPayments}</td>
                      <td className="px-2 py-3">{item.errorRows}</td>
                      <td className="px-2 py-3">{formatDateTime(item.createdAt)}</td>
                      <td className="px-2 py-3">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedVoucherId(item.voucherId)}
                        >
                          Ver
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {!vouchers.length ? (
                    <tr>
                      <td className="text-muted-foreground px-2 py-6 text-center" colSpan={8}>
                        {isFetchingVouchers ? 'Cargando lotes...' : 'No hay lotes registrados.'}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {selectedVoucher ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Lote seleccionado</CardTitle>
                <CardDescription>
                  Lote #{selectedVoucher.voucherId}
                  {isFetchingSelectedVoucher ? ' - actualizando...' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-6">
                <div>
                  <p className="text-muted-foreground text-xs">Estado</p>
                  <div className="pt-1">
                    <VoucherStatusBadge status={selectedVoucher.status} />
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Periodo</p>
                  <p className="font-medium">{selectedVoucher.period}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Fecha movimientos</p>
                  <p className="font-medium">{formatDate(selectedVoucher.movementGenerationDate)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Créditos</p>
                  <p className="font-medium">{selectedVoucher.processedCredits}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Abonos</p>
                  <p className="font-medium">{selectedVoucher.processedPayments}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Filas</p>
                  <p className="font-medium">{selectedVoucher.totalRows}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Omitidos</p>
                  <p className="font-medium">{selectedVoucher.skippedRows}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Errores</p>
                  <p className="font-medium">{selectedVoucher.errorRows}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Valor descontado</p>
                  <p className="font-medium">{formatCurrency(selectedVoucher.totalDiscountedAmount)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Valor abonado</p>
                  <p className="font-medium">{formatCurrency(selectedVoucher.totalAppliedAmount)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Inicio</p>
                  <p className="font-medium">
                    {selectedVoucher.startedAt ? formatDateTime(selectedVoucher.startedAt) : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Fin</p>
                  <p className="font-medium">
                    {selectedVoucher.finishedAt ? formatDateTime(selectedVoucher.finishedAt) : '-'}
                  </p>
                </div>
                <div className="md:col-span-6">
                  <p className="text-muted-foreground text-xs">Mensaje</p>
                  <p className="font-medium">{selectedVoucher.message}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Detalle de filas</CardTitle>
                <CardDescription>
                  Resultado por giro de subsidio con descuento aplicado a crédito.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-sm">
                    <thead className="text-muted-foreground border-b text-left">
                      <tr>
                        <th className="px-2 py-3 font-medium">Estado</th>
                        <th className="px-2 py-3 font-medium">Trabajador</th>
                        <th className="px-2 py-3 font-medium">Marca</th>
                        <th className="px-2 py-3 font-medium">Documento</th>
                        <th className="px-2 py-3 font-medium">Crédito</th>
                        <th className="px-2 py-3 font-medium">Descontado</th>
                        <th className="px-2 py-3 font-medium">Aplicado</th>
                        <th className="px-2 py-3 font-medium">Mensaje</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedVoucher.rows.map((row, index) => (
                        <tr key={`${row.workerDocumentNumber ?? 'row'}-${index}`} className="border-b">
                          <td className="px-2 py-3">
                            <Badge
                              variant={
                                row.status === 'PROCESSED'
                                  ? 'default'
                                  : row.status === 'SKIPPED'
                                    ? 'secondary'
                                    : 'destructive'
                              }
                            >
                              {row.status}
                            </Badge>
                          </td>
                          <td className="px-2 py-3">{row.workerDocumentNumber || '-'}</td>
                          <td className="px-2 py-3">{row.mark || '-'}</td>
                          <td className="px-2 py-3">{row.documentNumber || '-'}</td>
                          <td className="px-2 py-3">{row.creditNumber || '-'}</td>
                          <td className="px-2 py-3">{formatCurrency(row.discountedAmount)}</td>
                          <td className="px-2 py-3">{formatCurrency(row.appliedAmount)}</td>
                          <td className="px-2 py-3">{row.message}</td>
                        </tr>
                      ))}
                      {!selectedVoucher.rows.length ? (
                        <tr>
                          <td className="text-muted-foreground px-2 py-6 text-center" colSpan={8}>
                            No hay filas registradas en este lote.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
        </div>
      </PageContent>
    </>
  );
}
