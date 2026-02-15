'use client';

import { exportToExcel } from '@/components/data-table/export/export-excel';
import { PageContent, PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGenerateInsuranceReport } from '@/hooks/queries/use-insurance-report-queries';
import { useInsuranceCompanies } from '@/hooks/queries/use-insurance-company-queries';
import {
  GenerateInsuranceReportBodySchema,
  GenerateInsuranceReportResult,
  InsuranceReportRow,
} from '@/schemas/insurance-report';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileDown } from 'lucide-react';
import React from 'react';
import { Controller, type Resolver, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const FormSchema = GenerateInsuranceReportBodySchema;
type FormValues = z.infer<typeof FormSchema>;

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function InsuranceReport() {
  const [result, setResult] = React.useState<GenerateInsuranceReportResult | null>(null);

  const today = React.useMemo(() => new Date(), []);
  const monthStart = React.useMemo(() => getMonthStart(today), [today]);

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema) as Resolver<FormValues>,
    defaultValues: {
      insuranceCompanyId: undefined,
      liquidatedCreditsStartDate: monthStart,
      liquidatedCreditsEndDate: today,
    },
  });

  const { data: insuranceCompaniesData, isLoading: isLoadingInsuranceCompanies } =
    useInsuranceCompanies({
      limit: 1000,
      include: [],
      where: { and: [{ isActive: true }] },
      sort: [{ field: 'businessName', order: 'asc' }],
    });

  const insuranceCompanies = React.useMemo(
    () => insuranceCompaniesData?.body.data ?? [],
    [insuranceCompaniesData]
  );

  const { mutateAsync: generateReport, isPending: isGenerating } = useGenerateInsuranceReport();

  const onSubmit = async (values: FormValues) => {
    const response = await generateReport({
      body: values,
    });
    setResult(response.body);
    toast.success('Reporte generado');
  };

  const handleDownloadExcel = React.useCallback(async () => {
    if (!result) return;

    await exportToExcel<InsuranceReportRow>(
      {
        title: `Reporte para aseguradora - ${result.insuranceCompanyName}`,
        filename: `reporte-aseguradora-${result.insuranceCompanyName.toLowerCase().replace(/\s+/g, '-')}`,
        columns: [
          { header: '# Credito', accessorKey: 'creditNumber', width: 18 },
          { header: 'Documento', accessorKey: 'borrowerDocumentNumber', width: 18 },
          { header: 'Titular', accessorKey: 'borrowerName', width: 30 },
          { header: 'Fecha liquidacion', accessorKey: 'liquidationDate', width: 18 },
          {
            header: 'Valor credito',
            width: 18,
            getValue: (row) => formatCurrency(row.principalAmount),
          },
          {
            header: 'Valor asegurado',
            width: 18,
            getValue: (row) => formatCurrency(row.insuredAmount),
          },
        ],
      },
      result.rows
    );
    toast.success('Excel generado correctamente');
  }, [result]);

  return (
    <>
      <PageHeader
        title="Reporte para aseguradoras"
        description="Seleccione aseguradora y rango de fechas de creditos liquidados para generar excel."
      />
      <PageContent>
        <Card>
          <CardHeader>
            <CardTitle>Parametros</CardTitle>
            <CardDescription>
              Defina la aseguradora y el rango de creditos liquidados a reportar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FieldGroup className="grid gap-4 md:grid-cols-3">
                <Controller
                  name="insuranceCompanyId"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="insuranceCompanyId">Aseguradora</FieldLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value ? Number(value) : undefined)}
                        value={field.value ? String(field.value) : ''}
                        disabled={isLoadingInsuranceCompanies}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {insuranceCompanies.map((item) => (
                            <SelectItem key={item.id} value={String(item.id)}>
                              {item.businessName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  name="liquidatedCreditsStartDate"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="liquidatedCreditsStartDate">
                        Fecha inicio creditos liquidados
                      </FieldLabel>
                      <DatePicker
                        id="liquidatedCreditsStartDate"
                        value={field.value ?? null}
                        onChange={(value) => field.onChange(value ?? null)}
                        ariaInvalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  name="liquidatedCreditsEndDate"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="liquidatedCreditsEndDate">
                        Fecha fin creditos liquidados
                      </FieldLabel>
                      <DatePicker
                        id="liquidatedCreditsEndDate"
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
                  Generar reporte
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {result ? (
          <Card>
            <CardHeader>
              <CardTitle>Resultado</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-5">
              <div>
                <p className="text-muted-foreground text-xs">Aseguradora</p>
                <p className="font-medium">{result.insuranceCompanyName}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Fecha inicio</p>
                <p className="font-medium">{formatDate(result.liquidatedCreditsStartDate)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Fecha fin</p>
                <p className="font-medium">{formatDate(result.liquidatedCreditsEndDate)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Creditos revisados</p>
                <p className="font-medium">{result.reviewedCredits}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Creditos reportados</p>
                <p className="font-medium">{result.reportedCredits}</p>
              </div>
              <div className="md:col-span-5">
                <p className="text-muted-foreground text-xs">Mensaje</p>
                <p className="font-medium">{result.message}</p>
              </div>
              <div className="md:col-span-5">
                <Button type="button" variant="outline" onClick={handleDownloadExcel}>
                  <FileDown />
                  Descargar Excel
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </PageContent>
    </>
  );
}

