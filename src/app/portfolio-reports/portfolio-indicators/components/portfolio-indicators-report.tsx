'use client';

import ExcelJS from 'exceljs';
import { triggerDownload } from '@/components/data-table/export/download';
import { PageContent, PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { useAffiliationOffices } from '@/hooks/queries/use-affiliation-office-queries';
import { useCreditProducts } from '@/hooks/queries/use-credit-product-queries';
import { useGeneratePortfolioIndicatorsReport } from '@/hooks/queries/use-portfolio-report-queries';
import { GeneratePortfolioIndicatorsBodySchema, GeneratePortfolioIndicatorsReportResult } from '@/schemas/portfolio-report';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileDown } from 'lucide-react';
import React from 'react';
import { Controller, type Resolver, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const FormSchema = GeneratePortfolioIndicatorsBodySchema;
type FormValues = z.infer<typeof FormSchema>;

function addWorksheetTitle(worksheet: ExcelJS.Worksheet, title: string, columnsLength: number) {
  worksheet.mergeCells(1, 1, 1, columnsLength);
  const titleCell = worksheet.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { bold: true, size: 14 };
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = { bold: true };
  row.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF3F4F6' },
  };
}

export function PortfolioIndicatorsReport() {
  const [result, setResult] = React.useState<GeneratePortfolioIndicatorsReportResult | null>(null);
  const today = React.useMemo(() => new Date(), []);
  const { data: creditProductsData, isLoading: isLoadingCreditProducts } = useCreditProducts({
    limit: 1000,
    include: [],
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'name', order: 'asc' }],
  });
  const { data: officesData, isLoading: isLoadingOffices } = useAffiliationOffices({
    limit: 1000,
    include: [],
    sort: [{ field: 'name', order: 'asc' }],
  });
  const creditProducts = React.useMemo(() => creditProductsData?.body.data ?? [], [creditProductsData]);
  const offices = React.useMemo(() => officesData?.body.data ?? [], [officesData]);

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema) as Resolver<FormValues>,
    defaultValues: { startDate: today, endDate: today, creditProductId: undefined, affiliationOfficeId: undefined },
  });

  const { mutateAsync: generateReport, isPending: isGenerating } =
    useGeneratePortfolioIndicatorsReport();

  const onSubmit = async (values: FormValues) => {
    const response = await generateReport({ body: values });
    setResult(response.body);
    toast.success('Indicadores generados');
  };

  const onDownload = React.useCallback(async () => {
    if (!result) return;

    const workbook = new ExcelJS.Workbook();

    const opportunitySheet = workbook.addWorksheet('Oportunidad');
    opportunitySheet.columns = [
      { header: 'Oficina', key: 'officeName', width: 24 },
      { header: 'Linea de credito', key: 'creditProductName', width: 24 },
      { header: 'Aprobados', key: 'approvedCount', width: 14 },
      { header: 'Promedio dias', key: 'averageApprovalDays', width: 16 },
      { header: 'Maximo dias', key: 'maxApprovalDays', width: 14 },
    ];
    addWorksheetTitle(opportunitySheet, 'Indicador de oportunidad del servicio', 5);
    styleHeaderRow(opportunitySheet.getRow(3));
    result.opportunityRows.forEach((row) => opportunitySheet.addRow(row));

    const collectionGeneralSheet = workbook.addWorksheet('Recaudo General');
    collectionGeneralSheet.columns = [
      { header: 'Linea de credito', key: 'creditProductName', width: 24 },
      { header: 'Vr a recaudar', key: 'scheduledAmount', width: 18 },
      { header: 'Vr recaudado', key: 'collectedAmount', width: 18 },
      { header: 'Porcentaje', key: 'collectionRate', width: 14 },
    ];
    addWorksheetTitle(collectionGeneralSheet, 'Indicador efectividad del recaudo general', 4);
    styleHeaderRow(collectionGeneralSheet.getRow(3));
    result.collectionGeneralRows.forEach((row) =>
      collectionGeneralSheet.addRow({
        ...row,
        scheduledAmount: formatCurrency(row.scheduledAmount),
        collectedAmount: formatCurrency(row.collectedAmount),
        collectionRate: `${row.collectionRate.toFixed(2)}%`,
      })
    );

    const collectionOfficeSheet = workbook.addWorksheet('Recaudo por Oficina');
    collectionOfficeSheet.columns = [
      { header: 'Oficina', key: 'officeName', width: 24 },
      { header: 'Linea de credito', key: 'creditProductName', width: 24 },
      { header: 'Vr a recaudar', key: 'scheduledAmount', width: 18 },
      { header: 'Vr recaudado', key: 'collectedAmount', width: 18 },
      { header: 'Porcentaje', key: 'collectionRate', width: 14 },
    ];
    addWorksheetTitle(collectionOfficeSheet, 'Indicador efectividad del recaudo por oficina', 5);
    styleHeaderRow(collectionOfficeSheet.getRow(3));
    result.collectionByOfficeRows.forEach((row) =>
      collectionOfficeSheet.addRow({
        ...row,
        scheduledAmount: formatCurrency(row.scheduledAmount),
        collectedAmount: formatCurrency(row.collectedAmount),
        collectionRate: `${row.collectionRate.toFixed(2)}%`,
      })
    );

    const approvedSheet = workbook.addWorksheet('Aprobados');
    approvedSheet.columns = [
      { header: 'Linea de credito', key: 'creditProductName', width: 24 },
      { header: 'Aprobados periodo', key: 'approvedCountPeriod', width: 18 },
      { header: 'Valor aprobado periodo', key: 'approvedAmountPeriod', width: 20 },
      { header: 'Aprobados acumulado', key: 'approvedCountYearToDate', width: 20 },
      { header: 'Valor aprobado acumulado', key: 'approvedAmountYearToDate', width: 22 },
    ];
    addWorksheetTitle(approvedSheet, 'Creditos aprobados del periodo y acumulado', 5);
    styleHeaderRow(approvedSheet.getRow(3));
    result.approvedRows.forEach((row) =>
      approvedSheet.addRow({
        ...row,
        approvedAmountPeriod: formatCurrency(row.approvedAmountPeriod),
        approvedAmountYearToDate: formatCurrency(row.approvedAmountYearToDate),
      })
    );

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    triggerDownload(blob, `indicadores-cartera-${result.startDate}-${result.endDate}.xlsx`);
    toast.success('Excel generado correctamente');
  }, [result]);

  return (
    <>
      <PageHeader
        title="Indicadores de cartera"
        description="Genere indicadores operativos y de recaudo por rango de fechas."
      />
      <PageContent>
        <Card>
          <CardHeader>
            <CardTitle>Parametros</CardTitle>
            <CardDescription>
              Seleccione el rango de fechas y los filtros opcionales para generar el reporte.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FieldGroup className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1.2fr_1.2fr_auto]">
                <Controller
                  name="startDate"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="startDate">Fecha inicial</FieldLabel>
                      <DatePicker
                        id="startDate"
                        value={field.value ?? null}
                        onChange={(value) => field.onChange(value ?? null)}
                        ariaInvalid={fieldState.invalid}
                      />
                      {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                    </Field>
                  )}
                />

                <Controller
                  name="endDate"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="endDate">Fecha final</FieldLabel>
                      <DatePicker
                        id="endDate"
                        value={field.value ?? null}
                        onChange={(value) => field.onChange(value ?? null)}
                        ariaInvalid={fieldState.invalid}
                      />
                      {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                    </Field>
                  )}
                />

                <Controller
                  name="creditProductId"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="creditProductId">Linea de credito (opcional)</FieldLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value === '__all__' ? undefined : Number(value))}
                        value={field.value ? String(field.value) : '__all__'}
                        disabled={isLoadingCreditProducts}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">Todas</SelectItem>
                          {creditProducts.map((item) => (
                            <SelectItem key={item.id} value={String(item.id)}>
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                    </Field>
                  )}
                />

                <Controller
                  name="affiliationOfficeId"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="affiliationOfficeId">Oficina (opcional)</FieldLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value === '__all__' ? undefined : Number(value))}
                        value={field.value ? String(field.value) : '__all__'}
                        disabled={isLoadingOffices}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">Todas</SelectItem>
                          {offices.map((item) => (
                            <SelectItem key={item.id} value={String(item.id)}>
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                    </Field>
                  )}
                />

                <Button type="submit" className="self-end" disabled={isGenerating}>
                  {isGenerating ? <Spinner /> : null}
                  Generar indicadores
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
            <CardContent className="grid gap-3 md:grid-cols-6">
              <div>
                <p className="text-muted-foreground text-xs">Reporte</p>
                <p className="font-medium">{result.reportType}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Fecha inicial</p>
                <p className="font-medium">{formatDate(result.startDate)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Fecha final</p>
                <p className="font-medium">{formatDate(result.endDate)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Linea</p>
                <p className="font-medium">{result.creditProductName ?? 'Todas'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Oficina</p>
                <p className="font-medium">{result.affiliationOfficeName ?? 'Todas'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Hojas Excel</p>
                <p className="font-medium">4</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Oportunidad</p>
                <p className="font-medium">{result.opportunityRows.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Recaudo general</p>
                <p className="font-medium">{result.collectionGeneralRows.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Recaudo oficina</p>
                <p className="font-medium">{result.collectionByOfficeRows.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Aprobados</p>
                <p className="font-medium">{result.approvedRows.length}</p>
              </div>
              <div className="md:col-span-6">
                <p className="text-muted-foreground text-xs">Mensaje</p>
                <p className="font-medium">{result.message}</p>
              </div>
              <div className="md:col-span-6">
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
