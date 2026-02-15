'use client';

import { PageContent, PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  useExecuteLoanWriteOff,
  useGenerateLoanWriteOffProposal,
  useReviewLoanWriteOffProposal,
} from '@/hooks/queries/use-loan-write-off-queries';
import {
  ExecuteLoanWriteOffResult,
  GenerateLoanWriteOffProposalBodySchema,
  GenerateLoanWriteOffProposalResult,
  LoanWriteOffProposalRow,
  ReviewLoanWriteOffProposalResult,
} from '@/schemas/loan-write-off';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import { Controller, type Resolver, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const FormSchema = GenerateLoanWriteOffProposalBodySchema;
type FormValues = z.infer<typeof FormSchema>;

function parseCreditNumbersFromFile(fileContent: string): string[] {
  const normalizedContent = fileContent.replace(/^\uFEFF/, '');
  const rawTokens = normalizedContent
    .split(/[\r\n,;\t]+/g)
    .map((token) => token.trim().replace(/^['"]+|['"]+$/g, ''))
    .filter((token) => token.length > 0);

  return rawTokens.filter((token) => {
    const normalized = token.toLowerCase().replace(/\s+/g, ' ');
    return ![
      'numero credito',
      'numero de credito',
      'número de credito',
      'número crédito',
      '# credito',
      '# crédito',
      'credito',
      'crédito',
    ].includes(normalized);
  });
}

function summarizeSelectedRows(selectedRows: LoanWriteOffProposalRow[]) {
  return selectedRows.reduce(
    (acc, row) => {
      return {
        selectedOutstandingBalance: acc.selectedOutstandingBalance + row.outstandingBalance,
        selectedProvisionAmount: acc.selectedProvisionAmount + row.provisionAmount,
        selectedRecommendedWriteOff: acc.selectedRecommendedWriteOff + row.recommendedWriteOffAmount,
      };
    },
    {
      selectedOutstandingBalance: 0,
      selectedProvisionAmount: 0,
      selectedRecommendedWriteOff: 0,
    }
  );
}

export function LoanWriteOff() {
  const [proposal, setProposal] = React.useState<GenerateLoanWriteOffProposalResult | null>(null);
  const [review, setReview] = React.useState<ReviewLoanWriteOffProposalResult | null>(null);
  const [execution, setExecution] = React.useState<ExecuteLoanWriteOffResult | null>(null);
  const [selectedCreditNumbers, setSelectedCreditNumbers] = React.useState<string[]>([]);
  const [selectionFileName, setSelectionFileName] = React.useState('');
  const [unmatchedFromFile, setUnmatchedFromFile] = React.useState<string[]>([]);

  const today = React.useMemo(() => new Date(), []);

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema) as Resolver<FormValues>,
    defaultValues: {
      cutoffDate: today,
    },
  });

  const reviewedRows = review?.rows ?? [];
  const selectedCreditNumbersSet = React.useMemo(
    () => new Set(selectedCreditNumbers.map((creditNumber) => creditNumber.toUpperCase())),
    [selectedCreditNumbers]
  );

  const selectedRows = React.useMemo(() => {
    if (!reviewedRows.length) return [];
    return reviewedRows.filter((row) => selectedCreditNumbersSet.has(row.creditNumber.toUpperCase()));
  }, [reviewedRows, selectedCreditNumbersSet]);

  const { selectedOutstandingBalance, selectedProvisionAmount, selectedRecommendedWriteOff } =
    React.useMemo(() => summarizeSelectedRows(selectedRows), [selectedRows]);

  const allRowsSelected = reviewedRows.length > 0 && selectedRows.length === reviewedRows.length;
  const someRowsSelected = selectedRows.length > 0 && selectedRows.length < reviewedRows.length;

  const { mutateAsync: generateProposal, isPending: isGenerating } = useGenerateLoanWriteOffProposal();
  const { mutateAsync: reviewProposal, isPending: isReviewing } = useReviewLoanWriteOffProposal();
  const { mutateAsync: executeWriteOff, isPending: isExecuting } = useExecuteLoanWriteOff();

  const onGenerate = async (values: FormValues) => {
    const response = await generateProposal({
      body: values,
    });
    setProposal(response.body);
    setReview(null);
    setExecution(null);
    setSelectedCreditNumbers([]);
    setSelectionFileName('');
    setUnmatchedFromFile([]);
    toast.success('Propuesta generada');
  };

  const onReview = React.useCallback(async () => {
    if (!proposal) return;

    const response = await reviewProposal({
      body: {
        proposalId: proposal.proposalId,
      },
    });

    setReview(response.body);
    setExecution(null);
    setSelectionFileName('');
    setUnmatchedFromFile([]);
    setSelectedCreditNumbers(response.body.rows.map((row) => row.creditNumber));
    toast.success('Propuesta cargada para revision');
  }, [proposal, reviewProposal]);

  const onToggleAll = React.useCallback(
    (checked: boolean) => {
      if (!reviewedRows.length) return;
      if (!checked) {
        setSelectedCreditNumbers([]);
        return;
      }
      setSelectedCreditNumbers(reviewedRows.map((row) => row.creditNumber));
    },
    [reviewedRows]
  );

  const onToggleRow = React.useCallback((creditNumber: string, checked: boolean) => {
    const normalized = creditNumber.toUpperCase();
    setSelectedCreditNumbers((previous) => {
      const selectedSet = new Set(previous.map((value) => value.toUpperCase()));
      if (checked) {
        selectedSet.add(normalized);
      } else {
        selectedSet.delete(normalized);
      }

      const rowMap = new Map(reviewedRows.map((row) => [row.creditNumber.toUpperCase(), row.creditNumber]));
      return Array.from(selectedSet)
        .map((value) => rowMap.get(value))
        .filter((value): value is string => Boolean(value));
    });
  }, [reviewedRows]);

  const onSelectionFileChange = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        if (!review) {
          toast.error('Primero debe revisar la propuesta para cargar los creditos candidatos');
          return;
        }

        const fileContent = await file.text();
        const parsedCredits = parseCreditNumbersFromFile(fileContent);

        if (!parsedCredits.length) {
          setSelectionFileName(file.name);
          setUnmatchedFromFile([]);
          toast.error('El archivo no contiene numeros de credito validos');
          return;
        }

        const rowMap = new Map(review.rows.map((row) => [row.creditNumber.toUpperCase(), row.creditNumber]));
        const matched: string[] = [];
        const unmatched: string[] = [];
        const matchedSet = new Set<string>();

        parsedCredits.forEach((creditNumber) => {
          const normalized = creditNumber.toUpperCase();
          const matchedCredit = rowMap.get(normalized);

          if (!matchedCredit) {
            unmatched.push(creditNumber);
            return;
          }

          if (matchedSet.has(normalized)) return;

          matchedSet.add(normalized);
          matched.push(matchedCredit);
        });

        setSelectionFileName(file.name);
        setUnmatchedFromFile(Array.from(new Set(unmatched.map((value) => value.toUpperCase()))));

        if (!matched.length) {
          setSelectedCreditNumbers([]);
          toast.error('Ningun credito del archivo coincide con la propuesta revisada');
          return;
        }

        setSelectedCreditNumbers(matched);
        toast.success(`${matched.length} credito(s) seleccionados desde archivo`);

        if (unmatched.length) {
          toast.warning(`${unmatched.length} credito(s) del archivo no fueron encontrados en la propuesta`);
        }
      } catch {
        toast.error('No fue posible leer el archivo seleccionado');
      } finally {
        event.target.value = '';
      }
    },
    [review]
  );

  const onExecute = React.useCallback(async () => {
    if (!review || !selectedRows.length) {
      toast.error('Debe seleccionar al menos un credito para ejecutar castigo');
      return;
    }

    const response = await executeWriteOff({
      body: {
        proposalId: review.proposalId,
        selectedCreditNumbers: selectedRows.map((row) => row.creditNumber),
      },
    });
    setExecution(response.body);
    toast.success('Ejecucion enviada al backend');
  }, [executeWriteOff, review, selectedRows]);

  return (
    <>
      <PageHeader
        title="Castiga cartera"
        description="Flujo sugerido: generar propuesta, revisar candidatos y ejecutar castigo."
      />
      <PageContent>
        <Card>
          <CardHeader>
            <CardTitle>Paso 1: Generar propuesta</CardTitle>
            <CardDescription>Defina la fecha de corte para calcular creditos candidatos.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onGenerate)} className="space-y-4">
              <FieldGroup className="grid gap-4 md:grid-cols-[1fr_auto]">
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
                  Generar
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>

        {proposal ? (
          <Card>
            <CardHeader>
              <CardTitle>Resumen de propuesta</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-6">
              <div>
                <p className="text-muted-foreground text-xs">Propuesta</p>
                <p className="font-medium">{proposal.proposalId}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Fecha corte</p>
                <p className="font-medium">{formatDate(proposal.cutoffDate)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Revisados</p>
                <p className="font-medium">{proposal.reviewedCredits}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Candidatos</p>
                <p className="font-medium">{proposal.eligibleCredits}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Saldo total</p>
                <p className="font-medium">{formatCurrency(proposal.totalOutstandingBalance)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Castigo sugerido</p>
                <p className="font-medium">{formatCurrency(proposal.totalRecommendedWriteOff)}</p>
              </div>
              <div className="md:col-span-6">
                <p className="text-muted-foreground text-xs">Mensaje</p>
                <p className="font-medium">{proposal.message}</p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Paso 2: Revisar y seleccionar</CardTitle>
            <CardDescription>
              Consulte el detalle de creditos candidatos y seleccione los que desea castigar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button type="button" variant="outline" onClick={onReview} disabled={!proposal || isReviewing}>
              {isReviewing ? <Spinner /> : null}
              Revisar propuesta
            </Button>

            {review ? (
              <>
                <div className="grid gap-3 md:grid-cols-5">
                  <div>
                    <p className="text-muted-foreground text-xs">Propuesta</p>
                    <p className="font-medium">{review.proposalId}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Revisados</p>
                    <p className="font-medium">{review.reviewedCredits}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Candidatos</p>
                    <p className="font-medium">{review.eligibleCredits}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Saldo total</p>
                    <p className="font-medium">{formatCurrency(review.totalOutstandingBalance)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Castigo sugerido</p>
                    <p className="font-medium">{formatCurrency(review.totalRecommendedWriteOff)}</p>
                  </div>
                </div>

                <div className="rounded-md border p-4">
                  <div className="grid gap-4 md:grid-cols-[auto_1fr] md:items-end">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="selectAllWriteOff"
                        checked={allRowsSelected ? true : someRowsSelected ? 'indeterminate' : false}
                        onCheckedChange={(checked) => onToggleAll(checked === true)}
                      />
                      <FieldLabel htmlFor="selectAllWriteOff">Seleccionar todos</FieldLabel>
                    </div>

                    <div className="space-y-2">
                      <Input
                        type="file"
                        accept=".txt,.csv,text/plain"
                        onChange={onSelectionFileChange}
                      />
                      <p className="text-muted-foreground text-xs">
                        Cargue archivo plano con numero de credito para autoseleccionar.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <div>
                      <p className="text-muted-foreground text-xs">Seleccionados</p>
                      <p className="font-medium">{selectedRows.length}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Saldo a castigar</p>
                      <p className="font-medium">{formatCurrency(selectedOutstandingBalance)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Provision seleccionada</p>
                      <p className="font-medium">{formatCurrency(selectedProvisionAmount)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Castigo seleccionado</p>
                      <p className="font-medium">{formatCurrency(selectedRecommendedWriteOff)}</p>
                    </div>
                    {selectionFileName ? (
                      <div className="md:col-span-4">
                        <p className="text-muted-foreground text-xs">Archivo cargado</p>
                        <p className="font-medium">{selectionFileName}</p>
                      </div>
                    ) : null}
                    {unmatchedFromFile.length ? (
                      <div className="md:col-span-4">
                        <p className="text-muted-foreground text-xs">No encontrados en propuesta</p>
                        <p className="font-medium">{unmatchedFromFile.join(', ')}</p>
                      </div>
                    ) : null}
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-14">Sel.</TableHead>
                      <TableHead># Credito</TableHead>
                      <TableHead>Tercero</TableHead>
                      <TableHead>Dias mora</TableHead>
                      <TableHead>Saldo</TableHead>
                      <TableHead>Provision</TableHead>
                      <TableHead>Castigo sugerido</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {review.rows.map((row) => {
                      const isSelected = selectedCreditNumbersSet.has(row.creditNumber.toUpperCase());

                      return (
                        <TableRow key={row.creditNumber} data-state={isSelected ? 'selected' : undefined}>
                          <TableCell>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) =>
                                onToggleRow(row.creditNumber, checked === true)
                              }
                            />
                          </TableCell>
                          <TableCell>{row.creditNumber}</TableCell>
                          <TableCell>{row.thirdPartyName}</TableCell>
                          <TableCell>{row.daysPastDue}</TableCell>
                          <TableCell>{formatCurrency(row.outstandingBalance)}</TableCell>
                          <TableCell>{formatCurrency(row.provisionAmount)}</TableCell>
                          <TableCell>{formatCurrency(row.recommendedWriteOffAmount)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Paso 3: Ejecutar</CardTitle>
            <CardDescription>
              Ejecute el castigo para los creditos seleccionados de la propuesta revisada.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              type="button"
              onClick={onExecute}
              disabled={!review || !selectedRows.length || isExecuting}
            >
              {isExecuting ? <Spinner /> : null}
              Ejecutar castiga cartera
            </Button>

            {review ? (
              <p className="text-muted-foreground text-xs">
                Se enviaran {selectedRows.length} credito(s) por un castigo total de{' '}
                {formatCurrency(selectedRecommendedWriteOff)}.
              </p>
            ) : null}

            {execution ? (
              <div className="grid gap-3 md:grid-cols-4">
                <div>
                  <p className="text-muted-foreground text-xs">Propuesta</p>
                  <p className="font-medium">{execution.proposalId}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Creditos ejecutados</p>
                  <p className="font-medium">{execution.executedCredits}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Valor castigado</p>
                  <p className="font-medium">{formatCurrency(execution.totalWrittenOffAmount)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Fecha movimiento</p>
                  <p className="font-medium">{formatDate(execution.movementDate)}</p>
                </div>
                <div className="md:col-span-4">
                  <p className="text-muted-foreground text-xs">Mensaje</p>
                  <p className="font-medium">{execution.message}</p>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </PageContent>
    </>
  );
}
