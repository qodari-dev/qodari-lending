'use client';

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
import { useGlAccounts } from '@/hooks/queries/use-gl-account-queries';
import { useProcessLoanPaymentFile } from '@/hooks/queries/use-loan-payment-file-queries';
import { useAvailableLoanPaymentReceiptTypes } from '@/hooks/queries/use-loan-payment-queries';
import { usePaymentTenderTypes } from '@/hooks/queries/use-payment-tender-type-queries';
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
  const [receiptTypeId, setReceiptTypeId] = React.useState<number | undefined>(undefined);
  const [glAccountId, setGlAccountId] = React.useState<number | undefined>(undefined);
  const [collectionMethodId, setCollectionMethodId] = React.useState<number | undefined>(undefined);

  const { data: receiptTypesData, isLoading: isLoadingReceiptTypes } =
    useAvailableLoanPaymentReceiptTypes();
  const { data: glAccountsData } = useGlAccounts({
    limit: 1000,
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'code', order: 'asc' }],
  });
  const { data: collectionMethodsData, isLoading: isLoadingCollectionMethods } = usePaymentTenderTypes({
    limit: 1000,
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'name', order: 'asc' }],
  });

  const receiptTypeOptions = React.useMemo(() => receiptTypesData?.body ?? [], [receiptTypesData]);
  const glAccountOptions = React.useMemo(() => {
    const fetched = glAccountsData?.body?.data ?? [];
    if (fetched.length) return fetched;

    const mapped = new Map<number, { id: number; code: string; name: string }>();
    receiptTypeOptions.forEach((item) => {
      if (!mapped.has(item.glAccountId)) {
        mapped.set(item.glAccountId, {
          id: item.glAccountId,
          code: String(item.glAccountId),
          name: item.glAccountName,
        });
      }
    });

    return [...mapped.values()];
  }, [glAccountsData, receiptTypeOptions]);
  const collectionMethodOptions = React.useMemo(
    () => collectionMethodsData?.body?.data ?? [],
    [collectionMethodsData]
  );

  React.useEffect(() => {
    if (!receiptTypeOptions.length || receiptTypeId) return;

    const defaultReceiptType = receiptTypeOptions[0];
    setReceiptTypeId(defaultReceiptType.paymentReceiptTypeId);
    setGlAccountId(defaultReceiptType.glAccountId);
  }, [receiptTypeId, receiptTypeOptions]);

  React.useEffect(() => {
    if (!collectionMethodOptions.length || collectionMethodId) return;
    setCollectionMethodId(collectionMethodOptions[0].id);
  }, [collectionMethodId, collectionMethodOptions]);

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

    if (invalidRows.length) {
      toast.error('El archivo tiene filas invalidas. Corrija antes de procesar.');
      return;
    }

    if (!receiptTypeId) {
      toast.error('Debe seleccionar tipo de recibo de pago');
      return;
    }

    if (!collectionMethodId) {
      toast.error('Debe seleccionar forma de pago');
      return;
    }

    const response = await processFile({
      body: {
        receiptTypeId,
        glAccountId,
        collectionMethodId,
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
    if (response.body.processed) {
      setFileName('');
      setParsedRows([]);
      toast.success('Archivo procesado correctamente');
      return;
    }

    toast.error(response.body.message);
  }, [
    collectionMethodId,
    fileName,
    glAccountId,
    invalidRows.length,
    processFile,
    receiptTypeId,
    validRows,
  ]);

  return (
    <>
      <PageHeader
        title="Abono por archivo plano"
        description="Cargue archivo con la estructura: Numero Credito - Cedula - Fecha Abono - Valor Abono."
      />
      <PageContent>
        <Card>
          <CardHeader>
            <CardTitle>Encabezado de procesamiento</CardTitle>
            <CardDescription>Defina tipo de pago, auxiliar y forma de recaudo.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup className="grid gap-4 md:grid-cols-3">
              <Field data-invalid={!receiptTypeId}>
                <FieldLabel htmlFor="receiptTypeId">Tipo de recibo de pago</FieldLabel>
                <Select
                  onValueChange={(value) => {
                    const nextId = value ? Number(value) : undefined;
                    setReceiptTypeId(nextId);

                    const selectedReceiptType = receiptTypeOptions.find(
                      (item) => item.paymentReceiptTypeId === nextId
                    );
                    if (selectedReceiptType) {
                      setGlAccountId(selectedReceiptType.glAccountId);
                    }
                  }}
                  value={receiptTypeId ? String(receiptTypeId) : ''}
                  disabled={isLoadingReceiptTypes}
                >
                  <SelectTrigger id="receiptTypeId">
                    <SelectValue placeholder="Seleccione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {receiptTypeOptions.map((item) => (
                      <SelectItem key={item.paymentReceiptTypeId} value={String(item.paymentReceiptTypeId)}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!receiptTypeId ? <FieldError errors={[{ message: 'Campo requerido' }]} /> : null}
              </Field>

              <Field>
                <FieldLabel htmlFor="glAccountId">Auxiliar contable</FieldLabel>
                <Select
                  onValueChange={(value) => setGlAccountId(value ? Number(value) : undefined)}
                  value={glAccountId ? String(glAccountId) : ''}
                >
                  <SelectTrigger id="glAccountId">
                    <SelectValue placeholder="Seleccione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {glAccountOptions.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.code} - {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field data-invalid={!collectionMethodId}>
                <FieldLabel htmlFor="collectionMethodId">Forma de pago</FieldLabel>
                <Select
                  onValueChange={(value) => setCollectionMethodId(value ? Number(value) : undefined)}
                  value={collectionMethodId ? String(collectionMethodId) : ''}
                  disabled={isLoadingCollectionMethods}
                >
                  <SelectTrigger id="collectionMethodId">
                    <SelectValue placeholder="Seleccione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {collectionMethodOptions.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!collectionMethodId ? <FieldError errors={[{ message: 'Campo requerido' }]} /> : null}
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

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
                Revise toda la informacion. Si una fila tiene error no se procesa ningun abono.
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
                <Button
                  type="button"
                  disabled={!validRows.length || Boolean(invalidRows.length) || isProcessing}
                  onClick={onProcessFile}
                >
                  {isProcessing ? <Spinner /> : null}
                  Procesar archivo
                </Button>
                {invalidRows.length ? (
                  <p className="text-muted-foreground text-xs">
                    Corrija {invalidRows.length} fila(s) con error para poder procesar.
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {processResponse ? (
          <Card>
            <CardHeader>
              <CardTitle>Resultado del procesamiento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                <div>
                  <p className="text-muted-foreground text-xs">Estado</p>
                  <p className={`font-medium ${processResponse.processed ? '' : 'text-destructive'}`}>
                    {processResponse.processed ? 'Procesado' : 'No procesado'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Registros recibidos</p>
                  <p className="font-medium">{processResponse.receivedRecords}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Registros procesados</p>
                  <p className="font-medium">{processResponse.processedRecords}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Valor total recibido</p>
                  <p className="font-medium">{formatCurrency(processResponse.totalPaymentAmount)}</p>
                </div>
                <div className="md:col-span-4">
                  <p className="text-muted-foreground text-xs">Mensaje</p>
                  <p className="font-medium">{processResponse.message}</p>
                </div>
              </div>

              {!processResponse.processed && processResponse.errors.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fila</TableHead>
                      <TableHead>Credito</TableHead>
                      <TableHead>Cedula</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processResponse.errors.map((error, index) => (
                      <TableRow key={`${error.rowNumber ?? 'global'}-${index}`}>
                        <TableCell>{error.rowNumber ?? '-'}</TableCell>
                        <TableCell>{error.creditNumber ?? '-'}</TableCell>
                        <TableCell>{error.documentNumber ?? '-'}</TableCell>
                        <TableCell className="text-destructive">{error.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </PageContent>
    </>
  );
}
