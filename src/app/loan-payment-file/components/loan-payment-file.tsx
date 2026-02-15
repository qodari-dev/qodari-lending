'use client';

import { PageContent, PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useProcessLoanPaymentFile } from '@/hooks/queries/use-loan-payment-file-queries';
import { ProcessLoanPaymentFileResult } from '@/schemas/loan-payment-file';
import { formatCurrency, formatDate } from '@/utils/formatters';
import React from 'react';
import { toast } from 'sonner';

type ParsedRow = {
  rowNumber: number;
  creditNumber: string;
  documentNumber: string;
  paymentDate: string;
  paymentAmount: number;
  isValid: boolean;
  errorMessage: string | null;
};

function detectDelimiter(firstLine: string): ';' | ',' | '\t' | ' - ' {
  if (firstLine.includes(';')) return ';';
  if (firstLine.includes('\t')) return '\t';
  if (firstLine.includes(',')) return ',';
  return ' - ';
}

function splitLine(line: string, delimiter: ';' | ',' | '\t' | ' - ') {
  if (delimiter === ' - ') {
    return line.split(/\s+-\s+/g);
  }
  return line.split(delimiter);
}

function isHeaderLine(parts: string[]) {
  if (parts.length < 4) return false;

  const normalize = (value: string) => value.trim().toLowerCase();
  const col1 = normalize(parts[0]);
  const col2 = normalize(parts[1]);
  const col3 = normalize(parts[2]);
  const col4 = normalize(parts[3]);

  return (
    col1.includes('credito') &&
    (col2.includes('cedula') || col2.includes('documento')) &&
    col3.includes('fecha') &&
    col4.includes('valor')
  );
}

function parsePaymentDate(input: string): string | null {
  const value = input.trim();
  let yyyy = '';
  let mm = '';
  let dd = '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    [yyyy, mm, dd] = value.split('-');
  } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    [dd, mm, yyyy] = value.split('/');
  } else if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
    [dd, mm, yyyy] = value.split('-');
  } else {
    return null;
  }

  const asNumberYear = Number(yyyy);
  const asNumberMonth = Number(mm);
  const asNumberDay = Number(dd);
  const date = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== asNumberYear ||
    date.getMonth() + 1 !== asNumberMonth ||
    date.getDate() !== asNumberDay
  ) {
    return null;
  }

  return `${yyyy}-${mm}-${dd}`;
}

function parsePaymentAmount(input: string): number | null {
  const raw = input.trim().replace(/[^\d,.-]/g, '');
  if (!raw) return null;

  let normalized = raw;
  const lastComma = normalized.lastIndexOf(',');
  const lastDot = normalized.lastIndexOf('.');

  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = normalized.replace(/,/g, '');
    }
  } else if (lastComma !== -1) {
    normalized = normalized.replace(',', '.');
  }

  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

function parseFileContent(fileContent: string): ParsedRow[] {
  const lines = fileContent
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (!lines.length) return [];

  const delimiter = detectDelimiter(lines[0]);
  const rows: ParsedRow[] = [];

  lines.forEach((line, index) => {
    const rawParts = splitLine(line, delimiter).map((part) => part.trim());

    if (index === 0 && isHeaderLine(rawParts)) {
      return;
    }

    const parts = rawParts.slice(0, 4);
    if (parts.length < 4) {
      rows.push({
        rowNumber: index + 1,
        creditNumber: parts[0] ?? '',
        documentNumber: parts[1] ?? '',
        paymentDate: parts[2] ?? '',
        paymentAmount: 0,
        isValid: false,
        errorMessage: 'Fila invalida. Debe contener 4 columnas.',
      });
      return;
    }

    const [creditNumber, documentNumber, paymentDateRaw, paymentAmountRaw] = parts;
    const parsedDate = parsePaymentDate(paymentDateRaw);
    const parsedAmount = parsePaymentAmount(paymentAmountRaw);

    let errorMessage: string | null = null;
    if (!creditNumber) errorMessage = 'Numero de credito requerido';
    if (!documentNumber) errorMessage = 'Cedula requerida';
    if (!parsedDate) errorMessage = 'Fecha invalida (use yyyy-mm-dd o dd/mm/yyyy)';
    if (!parsedAmount) errorMessage = 'Valor abono invalido';

    rows.push({
      rowNumber: index + 1,
      creditNumber,
      documentNumber,
      paymentDate: parsedDate ?? '',
      paymentAmount: parsedAmount ?? 0,
      isValid: !errorMessage,
      errorMessage,
    });
  });

  return rows;
}

