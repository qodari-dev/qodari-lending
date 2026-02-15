'use client';

import { PageContent, PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
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

export function LoanWriteOff() {
  const [proposal, setProposal] = React.useState<GenerateLoanWriteOffProposalResult | null>(null);
  const [review, setReview] = React.useState<ReviewLoanWriteOffProposalResult | null>(null);
  const [execution, setExecution] = React.useState<ExecuteLoanWriteOffResult | null>(null);

  const today = React.useMemo(() => new Date(), []);

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema) as Resolver<FormValues>,
    defaultValues: {
      cutoffDate: today,
    },
  });

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
    toast.success('Propuesta cargada para revision');
  }, [proposal, reviewProposal]);

  const onExecute = React.useCallback(async () => {
    if (!review) return;

    const response = await executeWriteOff({
      body: {
        proposalId: review.proposalId,
      },
    });
    setExecution(response.body);
    toast.success('Ejecucion enviada al backend');
  }, [executeWriteOff, review]);

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
            <CardTitle>Paso 2: Revisar</CardTitle>
            <CardDescription>Consulte el detalle de creditos candidatos antes de ejecutar.</CardDescription>
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

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead># Credito</TableHead>
                      <TableHead>Tercero</TableHead>
                      <TableHead>Dias mora</TableHead>
                      <TableHead>Saldo</TableHead>
                      <TableHead>Provision</TableHead>
                      <TableHead>Castigo sugerido</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {review.rows.map((row) => (
                      <TableRow key={row.creditNumber}>
                        <TableCell>{row.creditNumber}</TableCell>
                        <TableCell>{row.thirdPartyName}</TableCell>
                        <TableCell>{row.daysPastDue}</TableCell>
                        <TableCell>{formatCurrency(row.outstandingBalance)}</TableCell>
                        <TableCell>{formatCurrency(row.provisionAmount)}</TableCell>
                        <TableCell>{formatCurrency(row.recommendedWriteOffAmount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Paso 3: Ejecutar</CardTitle>
            <CardDescription>Ejecute el castigo para la propuesta revisada.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button type="button" onClick={onExecute} disabled={!review || isExecuting}>
              {isExecuting ? <Spinner /> : null}
              Ejecutar castiga cartera
            </Button>

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
