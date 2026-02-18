'use client';

import { api } from '@/clients/api';
import { PageContent, PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
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
import { useAgreements } from '@/hooks/queries/use-agreement-queries';
import { useGlAccounts } from '@/hooks/queries/use-gl-account-queries';
import { useAvailableLoanPaymentReceiptTypes } from '@/hooks/queries/use-loan-payment-queries';
import { useProcessLoanPaymentPayroll } from '@/hooks/queries/use-loan-payment-payroll-queries';
import { usePaymentTenderTypes } from '@/hooks/queries/use-payment-tender-type-queries';
import { Loan, LoanBalanceSummaryResponse } from '@/schemas/loan';
import { ProcessLoanPaymentPayrollResult } from '@/schemas/loan-payment-payroll';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { getThirdPartyLabel } from '@/utils/third-party';
import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import { Controller, type Resolver, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

type PayrollLoanRow = {
  loanId: number;
  creditNumber: string;
  borrowerName: string;
  balance: number;
  paymentAmount: number;
  overpaidAmount: number;
};

type ImportedFileInfo = {
  matchedCount: number;
  missingCreditNumbers: string[];
};

const FormSchema = z.object({
  agreementId: z.number().int().positive().nullable().optional(),
  companyDocumentNumber: z.string().trim().max(15).nullable().optional(),
  receiptTypeId: z.number().int().positive(),
  glAccountId: z.number().int().positive().optional(),
  collectionMethodId: z.number().int().positive(),
  collectionDate: z.coerce.date(),
  referenceNumber: z.string().trim().min(1).max(7),
  collectionAmount: z.number().positive(),
}).superRefine((value, ctx) => {
  const hasAgreement = Boolean(value.agreementId);
  const hasCompanyDocument = Boolean(value.companyDocumentNumber?.trim());

  if (!hasAgreement && !hasCompanyDocument) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['agreementId'],
      message: 'Debe indicar convenio o documento de empresa',
    });
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['companyDocumentNumber'],
      message: 'Debe indicar convenio o documento de empresa',
    });
  }
});

type FormValues = z.infer<typeof FormSchema>;

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

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

function parseAmount(input: string): number | null {
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

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return round2(parsed);
}

function parseBasicFile(content: string) {
  const lines = content
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return new Map<string, number>();

  const delimiter = detectDelimiter(lines[0]);
  const result = new Map<string, number>();

  lines.forEach((line, index) => {
    const raw = splitLine(line, delimiter).map((item) => item.trim());
    if (!raw.length) return;

    if (index === 0 && raw.length >= 2) {
      const col1 = raw[0]?.toLowerCase() ?? '';
      const col2 = raw[1]?.toLowerCase() ?? '';
      const isHeader = col1.includes('credito') && col2.includes('valor');
      if (isHeader) return;
    }

    const creditNumber = (raw[0] ?? '').trim().toUpperCase();
    const amount = parseAmount(raw[1] ?? '');
    if (!creditNumber || amount === null) return;

    const current = result.get(creditNumber) ?? 0;
    result.set(creditNumber, round2(current + amount));
  });

  return result;
}

function distributeByBalance(totalAmount: number, balance: number) {
  const amount = Math.max(0, totalAmount);
  if (amount > balance) {
    return {
      paymentAmount: round2(balance),
      overpaidAmount: round2(amount - balance),
    };
  }
  return {
    paymentAmount: round2(amount),
    overpaidAmount: 0,
  };
}

function normalizeDocumentNumber(input: string) {
  return input.trim().replace(/[^\dA-Za-z]/g, '').toUpperCase();
}

