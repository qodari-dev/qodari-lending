import { accountingEntries } from '@/server/db';
import { allocateAmountByPercentage, calculateOneTimeConceptAmount } from '@/server/utils/accounting-utils';
import { throwHttpError } from '@/server/utils/generic-ts-rest-error';
import type { PortfolioDeltaInput } from '@/server/utils/portfolio-utils';
import { roundMoney, toDecimalString, toNumber } from '@/server/utils/value-utils';

type DetailType = 'RECEIVABLE' | 'PAYABLE' | 'NONE';

type LoanCore = {
  id: number;
  creditNumber: string;
  costCenterId: number | null;
  thirdPartyId: number;
  creditStartDate: string;
  principalAmount: string;
};

type InstallmentLike = {
  installmentNumber: number;
  dueDate: string;
  principalAmount: string;
  interestAmount: string;
  insuranceAmount: string;
};

type DistributionLineLike = {
  id: number;
  glAccountId: number;
  percentage: string;
  nature: 'DEBIT' | 'CREDIT';
  glAccount?: {
    detailType: DetailType;
  } | null;
};

type LoanBillingConceptLike = {
  billingConceptId: number;
  frequency: string;
  financingMode: string;
  glAccountId: number | null;
  calcMethod: 'FIXED_AMOUNT' | 'PERCENTAGE' | 'TIERED_FIXED_AMOUNT' | 'TIERED_PERCENTAGE';
  baseAmount: 'DISBURSED_AMOUNT' | 'PRINCIPAL' | 'OUTSTANDING_BALANCE' | 'INSTALLMENT_AMOUNT' | null;
  rate: string | null;
  amount: string | null;
  minAmount: string | null;
  maxAmount: string | null;
  roundingMode: 'NEAREST' | 'UP' | 'DOWN';
  roundingDecimals: number;
  computedAmount: string | null;
  glAccount?: {
    detailType: DetailType;
  } | null;
  billingConcept: {
    name: string;
  };
};

type BuildLoanLiquidationArtifactsArgs = {
  loan: LoanCore;
  installments: InstallmentLike[];
  distributionLines: DistributionLineLike[];
  loanConceptSnapshots: LoanBillingConceptLike[];
  documentCode: string;
  entryDate: string;
  sourceType: (typeof accountingEntries.$inferInsert)['sourceType'];
  sourceId: string;
  startingSequence?: number;
  freezeComputedOneTimeAmounts?: boolean;
};

type BuildLoanLiquidationArtifactsResult = {
  accountingEntriesPayload: Array<typeof accountingEntries.$inferInsert>;
  portfolioDeltas: PortfolioDeltaInput[];
  disbursementAmount: number;
  nextSequence: number;
};

