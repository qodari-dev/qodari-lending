'use client';

import { exportToPdf } from '@/components/data-table/export/export-pdf';
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
import { useWorkerStudy } from '@/hooks/queries/use-credit-simulation-queries';
import { useIdentificationTypes } from '@/hooks/queries/use-identification-type-queries';
import { WorkerStudyBodySchema, WorkerStudyResult } from '@/schemas/credit-simulation';
import { formatCurrency, formatDate, formatDateTime, formatNumber } from '@/utils/formatters';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileDown, Search } from 'lucide-react';
import React from 'react';
import { Controller, type Resolver, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

type WorkerStudyExportRow = {
  section: string;
  detail: string;
  value: string;
};

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

    const exportRows: WorkerStudyExportRow[] = [
      {
        section: 'Trabajador',
        detail: 'Nombre',
        value: result.worker.fullName,
      },
      {
        section: 'Trabajador',
        detail: 'Documento',
        value: `${result.worker.identificationTypeCode} ${result.worker.documentNumber}`,
      },
      {
        section: 'Salario',
        detail: 'Actual',
        value: formatCurrency(result.salary.currentSalary),
      },
      {
        section: 'Salario',
        detail: 'Promedio ultimos 6 meses',
        value: formatCurrency(result.salary.averageSalaryLastSixMonths),
      },
      {
        section: 'Trayectoria',
        detail: 'Meses de aportes',
        value: formatNumber(result.trajectory.totalContributionMonths),
      },
      ...result.contributions.map((item) => ({
        section: 'Aportes',
        detail: `${item.period} - ${item.companyName}`,
        value: `${formatCurrency(item.contributionBaseSalary)} / ${formatCurrency(item.contributionValue)}`,
      })),
      ...result.companyHistory.map((item) => ({
        section: 'Empresas',
        detail: item.companyName,
        value: `${formatDate(item.fromDate)} a ${item.toDate ? formatDate(item.toDate) : 'Actual'}`,
      })),
    ];

    try {
      setIsExportingPdf(true);
      await exportToPdf(
        {
          title: 'Estudio de trabajador',
          filename: `estudio-trabajador-${result.worker.documentNumber}`,
          columns: [
            { header: 'Seccion', accessorKey: 'section', width: 20 },
            { header: 'Detalle', accessorKey: 'detail', width: 45 },
            { header: 'Valor', accessorKey: 'value', width: 35 },
          ],
        },
        exportRows
      );
      toast.success('PDF generado correctamente');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No fue posible generar el PDF');
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
            <Card>
              <CardHeader>
                <CardTitle>Datos del trabajador</CardTitle>
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
                <div>
                  <p className="text-muted-foreground text-xs">Generado</p>
                  <p className="font-medium">{formatDateTime(result.generatedAt)}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Salario y trayectoria</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3">
                <div>
                  <p className="text-muted-foreground text-xs">Salario actual</p>
                  <p className="font-medium">{formatCurrency(result.salary.currentSalary)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Promedio ultimos 6 meses</p>
                  <p className="font-medium">
                    {formatCurrency(result.salary.averageSalaryLastSixMonths)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Salario mas alto (6 meses)</p>
                  <p className="font-medium">
                    {formatCurrency(result.salary.highestSalaryLastSixMonths)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Meses de aportes</p>
                  <p className="font-medium">
                    {formatNumber(result.trajectory.totalContributionMonths)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Empresa actual</p>
                  <p className="font-medium">{result.trajectory.currentCompanyName ?? '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Empresa anterior</p>
                  <p className="font-medium">{result.trajectory.previousCompanyName ?? '-'}</p>
                </div>
              </CardContent>
            </Card>

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
                      result.contributions.map((item) => (
                        <TableRow key={`${item.period}-${item.companyName}`}>
                          <TableCell>{item.period}</TableCell>
                          <TableCell>{item.companyName}</TableCell>
                          <TableCell>{formatCurrency(item.contributionBaseSalary)}</TableCell>
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
                      result.companyHistory.map((item) => (
                        <TableRow key={`${item.companyName}-${item.fromDate}`}>
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