export function LoanPaymentFile() {
  const [fileName, setFileName] = React.useState('');
  const [parsedRows, setParsedRows] = React.useState<ParsedRow[]>([]);
  const [processResponse, setProcessResponse] = React.useState<ProcessLoanPaymentFileResult | null>(null);

  const validRows = React.useMemo(() => parsedRows.filter((row) => row.isValid), [parsedRows]);
  const invalidRows = React.useMemo(() => parsedRows.filter((row) => !row.isValid), [parsedRows]);

  const totalPaymentAmount = React.useMemo(
    () => validRows.reduce((acc, row) => acc + row.paymentAmount, 0),
    [validRows]
  );

  const { mutateAsync: processFile, isPending: isProcessing } = useProcessLoanPaymentFile();

  const onFileChange = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        const content = await file.text();
        const rows = parseFileContent(content);

        if (!rows.length) {
          toast.error('El archivo no contiene filas validas para procesar');
          setFileName(file.name);
          setParsedRows([]);
          setProcessResponse(null);
          return;
        }

        setFileName(file.name);
        setParsedRows(rows);
        setProcessResponse(null);
      } catch {
        toast.error('No fue posible leer el archivo seleccionado');
      } finally {
        event.target.value = '';
      }
    },
    []
  );

  const onProcessFile = React.useCallback(async () => {
    if (!fileName || !validRows.length) {
      toast.error('Debe cargar un archivo con registros validos');
      return;
    }

    const response = await processFile({
      body: {
        fileName,
        records: validRows.map((row) => ({
          rowNumber: row.rowNumber,
          creditNumber: row.creditNumber,
          documentNumber: row.documentNumber,
          paymentDate: row.paymentDate,
          paymentAmount: row.paymentAmount,
        })),
      },
    });

    setProcessResponse(response.body);
    toast.success('Archivo enviado al backend');
  }, [fileName, processFile, validRows]);

  return (
    <>
      <PageHeader
        title="Abono por archivo plano"
        description="Cargue archivo con la estructura: Numero Credito - Cedula - Fecha Abono - Valor Abono."
      />
      <PageContent>
        <Card>
          <CardHeader>
            <CardTitle>Archivo</CardTitle>
            <CardDescription>
              Formato esperado: Numero Credito - Cedula - Fecha Abono - Valor Abono
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="file"
              accept=".txt,.csv,text/plain"
              onChange={onFileChange}
            />
            <p className="text-muted-foreground text-xs">
              Fechas soportadas: <code>yyyy-mm-dd</code> o <code>dd/mm/yyyy</code>.
            </p>
          </CardContent>
        </Card>

        {parsedRows.length ? (
          <Card>
            <CardHeader>
              <CardTitle>Resumen</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              <div>
                <p className="text-muted-foreground text-xs">Archivo</p>
                <p className="font-medium">{fileName}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Numero de registros</p>
                <p className="font-medium">{parsedRows.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Registros validos</p>
                <p className="font-medium">{validRows.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Total valor abono</p>
                <p className="font-medium">{formatCurrency(totalPaymentAmount)}</p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {parsedRows.length ? (
          <Card>
            <CardHeader>
              <CardTitle>Detalle del archivo</CardTitle>
              <CardDescription>
                Revise la informacion antes de procesar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Numero Credito</TableHead>
                    <TableHead>Cedula</TableHead>
                    <TableHead>Fecha Abono</TableHead>
                    <TableHead>Valor Abono</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.map((row) => (
                    <TableRow key={`${row.rowNumber}-${row.creditNumber}-${row.documentNumber}`}>
                      <TableCell>{row.rowNumber}</TableCell>
                      <TableCell>{row.creditNumber}</TableCell>
                      <TableCell>{row.documentNumber}</TableCell>
                      <TableCell>{row.paymentDate ? formatDate(row.paymentDate) : '-'}</TableCell>
                      <TableCell>{row.isValid ? formatCurrency(row.paymentAmount) : '-'}</TableCell>
                      <TableCell>
                        {row.isValid ? 'Valido' : row.errorMessage}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" disabled={!validRows.length || isProcessing} onClick={onProcessFile}>
                  {isProcessing ? <Spinner /> : null}
                  Procesar archivo
                </Button>
                {invalidRows.length ? (
                  <p className="text-muted-foreground text-xs">
                    {invalidRows.length} registro(s) no se enviaran por errores de formato.
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {processResponse ? (
          <Card>
            <CardHeader>
              <CardTitle>Respuesta del backend</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <div>
                <p className="text-muted-foreground text-xs">Registros recibidos</p>
                <p className="font-medium">{processResponse.receivedRecords}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Valor total recibido</p>
                <p className="font-medium">{formatCurrency(processResponse.totalPaymentAmount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Mensaje</p>
                <p className="font-medium">{processResponse.message}</p>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </PageContent>
    </>
  );
}
