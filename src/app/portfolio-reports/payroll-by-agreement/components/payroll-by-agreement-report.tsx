'use client';

import { exportToExcel } from '@/components/data-table/export/export-excel';
import { PageContent, PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { useAgreements } from '@/hooks/queries/use-agreement-queries';
import { useGeneratePayrollPortfolioByAgreementReport } from '@/hooks/queries/use-portfolio-report-queries';
import {
  GeneratePayrollPortfolioByAgreementBodySchema,
  GeneratePayrollPortfolioByAgreementReportResult,
  PayrollPortfolioByAgreementReportRow,
} from '@/schemas/portfolio-report';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileDown } from 'lucide-react';
import React from 'react';
import { Controller, type Resolver, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const FormSchema = GeneratePayrollPortfolioByAgreementBodySchema;
type FormValues = z.infer<typeof FormSchema>;

export function PayrollByAgreementReport() {
  const [result, setResult] = React.useState<GeneratePayrollPortfolioByAgreementReportResult | null>(
    null
  );
  const today = React.useMemo(() => new Date(), []);
  const { data: agreementsData, isLoading: isLoadingAgreements } = useAgreements({
    limit: 1000,
    include: [],
    sort: [
      { field: 'businessName', order: 'asc' },
      { field: 'agreementCode', order: 'asc' },
    ],
  });
  const agreements = React.useMemo(() => agreementsData?.body.data ?? [], [agreementsData]);

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema) as Resolver<FormValues>,
    defaultValues: { agreementId: undefined, cutoffDate: today },
  });

  const { mutateAsync: generateReport, isPending: isGenerating } =
    useGeneratePayrollPortfolioByAgreementReport();

  const onSubmit = async (values: FormValues) => {
    const response = await generateReport({ body: values });
    setResult(response.body);
    toast.success('Reporte generado');
  };

  const onDownload = React.useCallback(async () => {
    if (!result) return;
    await exportToExcel<PayrollPortfolioByAgreementReportRow>(
      {
        title: 'Reporte cartera de libranza por convenio',
        filename: `cartera-libranza-por-convenio-${result.cutoffDate}`,
        columns: [
          { header: 'Item', width: 10, getValue: (row) => String(row.item) },
          { header: 'Convenio', accessorKey: 'agreementName', width: 28 },
          { header: '# Credito', accessorKey: 'creditNumber', width: 18 },
          { header: 'Documento', accessorKey: 'thirdPartyDocumentNumber', width: 18 },
          { header: 'Tercero', accessorKey: 'thirdPartyName', width: 28 },
          { header: 'Tipo credito', accessorKey: 'creditProductName', width: 20 },
          { header: 'Forma de pago', accessorKey: 'repaymentMethodName', width: 20 },
          { header: 'Empresa', accessorKey: 'employerBusinessName', width: 28 },
          { header: 'Telefono', accessorKey: 'phone', width: 18 },
          { header: 'Direccion', accessorKey: 'address', width: 28 },
          { header: 'Ciudad', accessorKey: 'cityName', width: 18 },
          { header: 'Estado credito', accessorKey: 'loanStatus', width: 16 },
          { header: 'Fecha credito', width: 18, getValue: (row) => formatDate(row.creditStartDate) },
          {
            header: 'Fecha 1er pago',
            width: 18,
            getValue: (row) => (row.firstCollectionDate ? formatDate(row.firstCollectionDate) : ''),
          },
          { header: 'Vencimiento', width: 18, getValue: (row) => formatDate(row.maturityDate) },
          {
            header: 'Proximo vencimiento',
            width: 20,
            getValue: (row) => (row.nextDueDate ? formatDate(row.nextDueDate) : ''),
          },
          { header: 'Dias mora', width: 14, getValue: (row) => String(row.daysPastDue) },
          { header: 'Cuotas', width: 12, getValue: (row) => String(row.installments) },
          { header: 'Valor cuota', width: 18, getValue: (row) => formatCurrency(row.installmentValue) },
          { header: 'Saldo vencido', width: 18, getValue: (row) => formatCurrency(row.overdueBalance) },
          { header: 'Saldo corriente', width: 18, getValue: (row) => formatCurrency(row.currentBalance) },
          { header: 'Saldo total', width: 18, getValue: (row) => formatCurrency(row.totalPortfolioAmount) },
          {
            header: 'Ultimo pago',
            width: 18,
            getValue: (row) => (row.lastPaymentDate ? formatDate(row.lastPaymentDate) : ''),
          },
          { header: 'Nota', accessorKey: 'note', width: 30 },
        ],
      },
      result.rows
    );
    toast.success('Excel generado correctamente');
  }, [result]);

  return (
    <>
      <PageHeader
        title="Reporte cartera de libranza por convenio"
        description="Genere reporte de cartera de libranza agrupada por convenio."
      />
      <PageContent>
        <Card>
          <CardHeader>
            <CardTitle>Parametros</CardTitle>
            <CardDescription>
              Seleccione el convenio y la fecha de corte para generar el reporte.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FieldGroup className="grid gap-4 md:grid-cols-[1.4fr_1fr_auto]">
                <Controller
                  name="agreementId"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="agreementId">Convenio</FieldLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value ? Number(value) : undefined)}
                        value={field.value ? String(field.value) : ''}
                        disabled={isLoadingAgreements}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              isLoadingAgreements ? 'Cargando convenios...' : 'Seleccione...'
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {agreements.map((item) => (
                            <SelectItem key={item.id} value={String(item.id)}>
                              {item.agreementCode} - {item.businessName}
                              {item.isActive ? '' : ' (Inactivo)'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  name="cutoffDate"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="cutoffDate">Fecha de corte</FieldLabel>
                      <DatePicker
                        id="cutoffDate"
                        value={field.value ?? null}
                        onChange={(value) => field.onChange(value ?? null)}
                        ariaInvalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Button type="submit" className="self-end" disabled={isGenerating}>
                  {isGenerating ? <Spinner /> : null}
                  Generar reporte
                </Button>
              </FieldGroup>
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
                <p className="text-muted-foreground text-xs">Reporte</p>
                <p className="font-medium">{result.reportType}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Convenio</p>
                <p className="font-medium">{result.agreementName}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Fecha corte</p>
                <p className="font-medium">{formatDate(result.cutoffDate)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Creditos revisados</p>
                <p className="font-medium">{result.reviewedCredits}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Creditos reportados</p>
                <p className="font-medium">{result.reportedCredits}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Registros excel</p>
                <p className="font-medium">{result.rows.length}</p>
              </div>
              <div className="md:col-span-5">
                <p className="text-muted-foreground text-xs">Mensaje</p>
                <p className="font-medium">{result.message}</p>
              </div>
              <div className="md:col-span-5">
                <Button type="button" variant="outline" onClick={onDownload}>
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