export function LoanPaymentPayroll() {
  const [rows, setRows] = React.useState<PayrollLoanRow[]>([]);
  const [isLoadingLoans, setIsLoadingLoans] = React.useState(false);
  const [fileName, setFileName] = React.useState('');
  const [fileInfo, setFileInfo] = React.useState<ImportedFileInfo | null>(null);
  const [processResponse, setProcessResponse] = React.useState<ProcessLoanPaymentPayrollResult | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema) as Resolver<FormValues>,
    defaultValues: {
      agreementId: undefined,
      companyDocumentNumber: '',
      receiptTypeId: undefined,
      glAccountId: undefined,
      collectionMethodId: undefined,
      collectionDate: new Date(),
      referenceNumber: '',
      collectionAmount: 0,
    },
  });

  const collectionAmount = useWatch({
    control: form.control,
    name: 'collectionAmount',
  });

  const { data: agreementsData, isLoading: isLoadingAgreements } = useAgreements({
    limit: 1000,
    where: { and: [{ isActive: true }] },
    sort: [{ field: 'businessName', order: 'asc' }],
  });

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

  const agreements = React.useMemo(() => agreementsData?.body.data ?? [], [agreementsData]);
  const receiptTypeOptions = React.useMemo(() => {
    const options = receiptTypesData?.body ?? [];
    const payroll = options.filter((item) => item.movementType === 'PAYROLL');
    return payroll.length ? payroll : options;
  }, [receiptTypesData]);
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
    if (!receiptTypeOptions.length) return;
    const currentReceiptTypeId = form.getValues('receiptTypeId');
    if (currentReceiptTypeId) return;

    const defaultReceiptType = receiptTypeOptions[0];
    form.setValue('receiptTypeId', defaultReceiptType.paymentReceiptTypeId);
    form.setValue('glAccountId', defaultReceiptType.glAccountId);
  }, [form, receiptTypeOptions]);

  React.useEffect(() => {
    if (!collectionMethodOptions.length) return;
    const currentCollectionMethodId = form.getValues('collectionMethodId');
    if (currentCollectionMethodId) return;

    form.setValue('collectionMethodId', collectionMethodOptions[0].id);
  }, [form, collectionMethodOptions]);

  const rowsToProcess = React.useMemo(
    () => rows.filter((row) => row.paymentAmount > 0 || row.overpaidAmount > 0),
    [rows]
  );

  const totals = React.useMemo(() => {
    const totalPaymentAmount = rowsToProcess.reduce((acc, row) => acc + row.paymentAmount, 0);
    const totalOverpaidAmount = rowsToProcess.reduce((acc, row) => acc + row.overpaidAmount, 0);
    const totalAssigned = round2(totalPaymentAmount + totalOverpaidAmount);
    const difference = round2((collectionAmount ?? 0) - totalAssigned);

    return {
      totalPaymentAmount: round2(totalPaymentAmount),
      totalOverpaidAmount: round2(totalOverpaidAmount),
      totalAssigned,
      difference,
      creditCount: rowsToProcess.length,
    };
  }, [collectionAmount, rowsToProcess]);

  const handleConsultLoans = React.useCallback(async () => {
    const valid = await form.trigger([
      'agreementId',
      'companyDocumentNumber',
      'receiptTypeId',
      'collectionDate',
      'referenceNumber',
      'collectionAmount',
    ]);
    if (!valid) return;

    const values = form.getValues();
    const normalizedCompanyDocument = normalizeDocumentNumber(values.companyDocumentNumber ?? '');

    try {
      setIsLoadingLoans(true);
      setProcessResponse(null);

      const queryLimit = values.agreementId ? 500 : 2000;
      const loansResponse = await api.loan.list.query({
        query: {
          page: 1,
          limit: queryLimit,
          include: ['borrower'],
          sort: [{ field: 'creditStartDate', order: 'desc' }],
          where: {
            and: [
              ...(values.agreementId ? [{ agreementId: { eq: values.agreementId } }] : []),
              { status: { in: ['ACTIVE', 'ACCOUNTED', 'GENERATED', 'RELIQUIDATED'] } },
            ],
          },
        },
      });

      const loanItems = (loansResponse.body as { data: Loan[] })?.data ?? [];
      const filteredLoanItems = normalizedCompanyDocument
        ? loanItems.filter((loan) => {
            const employerDocument = normalizeDocumentNumber(
              loan.borrower?.employerDocumentNumber ?? ''
            );
            return employerDocument === normalizedCompanyDocument;
          })
        : loanItems;

      if (!filteredLoanItems.length) {
        toast.error('No se encontraron creditos activos para el criterio seleccionado');
        setRows([]);
        return;
      }

      const balanceResponses = await Promise.all(
        filteredLoanItems.map((loan) =>
          api.loan.getBalanceSummary.query({
            params: { id: loan.id },
          })
        )
      );

      const parsedRows: PayrollLoanRow[] = filteredLoanItems.map((loan, index) => {
        const summary = balanceResponses[index]?.body as LoanBalanceSummaryResponse | undefined;
        return {
          loanId: loan.id,
          creditNumber: loan.creditNumber,
          borrowerName: getThirdPartyLabel(loan.borrower),
          balance: Number(summary?.currentBalance ?? 0),
          paymentAmount: 0,
          overpaidAmount: 0,
        };
      });

      setRows(parsedRows);
      setFileName('');
      setFileInfo(null);
    } catch (error) {
      toast.error(getTsRestErrorMessage(error));
    } finally {
      setIsLoadingLoans(false);
    }
  }, [form]);

  const handlePaymentAmountChange = React.useCallback((loanId: number, value: number) => {
    setRows((currentRows) =>
      currentRows.map((row) => {
        if (row.loanId !== loanId) return row;
        const normalized = Number.isFinite(value) && value >= 0 ? round2(value) : 0;
        if (normalized > row.balance) {
          const distribution = distributeByBalance(normalized, row.balance);
          return {
            ...row,
            paymentAmount: distribution.paymentAmount,
            overpaidAmount: distribution.overpaidAmount,
          };
        }
        return {
          ...row,
          paymentAmount: normalized,
        };
      })
    );
    setProcessResponse(null);
  }, []);

  const handleOverpaidAmountChange = React.useCallback((loanId: number, value: number) => {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.loanId === loanId
          ? { ...row, overpaidAmount: Number.isFinite(value) && value >= 0 ? round2(value) : 0 }
          : row
      )
    );
    setProcessResponse(null);
  }, []);

  const onFileChange = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        const content = await file.text();
        const amountByCredit = parseBasicFile(content);
        if (!amountByCredit.size) {
          toast.error('No se encontraron filas validas en el archivo');
          setFileName(file.name);
          setFileInfo({ matchedCount: 0, missingCreditNumbers: [] });
          return;
        }

        const applied = new Set<string>();
        setRows((currentRows) =>
          currentRows.map((row) => {
            const key = row.creditNumber.toUpperCase();
            const amount = amountByCredit.get(key);
            if (amount === undefined) return row;

            applied.add(key);
            const distribution = distributeByBalance(amount, row.balance);
            return {
              ...row,
              paymentAmount: distribution.paymentAmount,
              overpaidAmount: distribution.overpaidAmount,
            };
          })
        );

        const missingCreditNumbers = Array.from(amountByCredit.keys()).filter((key) => !applied.has(key));
        setFileName(file.name);
        setFileInfo({
          matchedCount: applied.size,
          missingCreditNumbers,
        });
        setProcessResponse(null);

        if (missingCreditNumbers.length) {
          toast.warning(
            `${missingCreditNumbers.length} credito(s) del archivo no fueron encontrados en el criterio consultado.`
          );
        }
      } catch {
        toast.error('No fue posible leer el archivo');
      } finally {
        event.target.value = '';
      }
    },
    []
  );

  const { mutateAsync: processPayroll, isPending: isProcessing } = useProcessLoanPaymentPayroll();

  const handleProcess = React.useCallback(async () => {
    const valid = await form.trigger();
    if (!valid) return;

    if (!rowsToProcess.length) {
      toast.error('Debe asignar valor a pagar en al menos un credito');
      return;
    }

    if (Math.abs(totals.difference) > 0.01) {
      toast.error('El total distribuido debe ser igual al valor del recaudo');
      return;
    }

    const values = form.getValues();
    const response = await processPayroll({
      body: {
        agreementId: values.agreementId ?? null,
        companyDocumentNumber: values.companyDocumentNumber?.trim() || null,
        receiptTypeId: values.receiptTypeId,
        glAccountId: values.glAccountId,
        collectionMethodId: values.collectionMethodId,
        collectionDate: values.collectionDate,
        referenceNumber: values.referenceNumber,
        collectionAmount: values.collectionAmount,
        rows: rowsToProcess.map((row) => ({
          loanId: row.loanId,
          creditNumber: row.creditNumber,
          paymentAmount: row.paymentAmount,
          overpaidAmount: row.overpaidAmount,
        })),
      },
    });

    setProcessResponse(response.body);
    if (response.body.processedRows > 0) {
      const currentReceiptTypeId = form.getValues('receiptTypeId');
      const currentGlAccountId = form.getValues('glAccountId');
      const currentCollectionMethodId = form.getValues('collectionMethodId');

      setRows([]);
      setFileName('');
      setFileInfo(null);

      form.reset({
        agreementId: undefined,
        companyDocumentNumber: '',
        receiptTypeId: currentReceiptTypeId,
        glAccountId: currentGlAccountId,
        collectionMethodId: currentCollectionMethodId,
        collectionDate: new Date(),
        referenceNumber: '',
        collectionAmount: 0,
      });
    }

    toast.success('Lote enviado al backend');
  }, [form, processPayroll, rowsToProcess, totals.difference]);

  return (
    <>
      <PageHeader
        title="Abono por libranza"
        description="Configure encabezado de recaudo, distribuya valores por credito y procese el lote."
      />
      <PageContent>
        <Card>
          <CardHeader>
            <CardTitle>Encabezado del recaudo</CardTitle>
            <CardDescription>Ingrese la informacion base para consultar y distribuir abonos.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup className="grid gap-4 md:grid-cols-3">
              <Controller
                name="agreementId"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="agreementId">Convenio (opcional)</FieldLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value ? Number(value) : undefined)}
                      value={field.value ? String(field.value) : ''}
                      disabled={isLoadingAgreements}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {agreements.map((item) => (
                          <SelectItem key={item.id} value={String(item.id)}>
                            {item.agreementCode} - {item.businessName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="companyDocumentNumber"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="companyDocumentNumber">
                      Documento empresa (opcional)
                    </FieldLabel>
                    <Input
                      id="companyDocumentNumber"
                      placeholder="NIT o documento"
                      {...field}
                      value={field.value ?? ''}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="receiptTypeId"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="receiptTypeId">Tipo de recibo de pago</FieldLabel>
                    <Select
                      onValueChange={(value) => {
                        const selectedId = value ? Number(value) : undefined;
                        field.onChange(selectedId);

                        const selectedReceiptType = receiptTypeOptions.find(
                          (item) => item.paymentReceiptTypeId === selectedId
                        );
                        if (selectedReceiptType) {
                          form.setValue('glAccountId', selectedReceiptType.glAccountId, {
                            shouldValidate: true,
                            shouldDirty: true,
                          });
                        }
                      }}
                      value={field.value ? String(field.value) : ''}
                      disabled={isLoadingReceiptTypes}
                    >
                      <SelectTrigger>
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
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="glAccountId"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="glAccountId">Auxiliar contable</FieldLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value ? Number(value) : undefined)}
                      value={field.value ? String(field.value) : ''}
                    >
                      <SelectTrigger>
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
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="collectionMethodId"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="collectionMethodId">Forma de pago</FieldLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value ? Number(value) : undefined)}
                      value={field.value ? String(field.value) : ''}
                      disabled={isLoadingCollectionMethods}
                    >
                      <SelectTrigger>
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
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="collectionDate"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="collectionDate">Fecha recaudo</FieldLabel>
                    <DatePicker
                      id="collectionDate"
                      value={field.value ?? null}
                      onChange={(value) => field.onChange(value ?? new Date())}
                      ariaInvalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="referenceNumber"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="referenceNumber">Numero de referencia</FieldLabel>
                    <Input id="referenceNumber" {...field} value={field.value ?? ''} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="collectionAmount"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="collectionAmount">Valor del recaudo</FieldLabel>
                    <Input
                      id="collectionAmount"
                      type="number"
                      min={0}
                      step="0.01"
                      value={field.value ?? ''}
                      onChange={(event) => field.onChange(Number(event.target.value))}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </FieldGroup>

            <div className="mt-4 flex gap-2">
              <Button type="button" onClick={handleConsultLoans} disabled={isLoadingLoans}>
                {isLoadingLoans ? <Spinner /> : null}
                Consultar creditos
              </Button>
            </div>
          </CardContent>
        </Card>

        {rows.length ? (
          <Card>
            <CardHeader>
              <CardTitle>Carga de archivo basico (opcional)</CardTitle>
              <CardDescription>Formato: Numero Credito - Valor Abono</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input type="file" accept=".txt,.csv,text/plain" onChange={onFileChange} />
              {fileInfo ? (
                <p className="text-muted-foreground text-xs">
                  Archivo: {fileName} | Coincidencias: {fileInfo.matchedCount} | No encontrados:{' '}
                  {fileInfo.missingCreditNumbers.length}
                </p>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {rows.length ? (
          <Card>
            <CardHeader>
              <CardTitle>Creditos encontrados</CardTitle>
              <CardDescription>
                Ajuste valores por credito segun convenio o documento de empresa consultado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead># Credito</TableHead>
                    <TableHead>Tercero</TableHead>
                    <TableHead>Saldo</TableHead>
                    <TableHead>Valor a pagar</TableHead>
                    <TableHead>Valor mayor pagado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.loanId}>
                      <TableCell className="font-medium">{row.creditNumber}</TableCell>
                      <TableCell>{row.borrowerName}</TableCell>
                      <TableCell>{formatCurrency(row.balance)}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={row.paymentAmount}
                          onChange={(event) =>
                            handlePaymentAmountChange(row.loanId, Number(event.target.value))
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={row.overpaidAmount}
                          onChange={(event) =>
                            handleOverpaidAmountChange(row.loanId, Number(event.target.value))
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : null}

        {rows.length ? (
          <Card>
            <CardHeader>
              <CardTitle>Resumen de lote</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-6">
              <div>
                <p className="text-muted-foreground text-xs">Creditos a abonar</p>
                <p className="font-medium">{totals.creditCount}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Total valor a pagar</p>
                <p className="font-medium">{formatCurrency(totals.totalPaymentAmount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Total mayor pagado</p>
                <p className="font-medium">{formatCurrency(totals.totalOverpaidAmount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Total distribuido</p>
                <p className="font-medium">{formatCurrency(totals.totalAssigned)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Valor recaudo</p>
                <p className="font-medium">{formatCurrency(collectionAmount ?? 0)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Diferencia</p>
                <p className={`font-medium ${Math.abs(totals.difference) <= 0.01 ? '' : 'text-destructive'}`}>
                  {formatCurrency(totals.difference)}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {rows.length ? (
          <div className="flex gap-2">
            <Button type="button" onClick={handleProcess} disabled={isProcessing || !rowsToProcess.length}>
              {isProcessing ? <Spinner /> : null}
              Procesar abono por libranza
            </Button>
          </div>
        ) : null}

        {processResponse ? (
          <Card>
            <CardHeader>
              <CardTitle>Respuesta backend</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              <div>
                <p className="text-muted-foreground text-xs">Filas recibidas</p>
                <p className="font-medium">{processResponse.receivedRows}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Total pago</p>
                <p className="font-medium">{formatCurrency(processResponse.totalPaymentAmount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Total mayor pagado</p>
                <p className="font-medium">{formatCurrency(processResponse.totalOverpaidAmount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Mensaje</p>
                <p className="font-medium">{processResponse.message}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Fecha recaudo</p>
                <p className="font-medium">{formatDate(form.getValues('collectionDate'))}</p>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </PageContent>
    </>
  );
}
