'use client';

import { PageContent, PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  usePreviewBankNoveltyFile,
  useProcessBankNoveltyFile,
} from '@/hooks/queries/use-bank-file-queries';
import {
  PreviewBankNoveltyResult,
  ProcessBankNoveltyResult,
} from '@/schemas/bank-file';
import { detectDelimiter, parsePaymentAmount, parsePaymentDate, splitLine } from '@/utils/file-parsing';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { Upload } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

type ParsedNoveltyRow = {
  rowNumber: number;
  creditNumber: string;
  fileStatus: 'DISBURSED' | 'REJECTED';
  responseDate: string;
  amount: number | null;
  note: string | null;
  isValid: boolean;
  errorMessage: string | null;
};

type DateAdjustmentState = {
  enabled: boolean;
  newFirstCollectionDate: Date | null;
};

function normalizeStatus(raw: string): 'DISBURSED' | 'REJECTED' | null {
  const value = raw
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  if (['DESEMBOLSADO', 'DISBURSED', 'OK', 'APROBADO'].includes(value)) {
    return 'DISBURSED';
  }

  if (['RECHAZADO', 'REJECTED', 'DEVUELTO', 'ERROR', 'NEGADO'].includes(value)) {
    return 'REJECTED';
  }

  return null;
}

function isNoveltyHeaderLine(parts: string[]) {
  if (parts.length < 4) return false;

  const normalize = (value: string) =>
    value
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  return (
    normalize(parts[0]).includes('credito') &&
    normalize(parts[1]).includes('estado') &&
    normalize(parts[2]).includes('fecha') &&
    normalize(parts[3]).includes('valor')
  );
}

function parseBankNoveltyFile(fileContent: string): ParsedNoveltyRow[] {
  const lines = fileContent
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (!lines.length) return [];

  const delimiter = detectDelimiter(lines[0]);
  const rows: ParsedNoveltyRow[] = [];

  lines.forEach((line, index) => {
    const rawParts = splitLine(line, delimiter).map((part) => part.trim());

    if (index === 0 && isNoveltyHeaderLine(rawParts)) {
      return;
    }

    if (rawParts.length < 4) {
      rows.push({
        rowNumber: index + 1,
        creditNumber: rawParts[0] ?? '',
        fileStatus: 'DISBURSED',
        responseDate: '',
        amount: null,
        note: null,
        isValid: false,
        errorMessage: 'Fila inválida. Use 4 columnas: crédito, estado, fecha, valor, nota(opcional).',
      });
      return;
    }

    const [creditNumber, statusRaw, responseDateRaw, amountRaw, ...noteParts] = rawParts;
    const fileStatus = normalizeStatus(statusRaw);
    const responseDate = parsePaymentDate(responseDateRaw);
    const amount = amountRaw ? parsePaymentAmount(amountRaw) : null;
    const note = noteParts.join(' ').trim() || null;

    let errorMessage: string | null = null;
    if (!creditNumber) errorMessage = 'Número de crédito requerido.';
    if (!fileStatus) errorMessage = 'Estado inválido. Use DESEMBOLSADO o RECHAZADO.';
    if (!responseDate) errorMessage = 'Fecha inválida.';

    rows.push({
      rowNumber: index + 1,
      creditNumber,
      fileStatus: fileStatus ?? 'DISBURSED',
      responseDate: responseDate ?? '',
      amount,
      note,
      isValid: !errorMessage,
      errorMessage,
    });
  });

  return rows;
}