export function buildLoanLiquidationArtifacts(
  args: BuildLoanLiquidationArtifactsArgs
): BuildLoanLiquidationArtifactsResult {
  const { loan, installments, distributionLines, loanConceptSnapshots } = args;

  const debitLines = distributionLines.filter((line) => line.nature === 'DEBIT');
  const creditLines = distributionLines.filter((line) => line.nature === 'CREDIT');

  if (!debitLines.length || !creditLines.length) {
    throwHttpError({
      status: 400,
      message: 'La distribucion de capital debe tener lineas debito y credito',
      code: 'BAD_REQUEST',
    });
  }

  const invalidReceivableCreditLine = distributionLines.find(
    (line) => line.glAccount?.detailType === 'RECEIVABLE' && line.nature === 'CREDIT'
  );
  if (invalidReceivableCreditLine) {
    throwHttpError({
      status: 400,
      message: 'La distribucion de capital no puede acreditar cuentas de cartera',
      code: 'BAD_REQUEST',
    });
  }

  const oneTimeBilledSeparatelyConcepts = loanConceptSnapshots.filter(
    (item) => item.frequency === 'ONE_TIME' && item.financingMode === 'BILLED_SEPARATELY'
  );
  const oneTimeFinancedConcepts = loanConceptSnapshots.filter(
    (item) => item.frequency === 'ONE_TIME' && item.financingMode === 'FINANCED_IN_LOAN'
  );
  const oneTimeDiscountConcepts = loanConceptSnapshots.filter(
    (item) => item.frequency === 'ONE_TIME' && item.financingMode === 'DISCOUNT_FROM_DISBURSEMENT'
  );

  const principalAmount = toNumber(loan.principalAmount);
  const firstInstallment = installments[0];
  const firstInstallmentAmount = firstInstallment
    ? toNumber(firstInstallment.principalAmount) +
      toNumber(firstInstallment.interestAmount) +
      toNumber(firstInstallment.insuranceAmount)
    : 0;

  let totalDiscountAmount = 0;
  const discountConceptAmounts: Array<{
    concept: LoanBillingConceptLike;
    amount: number;
  }> = [];

  for (const concept of oneTimeDiscountConcepts) {
    if (!concept.glAccountId) {
      throwHttpError({
        status: 400,
        message: `Concepto #${concept.billingConceptId} - ${concept.billingConcept.name} no tiene auxiliar configurado para liquidacion`,
        code: 'BAD_REQUEST',
      });
    }
    if (concept.glAccount?.detailType === 'RECEIVABLE') {
      throwHttpError({
        status: 400,
        message: `Concepto #${concept.billingConceptId} - ${concept.billingConcept.name}: descontar de desembolso no puede usar una cuenta de cartera`,
        code: 'BAD_REQUEST',
      });
    }

    const conceptAmount =
      args.freezeComputedOneTimeAmounts && concept.computedAmount
        ? toNumber(concept.computedAmount)
        : calculateOneTimeConceptAmount({
            concept: {
              calcMethod: concept.calcMethod,
              baseAmount: concept.baseAmount,
              rate: concept.rate,
              amount: concept.amount,
              minAmount: concept.minAmount,
              maxAmount: concept.maxAmount,
              roundingMode: concept.roundingMode,
              roundingDecimals: concept.roundingDecimals,
            },
            principal: principalAmount,
            firstInstallmentAmount,
          });

    if (conceptAmount > 0) {
      discountConceptAmounts.push({ concept, amount: conceptAmount });
      totalDiscountAmount = roundMoney(totalDiscountAmount + conceptAmount);
    }
  }

  let totalFinancedAmount = 0;
  const financedConceptAmounts: Array<{
    concept: LoanBillingConceptLike;
    amount: number;
  }> = [];

  for (const concept of oneTimeFinancedConcepts) {
    if (!concept.glAccountId) {
      throwHttpError({
        status: 400,
        message: `Concepto #${concept.billingConceptId} - ${concept.billingConcept.name} no tiene auxiliar configurado para liquidacion`,
        code: 'BAD_REQUEST',
      });
    }
    if (concept.glAccount?.detailType === 'RECEIVABLE') {
      throwHttpError({
        status: 400,
        message: `Concepto #${concept.billingConceptId} - ${concept.billingConcept.name}: financiado en credito no puede usar una cuenta de cartera`,
        code: 'BAD_REQUEST',
      });
    }

    const conceptAmount = concept.computedAmount
      ? toNumber(concept.computedAmount)
      : calculateOneTimeConceptAmount({
          concept: {
            calcMethod: concept.calcMethod,
            baseAmount: concept.baseAmount,
            rate: concept.rate,
            amount: concept.amount,
            minAmount: concept.minAmount,
            maxAmount: concept.maxAmount,
            roundingMode: concept.roundingMode,
            roundingDecimals: concept.roundingDecimals,
          },
          principal: principalAmount,
          firstInstallmentAmount,
        });

    if (conceptAmount > 0) {
      financedConceptAmounts.push({ concept, amount: conceptAmount });
      totalFinancedAmount = roundMoney(totalFinancedAmount + conceptAmount);
    }
  }

  const disbursementAmount = roundMoney(principalAmount - totalFinancedAmount - totalDiscountAmount);
  if (disbursementAmount <= 0) {
    throwHttpError({
      status: 400,
      message: 'El monto a desembolsar no puede ser cero o negativo despues de descontar conceptos',
      code: 'BAD_REQUEST',
    });
  }

  let sequence = args.startingSequence ?? 1;
  const accountingEntriesPayload: Array<typeof accountingEntries.$inferInsert> = [];
  const portfolioDelta = new Map<
    string,
    {
      glAccountId: number;
      thirdPartyId: number;
      loanId: number;
      installmentNumber: number;
      dueDate: string;
      chargeAmount: number;
      paymentAmount: number;
    }
  >();

  for (const installment of installments) {
    const installmentPrincipal = toNumber(installment.principalAmount);
    if (installmentPrincipal <= 0) continue;

    const debitAmounts = allocateAmountByPercentage({
      totalAmount: installmentPrincipal,
      lines: debitLines,
    });
    const creditAmounts = allocateAmountByPercentage({
      totalAmount: installmentPrincipal,
      lines: creditLines,
    });

    for (const line of debitLines) {
      const amount = debitAmounts.get(line.id) ?? 0;
      if (amount <= 0) continue;

      accountingEntriesPayload.push({
        processType: 'CREDIT',
        documentCode: args.documentCode,
        sequence,
        entryDate: args.entryDate,
        glAccountId: line.glAccountId,
        costCenterId: loan.costCenterId ?? null,
        thirdPartyId: loan.thirdPartyId,
        description: `Liquidacion credito ${loan.creditNumber} cuota ${installment.installmentNumber}`.slice(
          0,
          255
        ),
        nature: 'DEBIT',
        amount: toDecimalString(amount),
        loanId: loan.id,
        installmentNumber: installment.installmentNumber,
        dueDate: installment.dueDate,
        status: 'DRAFT',
        statusDate: args.entryDate,
        sourceType: args.sourceType,
        sourceId: args.sourceId,
      });
      sequence += 1;

      if (line.glAccount?.detailType === 'RECEIVABLE') {
        const key = `${line.glAccountId}:${loan.thirdPartyId}:${loan.id}:${installment.installmentNumber}`;
        const current = portfolioDelta.get(key) ?? {
          glAccountId: line.glAccountId,
          thirdPartyId: loan.thirdPartyId,
          loanId: loan.id,
          installmentNumber: installment.installmentNumber,
          dueDate: installment.dueDate,
          chargeAmount: 0,
          paymentAmount: 0,
        };
        current.chargeAmount = roundMoney(current.chargeAmount + amount);
        portfolioDelta.set(key, current);
      }
    }

    for (const line of creditLines) {
      const amount = creditAmounts.get(line.id) ?? 0;
      if (amount <= 0) continue;

      accountingEntriesPayload.push({
        processType: 'CREDIT',
        documentCode: args.documentCode,
        sequence,
        entryDate: args.entryDate,
        glAccountId: line.glAccountId,
        costCenterId: loan.costCenterId ?? null,
        thirdPartyId: loan.thirdPartyId,
        description: `Liquidacion credito ${loan.creditNumber} cuota ${installment.installmentNumber}`.slice(
          0,
          255
        ),
        nature: 'CREDIT',
        amount: toDecimalString(amount),
        loanId: loan.id,
        installmentNumber: installment.installmentNumber,
        dueDate: installment.dueDate,
        status: 'DRAFT',
        statusDate: args.entryDate,
        sourceType: args.sourceType,
        sourceId: args.sourceId,
      });
      sequence += 1;
    }
  }

  for (const { concept, amount: conceptAmount } of discountConceptAmounts) {
    const reversalAmounts = allocateAmountByPercentage({
      totalAmount: conceptAmount,
      lines: creditLines,
    });

    for (const line of creditLines) {
      const lineAmount = reversalAmounts.get(line.id) ?? 0;
      if (lineAmount <= 0) continue;

      accountingEntriesPayload.push({
        processType: 'CREDIT',
        documentCode: args.documentCode,
        sequence,
        entryDate: args.entryDate,
        glAccountId: line.glAccountId,
        costCenterId: loan.costCenterId ?? null,
        thirdPartyId: loan.thirdPartyId,
        description: `Descuento desembolso concepto ${concept.billingConceptId} credito ${loan.creditNumber}`.slice(
          0,
          255
        ),
        nature: 'DEBIT',
        amount: toDecimalString(lineAmount),
        loanId: loan.id,
        installmentNumber: firstInstallment?.installmentNumber ?? 1,
        dueDate: firstInstallment?.dueDate ?? loan.creditStartDate,
        status: 'DRAFT',
        statusDate: args.entryDate,
        sourceType: args.sourceType,
        sourceId: args.sourceId,
      });
      sequence += 1;
    }

    accountingEntriesPayload.push({
      processType: 'CREDIT',
      documentCode: args.documentCode,
      sequence,
      entryDate: args.entryDate,
      glAccountId: concept.glAccountId!,
      costCenterId: loan.costCenterId ?? null,
      thirdPartyId: loan.thirdPartyId,
      description: `Descuento desembolso concepto ${concept.billingConceptId} credito ${loan.creditNumber}`.slice(
        0,
        255
      ),
      nature: 'CREDIT',
      amount: toDecimalString(conceptAmount),
      loanId: loan.id,
      installmentNumber: firstInstallment?.installmentNumber ?? 1,
      dueDate: firstInstallment?.dueDate ?? loan.creditStartDate,
      status: 'DRAFT',
      statusDate: args.entryDate,
      sourceType: args.sourceType,
      sourceId: args.sourceId,
    });
    sequence += 1;
  }

  for (const { concept, amount: conceptAmount } of financedConceptAmounts) {
    const reversalAmounts = allocateAmountByPercentage({
      totalAmount: conceptAmount,
      lines: creditLines,
    });

    for (const line of creditLines) {
      const lineAmount = reversalAmounts.get(line.id) ?? 0;
      if (lineAmount <= 0) continue;

      accountingEntriesPayload.push({
        processType: 'CREDIT',
        documentCode: args.documentCode,
        sequence,
        entryDate: args.entryDate,
        glAccountId: line.glAccountId,
        costCenterId: loan.costCenterId ?? null,
        thirdPartyId: loan.thirdPartyId,
        description: `Financiado en credito concepto ${concept.billingConceptId} credito ${loan.creditNumber}`.slice(
          0,
          255
        ),
        nature: 'DEBIT',
        amount: toDecimalString(lineAmount),
        loanId: loan.id,
        installmentNumber: firstInstallment?.installmentNumber ?? 1,
        dueDate: firstInstallment?.dueDate ?? loan.creditStartDate,
        status: 'DRAFT',
        statusDate: args.entryDate,
        sourceType: args.sourceType,
        sourceId: args.sourceId,
      });
      sequence += 1;
    }

    accountingEntriesPayload.push({
      processType: 'CREDIT',
      documentCode: args.documentCode,
      sequence,
      entryDate: args.entryDate,
      glAccountId: concept.glAccountId!,
      costCenterId: loan.costCenterId ?? null,
      thirdPartyId: loan.thirdPartyId,
      description: `Financiado en credito concepto ${concept.billingConceptId} credito ${loan.creditNumber}`.slice(
        0,
        255
      ),
      nature: 'CREDIT',
      amount: toDecimalString(conceptAmount),
      loanId: loan.id,
      installmentNumber: firstInstallment?.installmentNumber ?? 1,
      dueDate: firstInstallment?.dueDate ?? loan.creditStartDate,
      status: 'DRAFT',
      statusDate: args.entryDate,
      sourceType: args.sourceType,
      sourceId: args.sourceId,
    });
    sequence += 1;
  }

  for (const concept of oneTimeBilledSeparatelyConcepts) {
    if (!concept.glAccountId) {
      throwHttpError({
        status: 400,
        message: `Concepto #${concept.billingConceptId} - ${concept.billingConcept.name} no tiene auxiliar configurado para liquidacion`,
        code: 'BAD_REQUEST',
      });
    }
    if (concept.glAccount?.detailType === 'RECEIVABLE') {
      throwHttpError({
        status: 400,
        message: `Concepto #${concept.billingConceptId} - ${concept.billingConcept.name} no puede acreditar una cuenta de cartera`,
        code: 'BAD_REQUEST',
      });
    }

    const conceptAmount = concept.computedAmount
      ? toNumber(concept.computedAmount)
      : calculateOneTimeConceptAmount({
          concept: {
            calcMethod: concept.calcMethod,
            baseAmount: concept.baseAmount,
            rate: concept.rate,
            amount: concept.amount,
            minAmount: concept.minAmount,
            maxAmount: concept.maxAmount,
            roundingMode: concept.roundingMode,
            roundingDecimals: concept.roundingDecimals,
          },
          principal: principalAmount,
          firstInstallmentAmount,
        });

    if (conceptAmount <= 0) continue;

    const debitAmounts = allocateAmountByPercentage({
      totalAmount: conceptAmount,
      lines: debitLines,
    });

    for (const line of debitLines) {
      const amount = debitAmounts.get(line.id) ?? 0;
      if (amount <= 0) continue;

      accountingEntriesPayload.push({
        processType: 'CREDIT',
        documentCode: args.documentCode,
        sequence,
        entryDate: args.entryDate,
        glAccountId: line.glAccountId,
        costCenterId: loan.costCenterId ?? null,
        thirdPartyId: loan.thirdPartyId,
        description: `Liquidacion concepto ${concept.billingConceptId} credito ${loan.creditNumber}`.slice(
          0,
          255
        ),
        nature: 'DEBIT',
        amount: toDecimalString(amount),
        loanId: loan.id,
        installmentNumber: firstInstallment?.installmentNumber ?? 1,
        dueDate: firstInstallment?.dueDate ?? loan.creditStartDate,
        status: 'DRAFT',
        statusDate: args.entryDate,
        sourceType: args.sourceType,
        sourceId: args.sourceId,
      });
      sequence += 1;

      if (line.glAccount?.detailType === 'RECEIVABLE') {
        const conceptInstallmentNumber = firstInstallment?.installmentNumber ?? 1;
        const conceptDueDate = firstInstallment?.dueDate ?? loan.creditStartDate;
        const key = `${line.glAccountId}:${loan.thirdPartyId}:${loan.id}:${conceptInstallmentNumber}`;
        const current = portfolioDelta.get(key) ?? {
          glAccountId: line.glAccountId,
          thirdPartyId: loan.thirdPartyId,
          loanId: loan.id,
          installmentNumber: conceptInstallmentNumber,
          dueDate: conceptDueDate,
          chargeAmount: 0,
          paymentAmount: 0,
        };
        current.chargeAmount = roundMoney(current.chargeAmount + amount);
        portfolioDelta.set(key, current);
      }
    }

    accountingEntriesPayload.push({
      processType: 'CREDIT',
      documentCode: args.documentCode,
      sequence,
      entryDate: args.entryDate,
      glAccountId: concept.glAccountId,
      costCenterId: loan.costCenterId ?? null,
      thirdPartyId: loan.thirdPartyId,
      description: `Liquidacion concepto ${concept.billingConceptId} credito ${loan.creditNumber}`.slice(
        0,
        255
      ),
      nature: 'CREDIT',
      amount: toDecimalString(conceptAmount),
      loanId: loan.id,
      installmentNumber: firstInstallment?.installmentNumber ?? 1,
      dueDate: firstInstallment?.dueDate ?? loan.creditStartDate,
      status: 'DRAFT',
      statusDate: args.entryDate,
      sourceType: args.sourceType,
      sourceId: args.sourceId,
    });
    sequence += 1;
  }

  if (!accountingEntriesPayload.length) {
    throwHttpError({
      status: 400,
      message: 'No se generaron movimientos para liquidar el credito',
      code: 'BAD_REQUEST',
    });
  }

  const debitTotal = roundMoney(
    accountingEntriesPayload
      .filter((item) => item.nature === 'DEBIT')
      .reduce((sum, item) => sum + toNumber(item.amount), 0)
  );
  const creditTotal = roundMoney(
    accountingEntriesPayload
      .filter((item) => item.nature === 'CREDIT')
      .reduce((sum, item) => sum + toNumber(item.amount), 0)
  );

  if (Math.abs(debitTotal - creditTotal) > 0.01) {
    throwHttpError({
      status: 400,
      message: 'Liquidacion descuadrada: debitos y creditos no coinciden',
      code: 'BAD_REQUEST',
    });
  }

  return {
    accountingEntriesPayload,
    portfolioDeltas: Array.from(portfolioDelta.values()).map((item) => ({
      glAccountId: item.glAccountId,
      thirdPartyId: item.thirdPartyId,
      loanId: item.loanId,
      installmentNumber: item.installmentNumber,
      dueDate: item.dueDate,
      chargeDelta: item.chargeAmount,
      paymentDelta: item.paymentAmount,
    })),
    disbursementAmount,
    nextSequence: sequence,
  };
}
