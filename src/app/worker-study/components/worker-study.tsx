'use client';

import { triggerDownload } from '@/components/data-table/export/download';
import { PageContent, PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useWorkerStudy } from '@/hooks/queries/use-credit-simulation-queries';
import { useIdentificationTypes } from '@/hooks/queries/use-identification-type-queries';
import { WorkerStudyBodySchema, WorkerStudyResult } from '@/schemas/credit-simulation';
import { loanApplicationStatusLabels, LoanApplicationStatus } from '@/schemas/loan-application';
import {
  loanDisbursementStatusLabels,
  LoanDisbursementStatus,
  loanStatusLabels,
  LoanStatus,
} from '@/schemas/loan';
import { formatCurrency, formatDate, formatDateTime, formatNumber } from '@/utils/formatters';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileDown, Search } from 'lucide-react';
import React from 'react';
import { Controller, type Resolver, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const paymentBehaviorLabels: Record<WorkerStudyResult['credits'][number]['paymentBehavior'], string> = {
  PAID: 'Pagado',
  CURRENT: 'Al dia',
  OVERDUE: 'Con mora',
};

function getLoanApplicationStatusLabel(status: WorkerStudyResult['loanApplications'][number]['status']) {
  return loanApplicationStatusLabels[status as LoanApplicationStatus] ?? status;
}

function getLoanStatusLabel(status: WorkerStudyResult['credits'][number]['status']) {
  return loanStatusLabels[status as LoanStatus] ?? status;
}

function getLoanDisbursementStatusLabel(
  status: WorkerStudyResult['credits'][number]['disbursementStatus']
) {
  return loanDisbursementStatusLabels[status as LoanDisbursementStatus] ?? status;
}

const FormSchema = WorkerStudyBodySchema;
type FormValues = z.infer<typeof FormSchema>;

export function WorkerStudy() {
  const [result, setResult] = React.useState<WorkerStudyResult | null>(null);
  const [isExportingPdf, setIsExportingPdf] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema) as Resolver<FormValues>,
    defaultValues: {
      identificationTypeId: undefined,
      documentNumber: '',
    },
  });

  const { data: identificationTypesData, isLoading: isLoadingIdentificationTypes } =
    useIdentificationTypes({
      limit: 1000,
      where: { and: [{ isActive: true }] },
      sort: [{ field: 'name', order: 'asc' }],
    });
  const identificationTypes = React.useMemo(
    () => identificationTypesData?.body.data ?? [],
    [identificationTypesData]
  );

  const { mutateAsync: consultWorkerStudy, isPending: isConsulting } = useWorkerStudy();

  const onSubmit = async (values: FormValues) => {
    const response = await consultWorkerStudy({
      body: values,
    });
    setResult(response.body);
  };

  const handleExportPdf = React.useCallback(async () => {
    if (!result) {
      toast.error('Primero debe consultar un trabajador');
      return;
    }

    try {
      setIsExportingPdf(true);
      const response = await fetch('/api/v1/worker-study/pdf', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      });

      if (!response.ok) {
        let message = 'No fue posible generar el PDF';
        try {
          const body = (await response.json()) as { body?: { message?: string } };
          if (body?.body?.message) message = body.body.message;
        } catch {
          // keep fallback
        }
        toast.error(message);
        return;
      }

      const blob = await response.blob();
      triggerDownload(blob, `estudio-trabajador-${result.worker.documentNumber}.pdf`);
    } catch {
      toast.error('No fue posible descargar el PDF');
    } finally {
      setIsExportingPdf(false);
    }
  }, [result]);

  return (
    <>
      <PageHeader
        title="Estudio de trabajador"
        description="Consulte por tipo y numero de documento para revisar trayectoria, aportes y salario."
      />
      <PageContent>
        <Card>
          <CardHeader>
            <CardTitle>Filtro</CardTitle>
            <CardDescription>Digite los datos del trabajador para consultar su estudio.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FieldGroup className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]">
                <Controller
                  name="identificationTypeId"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="identificationTypeId">Tipo de documento</FieldLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value ? Number(value) : undefined)}
                        value={field.value ? String(field.value) : ''}
                        disabled={isLoadingIdentificationTypes}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              isLoadingIdentificationTypes ? 'Cargando tipos...' : 'Seleccione...'
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {identificationTypes.map((item) => (
                            <SelectItem key={item.id} value={String(item.id)}>
                              {item.code} - {item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  name="documentNumber"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="documentNumber">Numero de identificacion</FieldLabel>
                      <Input
                        id="documentNumber"
                        {...field}
                        value={field.value ?? ''}
                        placeholder="Ej: 1032456789"
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Button type="submit" className="self-end" disabled={isConsulting}>
                  {isConsulting ? <Spinner /> : <Search />}
                  Consultar
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="self-end"
                  disabled={!result || isExportingPdf}
                  onClick={handleExportPdf}
                >
                  {isExportingPdf ? <Spinner /> : <FileDown />}
                  Exportar PDF
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>

        {isConsulting ? (
          <div className="flex items-center gap-2 text-sm">
            <Spinner />
            Consultando estudio...
          </div>
        ) : null}

        {result ? (
          <div className="space-y-4">
            {/* Datos del trabajador */}
            <Card>
              <CardHeader>
                <CardTitle>Datos del trabajador</CardTitle>
                {result.subsidySource ? (
                  <CardDescription>Fuente: {result.subsidySource}</CardDescription>
                ) : null}
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3">
                <div>
                  <p className="text-muted-foreground text-xs">Nombre</p>
                  <p className="font-medium">{result.worker.fullName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Documento</p>
                  <p className="font-medium">
                    {result.worker.identificationTypeCode} {result.worker.documentNumber}
                  </p>
                </div>
                {result.worker.currentSalary != null ? (
                  <div>
                    <p className="text-muted-foreground text-xs">Salario actual</p>
                    <p className="font-medium">{formatCurrency(result.worker.currentSalary)}</p>
                  </div>
                ) : null}
                {result.worker.categoryCode ? (
                  <div>
                    <p className="text-muted-foreground text-xs">Categoria</p>
                    <p className="font-medium">{result.worker.categoryCode}</p>
                  </div>
                ) : null}
                {result.worker.address ? (
                  <div>
                    <p className="text-muted-foreground text-xs">Direccion</p>
                    <p className="font-medium">{result.worker.address}</p>
                  </div>
                ) : null}
                {result.worker.phone ? (
                  <div>
                    <p className="text-muted-foreground text-xs">Telefono</p>
                    <p className="font-medium">{result.worker.phone}</p>
                  </div>
                ) : null}
                {result.worker.email ? (
                  <div>
                    <p className="text-muted-foreground text-xs">Email</p>
                    <p className="font-medium">{result.worker.email}</p>
                  </div>
                ) : null}
                {result.worker.sex ? (
                  <div>
                    <p className="text-muted-foreground text-xs">Sexo</p>
                    <p className="font-medium">{result.worker.sex}</p>
                  </div>
                ) : null}
                <div>
                  <p className="text-muted-foreground text-xs">Generado</p>
                  <p className="font-medium">{formatDateTime(result.generatedAt)}</p>
                </div>
              </CardContent>
            </Card>

            {/* Cónyuges */}
            {result.spouses.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Conyuge(s)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-3">
                    {result.spouses.map((spouse, index) => (
                      <div key={index} className="rounded-lg border p-3">
                        <p className="font-medium">{spouse.fullName}</p>
                        {spouse.documentNumber ? (
                          <p className="text-muted-foreground text-xs">Doc: {spouse.documentNumber}</p>
                        ) : null}
                        {spouse.birthDate ? (
                          <p className="text-muted-foreground text-xs">
                            Fecha nacimiento: {formatDate(spouse.birthDate)}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {/* Beneficiarios */}
            {result.beneficiaries.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Beneficiarios</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Documento</TableHead>
                        <TableHead>Parentesco</TableHead>
                        <TableHead>Edad</TableHead>
                        <TableHead>Fecha nacimiento</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.beneficiaries.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.fullName}</TableCell>
                          <TableCell>{item.documentNumber ?? '-'}</TableCell>
                          <TableCell>{item.relationship ?? '-'}</TableCell>
                          <TableCell>{item.age != null ? item.age : '-'}</TableCell>
                          <TableCell>{item.birthDate ? formatDate(item.birthDate) : '-'}</TableCell>
                          <TableCell>
                            {item.isDeceased ? (
                              <Badge variant="destructive">Fallecido</Badge>
                            ) : (
                              <Badge variant="outline">Activo</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : null}

            {/* Historial de aportes */}
            <Card>
              <CardHeader>
                <CardTitle>Historial de aportes</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Periodo</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>IBC</TableHead>
                      <TableHead>Valor aporte</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.contributions.length ? (
                      result.contributions.map((item, index) => (
                        <TableRow key={`${item.period}-${index}`}>
                          <TableCell>{item.period}</TableCell>
                          <TableCell>{item.companyName}</TableCell>
                          <TableCell>{formatCurrency(item.baseSalary)}</TableCell>
                          <TableCell>{formatCurrency(item.contributionValue)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4}>Sin informacion</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Historial de empresas */}
            <Card>
              <CardHeader>
                <CardTitle>Historial de empresas</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Desde</TableHead>
                      <TableHead>Hasta</TableHead>
                      <TableHead>Meses aportados</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.companyHistory.length ? (
                      result.companyHistory.map((item, index) => (
                        <TableRow key={`${item.companyName}-${index}`}>
                          <TableCell>{item.companyName}</TableCell>
                          <TableCell>{formatDate(item.fromDate)}</TableCell>
                          <TableCell>{item.toDate ? formatDate(item.toDate) : 'Actual'}</TableCell>
                          <TableCell>{formatNumber(item.contributionMonths)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4}>Sin informacion</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Historial de giro de subsidio */}
            {result.subsidyPayments.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Historial de giro de subsidio</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Periodo</TableHead>
                        <TableHead>Parentesco</TableHead>
                        <TableHead>Tipo pago</TableHead>
                        <TableHead>Cuota</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Periodo giro</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.subsidyPayments.map((item, index) => (
                        <TableRow key={`${item.period}-${index}`}>
                          <TableCell>{item.period}</TableCell>
                          <TableCell>{item.beneficiaryRelationship ?? '-'}</TableCell>
                          <TableCell>{item.paymentType ?? '-'}</TableCell>
                          <TableCell>{item.installmentNumber ?? '-'}</TableCell>
                          <TableCell>{formatCurrency(item.installmentValue)}</TableCell>
                          <TableCell>{item.transferPeriod ?? '-'}</TableCell>
                          <TableCell>
                            {item.isVoided ? (
                              <Badge variant="destructive">Anulado</Badge>
                            ) : (
                              <Badge variant="outline">Vigente</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : null}

            {/* Solicitudes de credito */}
            <Card>
              <CardHeader>
                <CardTitle>Solicitudes de credito</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Solicitud</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Valor solicitado</TableHead>
                      <TableHead>Valor aprobado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.loanApplications.length ? (
                      result.loanApplications.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.creditNumber}</TableCell>
                          <TableCell>{formatDate(item.applicationDate)}</TableCell>
                          <TableCell>{item.creditProductName ?? '-'}</TableCell>
                          <TableCell>{getLoanApplicationStatusLabel(item.status)}</TableCell>
                          <TableCell>{formatCurrency(item.requestedAmount)}</TableCell>
                          <TableCell>
                            {item.approvedAmount !== null ? formatCurrency(item.approvedAmount) : '-'}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6}>Sin informacion</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Creditos y cartera */}
            <Card>
              <CardHeader>
                <CardTitle>Creditos y cartera</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Credito</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Desembolso</TableHead>
                      <TableHead>Capital</TableHead>
                      <TableHead>Saldo actual</TableHead>
                      <TableHead>Saldo vencido</TableHead>
                      <TableHead>Abonado</TableHead>
                      <TableHead>Proximo vencimiento</TableHead>
                      <TableHead>Comportamiento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.credits.length ? (
                      result.credits.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.creditNumber}</TableCell>
                          <TableCell>{item.creditProductName ?? '-'}</TableCell>
                          <TableCell>{getLoanStatusLabel(item.status)}</TableCell>
                          <TableCell>
                            {getLoanDisbursementStatusLabel(item.disbursementStatus)}
                          </TableCell>
                          <TableCell>{formatCurrency(item.principalAmount)}</TableCell>
                          <TableCell>{formatCurrency(item.currentBalance)}</TableCell>
                          <TableCell>{formatCurrency(item.overdueBalance)}</TableCell>
                          <TableCell>{formatCurrency(item.totalPaid)}</TableCell>
                          <TableCell>
                            {item.nextDueDate ? formatDate(item.nextDueDate) : '-'}
                          </TableCell>
                          <TableCell>{paymentBehaviorLabels[item.paymentBehavior]}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={10}>Sin informacion</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Observaciones */}
            {result.notes ? (
              <Card>
                <CardHeader>
                  <CardTitle>Observaciones</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{result.notes}</p>
                </CardContent>
              </Card>
            ) : null}
          </div>
        ) : null}
      </PageContent>
    </>
  );
}