export function BankFileResponses() {
  const [noveltyFileName, setNoveltyFileName] = React.useState('');
  const [parsedNoveltyRows, setParsedNoveltyRows] = React.useState<ParsedNoveltyRow[]>([]);
  const [previewResult, setPreviewResult] = React.useState<PreviewBankNoveltyResult | null>(null);
  const [processResult, setProcessResult] = React.useState<ProcessBankNoveltyResult | null>(null);
  const [dateAdjustments, setDateAdjustments] = React.useState<Record<number, DateAdjustmentState>>(
    {}
  );

  const { mutateAsync: previewNoveltyFile, isPending: isPreviewing } = usePreviewBankNoveltyFile();
  const { mutateAsync: processNoveltyFile, isPending: isProcessingNovelty } =
    useProcessBankNoveltyFile();

  const validParsedNoveltyRows = React.useMemo(
    () => parsedNoveltyRows.filter((row) => row.isValid),
    [parsedNoveltyRows]
  );
  const invalidParsedNoveltyRows = React.useMemo(
    () => parsedNoveltyRows.filter((row) => !row.isValid),
    [parsedNoveltyRows]
  );

  const displayedRows = React.useMemo(() => {
    if (processResult) {
      return processResult.rows
        .map((row) => ({
          source: 'processed' as const,
          ...row,
          changeFirstCollectionDate: row.changedFirstCollectionDate,
          newFirstCollectionDate: row.newFirstCollectionDate,
        }))
        .sort((a, b) => a.rowNumber - b.rowNumber);
    }

    const previewRows =
      previewResult?.rows.map((row) => {
        const adjustment = dateAdjustments[row.rowNumber];
        return {
          source: 'preview' as const,
          ...row,
          changeFirstCollectionDate: adjustment?.enabled ?? false,
          newFirstCollectionDate: adjustment?.newFirstCollectionDate
            ? adjustment.newFirstCollectionDate.toISOString().slice(0, 10)
            : null,
          processed: false,
          processedAction: null,
        };
      }) ?? [];

    const invalidRows = invalidParsedNoveltyRows.map((row) => ({
      source: 'local-invalid' as const,
      rowNumber: row.rowNumber,
      creditNumber: row.creditNumber,
      loanId: null,
      thirdPartyName: null,
      amount: row.amount,
      fileStatus: row.fileStatus,
      responseDate: row.responseDate,
      note: row.note,
      currentLoanStatus: null,
      currentDisbursementStatus: null,
      currentFirstCollectionDate: null,
      matched: false,
      canProcess: false,
      requiresDateAdjustment: false,
      validationMessage: row.errorMessage,
      changeFirstCollectionDate: false,
      newFirstCollectionDate: null,
      processed: false,
      processedAction: null,
    }));

    return [...previewRows, ...invalidRows].sort((a, b) => a.rowNumber - b.rowNumber);
  }, [dateAdjustments, invalidParsedNoveltyRows, previewResult, processResult]);

  const summary = React.useMemo(() => {
    const rows = displayedRows;
    return {
      totalRecords: rows.length,
      totalAmount: rows.reduce((sum, row) => sum + (row.amount ?? 0), 0),
      disbursedRecords: rows.filter((row) => row.fileStatus === 'DISBURSED').length,
      rejectedRecords: rows.filter((row) => row.fileStatus === 'REJECTED').length,
      invalidRecords: rows.filter((row) => !row.canProcess).length,
      dateAdjustmentRecords: rows.filter((row) => row.changeFirstCollectionDate).length,
    };
  }, [displayedRows]);

  const handleNoveltyFileChange = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        const content = await file.text();
        const rows = parseBankNoveltyFile(content);

        if (!rows.length) {
          toast.error('El archivo no contiene filas para procesar.');
          setNoveltyFileName(file.name);
          setParsedNoveltyRows([]);
          setPreviewResult(null);
          setProcessResult(null);
          setDateAdjustments({});
          return;
        }

        setNoveltyFileName(file.name);
        setParsedNoveltyRows(rows);
        setPreviewResult(null);
        setProcessResult(null);
        setDateAdjustments({});
      } catch {
        toast.error('No fue posible leer el archivo seleccionado.');
      } finally {
        event.target.value = '';
      }
    },
    []
  );

  const handlePreview = React.useCallback(async () => {
    if (!noveltyFileName || !validParsedNoveltyRows.length) {
      toast.error('Debe cargar un archivo con al menos una fila válida.');
      return;
    }

    const response = await previewNoveltyFile({
      body: {
        fileName: noveltyFileName,
        records: validParsedNoveltyRows.map((row) => ({
          rowNumber: row.rowNumber,
          creditNumber: row.creditNumber,
          fileStatus: row.fileStatus,
          responseDate: row.responseDate,
          amount: row.amount,
          note: row.note,
        })),
      },
    });

    setPreviewResult(response.body);
    setProcessResult(null);
    setDateAdjustments({});

    if (invalidParsedNoveltyRows.length) {
      toast.warning('Se previsualizaron las filas válidas. Corrija las inválidas antes de procesar.');
      return;
    }

    toast.success('Archivo previsualizado');
  }, [invalidParsedNoveltyRows.length, noveltyFileName, previewNoveltyFile, validParsedNoveltyRows]);

  const handleToggleDateAdjustment = React.useCallback((rowNumber: number, enabled: boolean) => {
    setDateAdjustments((current) => ({
      ...current,
      [rowNumber]: {
        enabled,
        newFirstCollectionDate: enabled ? current[rowNumber]?.newFirstCollectionDate ?? null : null,
      },
    }));
  }, []);

  const handleChangeNewFirstCollectionDate = React.useCallback(
    (rowNumber: number, value: Date | null) => {
      setDateAdjustments((current) => ({
        ...current,
        [rowNumber]: {
          enabled: true,
          newFirstCollectionDate: value,
        },
      }));
    },
    []
  );

  const handleProcess = React.useCallback(async () => {
    if (!previewResult) {
      toast.error('Primero debe previsualizar el archivo.');
      return;
    }

    if (invalidParsedNoveltyRows.length || previewResult.summary.invalidRecords) {
      toast.error('Corrija las filas inválidas antes de procesar.');
      return;
    }

    const missingDates = previewResult.rows.filter((row) => {
      const adjustment = dateAdjustments[row.rowNumber];
      return adjustment?.enabled && !adjustment.newFirstCollectionDate;
    });

    if (missingDates.length) {
      toast.error('Debe seleccionar la nueva fecha de primer recaudo en todas las filas marcadas.');
      return;
    }

    const response = await processNoveltyFile({
      body: {
        fileName: previewResult.fileName,
        records: previewResult.rows.map((row) => {
          const adjustment = dateAdjustments[row.rowNumber];
          return {
            rowNumber: row.rowNumber,
            creditNumber: row.creditNumber,
            fileStatus: row.fileStatus,
            responseDate: row.responseDate,
            amount: row.amount,
            note: row.note,
            changeFirstCollectionDate: adjustment?.enabled ?? false,
            newFirstCollectionDate: adjustment?.newFirstCollectionDate
              ? adjustment.newFirstCollectionDate.toISOString().slice(0, 10)
              : null,
          };
        }),
      },
    });

    setProcessResult(response.body);
    toast.success('Respuesta del banco procesada');
  }, [dateAdjustments, invalidParsedNoveltyRows.length, previewResult, processNoveltyFile]);

  return (
    <>
      <PageHeader
        title="Cargar respuesta del banco"
        description="Cargue el archivo de respuesta del banco para confirmar desembolsos, rechazos y casos especiales con cambio de primer recaudo."
      />
      <PageContent>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Archivo de respuesta</CardTitle>
              <CardDescription>
                Estructura sugerida: crédito, estado, fecha, valor, nota(opcional). Estados válidos: DESEMBOLSADO o RECHAZADO.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-[1fr_auto_auto]">
                <Field>
                  <FieldLabel htmlFor="noveltyFile">Archivo TXT</FieldLabel>
                  <Input
                    id="noveltyFile"
                    type="file"
                    accept=".txt,.csv,.tsv"
                    onChange={handleNoveltyFileChange}
                  />
                </Field>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePreview}
                    disabled={!validParsedNoveltyRows.length || isPreviewing}
                  >
                    {isPreviewing ? <Spinner /> : <Upload />}
                    Previsualizar archivo
                  </Button>
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    onClick={handleProcess}
                    disabled={!previewResult || isProcessingNovelty || Boolean(invalidParsedNoveltyRows.length)}
                  >
                    {isProcessingNovelty ? <Spinner /> : null}
                    Procesar respuesta
                  </Button>
                </div>
              </div>

              {noveltyFileName ? (
                <div className="rounded-md border px-3 py-2 text-sm">
                  Archivo: <span className="font-medium">{noveltyFileName}</span> | Filas válidas:{' '}
                  <span className="font-medium">{validParsedNoveltyRows.length}</span> | Filas inválidas:{' '}
                  <span className="font-medium">{invalidParsedNoveltyRows.length}</span>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {displayedRows.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Resultado de carga</CardTitle>
                <CardDescription>
                  Revise los créditos encontrados, rechazados y los casos con cambio de primer recaudo antes de procesar.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-6">
                  <div className="rounded-md border px-3 py-2">
                    <p className="text-muted-foreground text-xs">Total registros</p>
                    <p className="font-medium">{summary.totalRecords}</p>
                  </div>
                  <div className="rounded-md border px-3 py-2">
                    <p className="text-muted-foreground text-xs">Valor total</p>
                    <p className="font-medium">{formatCurrency(summary.totalAmount)}</p>
                  </div>
                  <div className="rounded-md border px-3 py-2">
                    <p className="text-muted-foreground text-xs">Desembolsados</p>
                    <p className="font-medium">{summary.disbursedRecords}</p>
                  </div>
                  <div className="rounded-md border px-3 py-2">
                    <p className="text-muted-foreground text-xs">Rechazados</p>
                    <p className="font-medium">{summary.rejectedRecords}</p>
                  </div>
                  <div className="rounded-md border px-3 py-2">
                    <p className="text-muted-foreground text-xs">Cambio 1er recaudo</p>
                    <p className="font-medium">{summary.dateAdjustmentRecords}</p>
                  </div>
                  <div className="rounded-md border px-3 py-2">
                    <p className="text-muted-foreground text-xs">Inválidos</p>
                    <p className="font-medium">{summary.invalidRecords}</p>
                  </div>
                </div>

                {processResult ? (
                  <div className="rounded-md border px-3 py-2 text-sm">
                    <span className="font-medium">Resultado:</span> {processResult.message}
                  </div>
                ) : null}

                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fila</TableHead>
                        <TableHead>Crédito</TableHead>
                        <TableHead>Tercero</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Estado archivo</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Nota</TableHead>
                        <TableHead>Estado actual</TableHead>
                        <TableHead>1er recaudo actual</TableHead>
                        <TableHead>Cambiar 1er recaudo</TableHead>
                        <TableHead>Nueva fecha</TableHead>
                        <TableHead>Validación</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedRows.map((row) => {
                        const isRejected = row.fileStatus === 'REJECTED';
                        const rowClassName = row.canProcess
                          ? row.changeFirstCollectionDate
                            ? 'bg-amber-500/10'
                            : isRejected
                              ? 'bg-red-500/10'
                              : ''
                          : 'bg-red-500/15';

                        return (
                          <TableRow key={`${row.source}-${row.rowNumber}`} className={rowClassName}>
                            <TableCell>{row.rowNumber}</TableCell>
                            <TableCell className="font-medium">{row.creditNumber || '-'}</TableCell>
                            <TableCell>{row.thirdPartyName || '-'}</TableCell>
                            <TableCell>{row.amount !== null ? formatCurrency(row.amount) : '-'}</TableCell>
                            <TableCell>{row.fileStatus === 'DISBURSED' ? 'Desembolsado' : 'Rechazado'}</TableCell>
                            <TableCell>{row.responseDate ? formatDate(row.responseDate) : '-'}</TableCell>
                            <TableCell>{row.note || '-'}</TableCell>
                            <TableCell>
                              {row.currentLoanStatus && row.currentDisbursementStatus
                                ? `${row.currentLoanStatus} / ${row.currentDisbursementStatus}`
                                : '-'}
                            </TableCell>
                            <TableCell>
                              {row.currentFirstCollectionDate
                                ? formatDate(row.currentFirstCollectionDate)
                                : '-'}
                            </TableCell>
                            <TableCell>
                              {row.source === 'preview' && row.fileStatus === 'DISBURSED' ? (
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={row.changeFirstCollectionDate}
                                    onCheckedChange={(checked) =>
                                      handleToggleDateAdjustment(row.rowNumber, Boolean(checked))
                                    }
                                  />
                                  <span className="text-sm">Sí</span>
                                </div>
                              ) : row.changeFirstCollectionDate ? (
                                'Sí'
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell>
                              {row.source === 'preview' && row.fileStatus === 'DISBURSED' ? (
                                row.changeFirstCollectionDate ? (
                                  <DatePicker
                                    value={
                                      dateAdjustments[row.rowNumber]?.newFirstCollectionDate ?? null
                                    }
                                    onChange={(value) =>
                                      handleChangeNewFirstCollectionDate(row.rowNumber, value ?? null)
                                    }
                                  />
                                ) : (
                                  '-'
                                )
                              ) : row.newFirstCollectionDate ? (
                                formatDate(row.newFirstCollectionDate)
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell>{row.validationMessage || '-'}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </PageContent>
    </>
  );
}
