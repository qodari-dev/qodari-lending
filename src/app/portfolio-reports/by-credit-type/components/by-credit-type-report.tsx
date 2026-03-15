'use client';

import { exportToExcel } from '@/components/data-table/export/export-excel';
import { PageContent, PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { useCreditProducts } from '@/hooks/queries/use-credit-product-queries';
import { useGeneratePortfolioByCreditTypeReport } from '@/hooks/queries/use-portfolio-report-queries';
import {
  GeneratePortfolioByCreditTypeBodySchema,
  GeneratePortfolioByCreditTypeReportResult,
  PortfolioByCreditTypeReportRow,
} from '@/schemas/portfolio-report';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileDown } from 'lucide-react';
import React from 'react';
import { Controller, type Resolver, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const FormSchema = GeneratePortfolioByCreditTypeBodySchema;
type FormValues = z.infer<typeof FormSchema>;

export function ByCreditTypeReport() {
  const [result, setResult] = React.useState<GeneratePortfolioByCreditTypeReportResult | null>(null);
  const { data: creditProductsData, isLoading: isLoadingCreditProducts } = useCreditProducts({
    limit: 1000,
    include: [],
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'name', order: 'asc' }],
  });
  const creditProducts = React.useMemo(
    () => creditProductsData?.body.data ?? [],
    [creditProductsData]
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema) as Resolver<FormValues>,
    defaultValues: { creditProductId: undefined },
  });

  const { mutateAsync: generateReport, isPending: isGenerating } =
    useGeneratePortfolioByCreditTypeReport();

  const onSubmit = async (values: FormValues) => {
    const response = await generateReport({ body: values });
    setResult(response.body);
    toast.success('Reporte generado');
  };

  const onDownload = React.useCallback(async () => {
    if (!result) return;
    await exportToExcel<PortfolioByCreditTypeReportRow>(
      {
        title: 'Reporte cartera por tipo de credito',
        filename: `cartera-por-tipo-de-credito-${result.cutoffDate}`,
        columns: [
          { header: 'Item', width: 10, getValue: (row) => String(row.item) },
          { header: 'Linea de credito', width: 24, getValue: () => result.creditProductName },
          { header: 'Documento', accessorKey: 'thirdPartyDocumentNumber', width: 18 },
          { header: 'Tercero', accessorKey: 'thirdPartyName', width: 32 },
          { header: '# Credito', accessorKey: 'creditNumber', width: 18 },
          { header: 'Valor', width: 18, getValue: (row) => formatCurrency(row.creditValue) },
          { header: 'Abonos', width: 18, getValue: (row) => formatCurrency(row.paidAmount) },
          { header: 'Saldo', width: 18, getValue: (row) => formatCurrency(row.outstandingBalance) },
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
        title="Reporte cartera por tipo de credito"
        description="Genere reporte básico de cartera por línea de crédito."
      />
      <PageContent>
        <Card>
          <CardHeader>
            <CardTitle>Parametros</CardTitle>
            <CardDescription>Seleccione la línea de crédito para generar el reporte.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FieldGroup className="grid gap-4 md:grid-cols-[1fr_auto]">
                <Controller
                  name="creditProductId"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="creditProductId">Linea de credito</FieldLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value ? Number(value) : undefined)}
                        value={field.value ? String(field.value) : ''}
                        disabled={isLoadingCreditProducts}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              isLoadingCreditProducts ? 'Cargando lineas...' : 'Seleccione...'
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {creditProducts.map((item) => (
                            <SelectItem key={item.id} value={String(item.id)}>
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                <p className="text-muted-foreground text-xs">Linea de credito</p>
                <p className="font-medium">{result.creditProductName}</p>
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
