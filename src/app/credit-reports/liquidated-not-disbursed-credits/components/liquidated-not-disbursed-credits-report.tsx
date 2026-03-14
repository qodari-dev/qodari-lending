'use client';

import { exportToExcel } from '@/components/data-table/export/export-excel';
import { PageContent, PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useGenerateLiquidatedNotDisbursedCreditsReport } from '@/hooks/queries/use-credit-report-queries';
import {
  GenerateLiquidatedNotDisbursedCreditsReportBodySchema,
  GenerateLiquidatedNotDisbursedCreditsReportResult,
  LiquidatedNotDisbursedCreditsReportRow,
} from '@/schemas/credit-report';
import { formatCurrency } from '@/utils/formatters';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileDown } from 'lucide-react';
import React from 'react';
import { type Resolver, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const FormSchema = GenerateLiquidatedNotDisbursedCreditsReportBodySchema;
type FormValues = z.infer<typeof FormSchema>;

export function LiquidatedNotDisbursedCreditsReport() {
  const [result, setResult] =
    React.useState<GenerateLiquidatedNotDisbursedCreditsReportResult | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema) as Resolver<FormValues>,
    defaultValues: {},
  });

  const { mutateAsync: generateReport, isPending: isGenerating } =
    useGenerateLiquidatedNotDisbursedCreditsReport();

  const onSubmit = async (values: FormValues) => {
    const response = await generateReport({ body: values });
    setResult(response.body);
    toast.success('Reporte generado');
  };

  const onDownload = React.useCallback(async () => {
    if (!result) return;
    await exportToExcel<LiquidatedNotDisbursedCreditsReportRow>(
      {
        title: 'Reporte de creditos liquidados no desembolsados',
        filename: 'creditos-liquidados-no-desembolsados',
        columns: [
          { header: '# Credito', accessorKey: 'creditNumber', width: 18 },
          { header: 'Solicitud', accessorKey: 'requestNumber', width: 18 },
          { header: 'Documento', accessorKey: 'thirdPartyDocumentNumber', width: 18 },
          { header: 'Tercero', accessorKey: 'thirdPartyName', width: 28 },
          { header: 'Linea credito', accessorKey: 'creditProductName', width: 24 },
          { header: 'Oficina', accessorKey: 'affiliationOfficeName', width: 24 },
          { header: 'Fecha solicitud', accessorKey: 'applicationDate', width: 18 },
          { header: 'Fecha liquidacion', accessorKey: 'liquidatedDate', width: 18 },
          { header: 'Estado credito', accessorKey: 'status', width: 18 },
          { header: 'Estado desembolso', accessorKey: 'disbursementStatus', width: 24 },
          {
            header: 'Valor solicitado',
            width: 18,
            getValue: (row) => formatCurrency(row.requestedAmount),
          },
          {
            header: 'Valor aprobado',
            width: 18,
            getValue: (row) => formatCurrency(row.approvedAmount),
          },
          {
            header: 'Valor desembolso',
            width: 18,
            getValue: (row) => formatCurrency(row.disbursementAmount),
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
        title="Creditos liquidados no desembolsados"
        description="Genere Excel con creditos ya liquidados que aun no han sido desembolsados."
      />
      <PageContent>
        <Card>
          <CardHeader>
            <CardTitle>Generacion</CardTitle>
            <CardDescription>
              No requiere filtros. Se listan todos los creditos liquidados pendientes de desembolso.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <Button type="submit" disabled={isGenerating}>
                {isGenerating ? <Spinner /> : null}
                Generar reporte
              </Button>
            </form>
          </CardContent>
        </Card>

        {result ? (
          <Card>
            <CardHeader>
              <CardTitle>Resultado</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              <div>
                <p className="text-muted-foreground text-xs">Creditos revisados</p>
                <p className="font-medium">{result.reviewedCredits}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Creditos reportados</p>
                <p className="font-medium">{result.reportedCredits}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Registros</p>
                <p className="font-medium">{result.rows.length}</p>
              </div>
              <div className="md:col-span-4">
                <p className="text-muted-foreground text-xs">Mensaje</p>
                <p className="font-medium">{result.message}</p>
              </div>
              <div className="md:col-span-4">
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
