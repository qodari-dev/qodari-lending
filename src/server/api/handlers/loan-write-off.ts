import {
  accountingEntries,
  accountingPeriods,
  affiliationOffices,
  creditProductAccounts,
  creditProductChargeOffPolicies,
  creditProducts,
  db,
  glAccounts,
  loanApplications,
  loanPayments,
  loans,
  portfolioAgingSnapshots,
  portfolioProvisionSnapshotDetails,
  portfolioProvisionSnapshots,
  thirdParties,
} from '@/server/db';
import { genericTsRestErrorResponse, throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { buildWriteOffDocumentCode } from '@/server/utils/accounting-utils';
import { formatDateOnly, roundMoney } from '@/server/utils/value-utils';
import { getThirdPartyLabel } from '@/utils/third-party';
import { tsr } from '@ts-rest/serverless/next';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { and, desc, eq, inArray, lt, lte, or } from 'drizzle-orm';
import { z } from 'zod';
import { contract } from '../contracts';

import {
  ExecuteLoanWriteOffBodySchema,
  GenerateLoanWriteOffProposalBodySchema,
  LoanWriteOffProposalRow,
  ReviewLoanWriteOffProposalBodySchema,
} from '@/schemas/loan-write-off';

type GenerateLoanWriteOffProposalBody = z.infer<typeof GenerateLoanWriteOffProposalBodySchema>;
type ReviewLoanWriteOffProposalBody = z.infer<typeof ReviewLoanWriteOffProposalBodySchema>;
type ExecuteLoanWriteOffBody = z.infer<typeof ExecuteLoanWriteOffBodySchema>;

type PermissionRequest = Parameters<typeof getAuthContextAndValidatePermission>[0];
type PermissionMetadata = Parameters<typeof getAuthContextAndValidatePermission>[1];

type HandlerContext = {
  request: PermissionRequest;
  appRoute: { metadata: PermissionMetadata };
};

type CollectionReceivableCategory = 'CAPITAL' | 'INTEREST' | 'LATE_INTEREST' | 'OTHER';

type CollectionEntryRow = {
  loanId: number;
  glAccountId: number;
  installmentNumber: number | null;
  dueDate: string | null;
  nature: 'DEBIT' | 'CREDIT';
  amount: string;
};

type CollectionPosition = {
  category: CollectionReceivableCategory;
  dueDate: string | null;
  balance: number;
};

type CollectionLoanSummary = {
  overdueBalance: number;
  currentBalance: number;
  totalPortfolioAmount: number;
  totalPastDueDays: number;
};

type WriteOffCandidateSummary = {
  proposalId: string;
  cutoffDate: string;
  reviewedCredits: number;
  eligibleCredits: number;
  totalOutstandingBalance: number;
  totalProvisionAmount: number;
  totalEstimatedUncoveredAmount: number;
  totalRecommendedWriteOff: number;
  provisionSnapshotPeriodLabel: string | null;
  rows: LoanWriteOffProposalRow[];
};

type SelectedLoanRow = {
  id: number;
  creditNumber: string;
  thirdPartyId: number;
  costCenterId: number | null;
};

function parseDateOnly(value: string) {
  return parseISO(`${value}T00:00:00`);
}

function buildProposalId(cutoffDate: Date) {
  return `WO-${formatDateOnly(cutoffDate).replace(/-/g, '')}`;
}

function parseProposalId(proposalId: string) {
  const normalized = proposalId.trim().toUpperCase();
  const match = /^WO-(\d{4})(\d{2})(\d{2})$/.exec(normalized);
  if (!match) {
    throwHttpError({
      status: 400,
      code: 'BAD_REQUEST',
      message: 'El identificador de propuesta no tiene un formato válido',
    });
  }

  const [, year, month, day] = match;
  const cutoffDate = new Date(`${year}-${month}-${day}T00:00:00`);
  if (Number.isNaN(cutoffDate.getTime())) {
    throwHttpError({
      status: 400,
      code: 'BAD_REQUEST',
      message: 'La propuesta tiene una fecha de corte inválida',
    });
  }

  return {
    proposalId: normalized,
    cutoffDate,
  };
}

function resolveCollectionReceivableCategory(
  glAccountId: number,
  accounts: {
    capitalGlAccountId: number;
    interestGlAccountId: number;
    lateInterestGlAccountId: number;
  } | null
): CollectionReceivableCategory {
  if (!accounts) return 'OTHER';
  if (glAccountId === accounts.capitalGlAccountId) return 'CAPITAL';
  if (glAccountId === accounts.interestGlAccountId) return 'INTEREST';
  if (glAccountId === accounts.lateInterestGlAccountId) return 'LATE_INTEREST';
  return 'OTHER';
}

function buildCollectionPositions(args: {
  entryRows: CollectionEntryRow[];
  accountMap: {
    capitalGlAccountId: number;
    interestGlAccountId: number;
    lateInterestGlAccountId: number;
  } | null;
}) {
  const positions = new Map<
    string,
    {
      category: CollectionReceivableCategory;
      dueDate: string | null;
      chargeAmount: number;
      paymentAmount: number;
    }
  >();

  for (const entry of args.entryRows) {
    const category = resolveCollectionReceivableCategory(entry.glAccountId, args.accountMap);
    const amount = roundMoney(Number(entry.amount));
    const key = [
      category,
      entry.glAccountId,
      entry.installmentNumber ?? 0,
      entry.dueDate ?? '',
    ].join(':');
    const current = positions.get(key) ?? {
      category,
      dueDate: entry.dueDate,
      chargeAmount: 0,
      paymentAmount: 0,
    };

    if (entry.nature === 'DEBIT') {
      current.chargeAmount = roundMoney(current.chargeAmount + amount);
    } else {
      current.paymentAmount = roundMoney(current.paymentAmount + amount);
    }

    positions.set(key, current);
  }

  return [...positions.values()]
    .map((position) => ({
      category: position.category,
      dueDate: position.dueDate,
      balance: roundMoney(position.chargeAmount - position.paymentAmount),
    }))
    .filter((position): position is CollectionPosition => position.balance > 0.01);
}

function buildCollectionSummary(args: {
  cutoffDate: string;
  entryRows: CollectionEntryRow[];
  accountMap: {
    capitalGlAccountId: number;
    interestGlAccountId: number;
    lateInterestGlAccountId: number;
  } | null;
}) {
  const summary: CollectionLoanSummary = {
    overdueBalance: 0,
    currentBalance: 0,
    totalPortfolioAmount: 0,
    totalPastDueDays: 0,
  };

  const positions = buildCollectionPositions(args);

  for (const position of positions) {
    const isOverdue = !!position.dueDate && position.dueDate < args.cutoffDate;
    summary.totalPortfolioAmount = roundMoney(summary.totalPortfolioAmount + position.balance);

    if (isOverdue) {
      summary.overdueBalance = roundMoney(summary.overdueBalance + position.balance);
      if (position.dueDate) {
        summary.totalPastDueDays = Math.max(
          summary.totalPastDueDays,
          differenceInCalendarDays(parseDateOnly(args.cutoffDate), parseDateOnly(position.dueDate))
        );
      }
    } else {
      summary.currentBalance = roundMoney(summary.currentBalance + position.balance);
    }
  }

  return summary;
}

async function buildWriteOffCandidateSummary(cutoffDateInput: Date) {
  const cutoffDate = formatDateOnly(cutoffDateInput);
  const proposalId = buildProposalId(cutoffDateInput);
  const cutoffDateValue = parseDateOnly(cutoffDate);
  const cutoffYear = cutoffDateValue.getFullYear();
  const cutoffMonth = cutoffDateValue.getMonth() + 1;

  const candidateLoans = await db
    .select({
      id: loans.id,
      creditNumber: loans.creditNumber,
      thirdPartyDocumentNumber: thirdParties.documentNumber,
      thirdPartyPersonType: thirdParties.personType,
      thirdPartyBusinessName: thirdParties.businessName,
      thirdPartyFirstName: thirdParties.firstName,
      thirdPartySecondName: thirdParties.secondName,
      thirdPartyFirstLastName: thirdParties.firstLastName,
      thirdPartySecondLastName: thirdParties.secondLastName,
      creditProductId: creditProducts.id,
      creditProductName: creditProducts.name,
      affiliationOfficeName: affiliationOffices.name,
      hasLegalProcess: loans.hasLegalProcess,
      legalProcessDate: loans.legalProcessDate,
      creditStartDate: loans.creditStartDate,
      maturityDate: loans.maturityDate,
      minDaysPastDue: creditProductChargeOffPolicies.minDaysPastDue,
    })
    .from(loans)
    .innerJoin(loanApplications, eq(loans.loanApplicationId, loanApplications.id))
    .innerJoin(creditProducts, eq(loanApplications.creditProductId, creditProducts.id))
    .innerJoin(
      creditProductChargeOffPolicies,
      eq(creditProductChargeOffPolicies.creditProductId, creditProducts.id)
    )
    .innerJoin(thirdParties, eq(loans.thirdPartyId, thirdParties.id))
    .innerJoin(affiliationOffices, eq(loans.affiliationOfficeId, affiliationOffices.id))
    .where(
      and(
        eq(loans.status, 'ACCOUNTED'),
        eq(loans.disbursementStatus, 'DISBURSED'),
        eq(loans.isWrittenOff, false),
        eq(creditProductChargeOffPolicies.allowChargeOff, true)
      )
    );

  if (!candidateLoans.length) {
    return {
      proposalId,
      cutoffDate,
      reviewedCredits: 0,
      eligibleCredits: 0,
      totalOutstandingBalance: 0,
      totalProvisionAmount: 0,
      totalEstimatedUncoveredAmount: 0,
      totalRecommendedWriteOff: 0,
      provisionSnapshotPeriodLabel: null,
      rows: [],
    } satisfies WriteOffCandidateSummary;
  }

  const loanIds = candidateLoans.map((loan) => loan.id);
  const creditProductIds = Array.from(new Set(candidateLoans.map((loan) => loan.creditProductId)));

  const accountRows = await db
    .select({
      creditProductId: creditProductAccounts.creditProductId,
      capitalGlAccountId: creditProductAccounts.capitalGlAccountId,
      interestGlAccountId: creditProductAccounts.interestGlAccountId,
      lateInterestGlAccountId: creditProductAccounts.lateInterestGlAccountId,
    })
    .from(creditProductAccounts)
    .where(inArray(creditProductAccounts.creditProductId, creditProductIds));

  const accountMapByProductId = new Map<
    number,
    {
      capitalGlAccountId: number;
      interestGlAccountId: number;
      lateInterestGlAccountId: number;
    }
  >(
    accountRows.map((row) => [
      row.creditProductId,
      {
        capitalGlAccountId: row.capitalGlAccountId,
        interestGlAccountId: row.interestGlAccountId,
        lateInterestGlAccountId: row.lateInterestGlAccountId,
      },
    ])
  );

  const receivableEntries = await db
    .select({
      loanId: accountingEntries.loanId,
      glAccountId: accountingEntries.glAccountId,
      installmentNumber: accountingEntries.installmentNumber,
      dueDate: accountingEntries.dueDate,
      nature: accountingEntries.nature,
      amount: accountingEntries.amount,
    })
    .from(accountingEntries)
    .innerJoin(glAccounts, eq(accountingEntries.glAccountId, glAccounts.id))
    .where(
      and(
        inArray(accountingEntries.loanId, loanIds),
        eq(accountingEntries.status, 'ACCOUNTED'),
        lte(accountingEntries.entryDate, cutoffDate),
        eq(glAccounts.detailType, 'RECEIVABLE')
      )
    );

  const entriesByLoan = new Map<number, CollectionEntryRow[]>();
  for (const entry of receivableEntries) {
    if (!entry.loanId) continue;
    const current = entriesByLoan.get(entry.loanId) ?? [];
    current.push({
      loanId: entry.loanId,
      glAccountId: entry.glAccountId,
      installmentNumber: entry.installmentNumber,
      dueDate: entry.dueDate,
      nature: entry.nature,
      amount: entry.amount,
    });
    entriesByLoan.set(entry.loanId, current);
  }

  const paymentRows = await db
    .select({
      loanId: loanPayments.loanId,
      paymentDate: loanPayments.paymentDate,
    })
    .from(loanPayments)
    .where(
      and(
        inArray(loanPayments.loanId, loanIds),
        eq(loanPayments.status, 'PAID'),
        lte(loanPayments.paymentDate, cutoffDate)
      )
    )
    .orderBy(desc(loanPayments.paymentDate));

  const lastPaymentDateByLoan = new Map<number, string>();
  for (const row of paymentRows) {
    if (!lastPaymentDateByLoan.has(row.loanId)) {
      lastPaymentDateByLoan.set(row.loanId, row.paymentDate);
    }
  }

  const [latestProvisionSnapshot] = await db
    .select({
      id: portfolioProvisionSnapshots.id,
      year: accountingPeriods.year,
      month: accountingPeriods.month,
    })
    .from(portfolioProvisionSnapshots)
    .innerJoin(
      accountingPeriods,
      eq(portfolioProvisionSnapshots.accountingPeriodId, accountingPeriods.id)
    )
    .where(
      or(
        lt(accountingPeriods.year, cutoffYear),
        and(eq(accountingPeriods.year, cutoffYear), lte(accountingPeriods.month, cutoffMonth))
      )
    )
    .orderBy(
      desc(accountingPeriods.year),
      desc(accountingPeriods.month),
      desc(portfolioProvisionSnapshots.id)
    )
    .limit(1);

  const provisionAmountByLoan = new Map<number, number>();
  let provisionSnapshotPeriodLabel: string | null = null;

  if (latestProvisionSnapshot) {
    provisionSnapshotPeriodLabel = `${latestProvisionSnapshot.year}-${String(latestProvisionSnapshot.month).padStart(2, '0')}`;
    const provisionDetailRows = await db
      .select({
        loanId: portfolioAgingSnapshots.loanId,
        provisionAmount: portfolioProvisionSnapshotDetails.provisionAmount,
      })
      .from(portfolioProvisionSnapshotDetails)
      .innerJoin(
        portfolioAgingSnapshots,
        eq(portfolioProvisionSnapshotDetails.agingSnapshotId, portfolioAgingSnapshots.id)
      )
      .where(eq(portfolioProvisionSnapshotDetails.provisionSnapshotId, latestProvisionSnapshot.id));

    for (const row of provisionDetailRows) {
      provisionAmountByLoan.set(
        row.loanId,
        roundMoney((provisionAmountByLoan.get(row.loanId) ?? 0) + Number(row.provisionAmount))
      );
    }
  }

  let reviewedCredits = 0;
  let totalOutstandingBalance = 0;
  let totalProvisionAmount = 0;
  let totalEstimatedUncoveredAmount = 0;
  let totalRecommendedWriteOff = 0;

  const rows: LoanWriteOffProposalRow[] = [];

  for (const loan of candidateLoans) {
    const entryRows = entriesByLoan.get(loan.id) ?? [];
    if (!entryRows.length) continue;

    const summary = buildCollectionSummary({
      cutoffDate,
      entryRows,
      accountMap: accountMapByProductId.get(loan.creditProductId) ?? null,
    });

    if (summary.totalPortfolioAmount <= 0.01) continue;

    reviewedCredits += 1;

    if (summary.totalPastDueDays < loan.minDaysPastDue) {
      continue;
    }

    const outstandingBalance = roundMoney(summary.totalPortfolioAmount);
    const provisionAmount = roundMoney(
      Math.min(provisionAmountByLoan.get(loan.id) ?? 0, outstandingBalance)
    );
    const estimatedUncoveredAmount = roundMoney(Math.max(0, outstandingBalance - provisionAmount));
    const recommendedWriteOffAmount = outstandingBalance;

    totalOutstandingBalance = roundMoney(totalOutstandingBalance + outstandingBalance);
    totalProvisionAmount = roundMoney(totalProvisionAmount + provisionAmount);
    totalEstimatedUncoveredAmount = roundMoney(
      totalEstimatedUncoveredAmount + estimatedUncoveredAmount
    );
    totalRecommendedWriteOff = roundMoney(totalRecommendedWriteOff + recommendedWriteOffAmount);

    rows.push({
      creditNumber: loan.creditNumber,
      thirdPartyDocumentNumber: loan.thirdPartyDocumentNumber,
      thirdPartyName: getThirdPartyLabel({
        personType: loan.thirdPartyPersonType,
        businessName: loan.thirdPartyBusinessName,
        firstName: loan.thirdPartyFirstName,
        secondName: loan.thirdPartySecondName,
        firstLastName: loan.thirdPartyFirstLastName,
        secondLastName: loan.thirdPartySecondLastName,
        documentNumber: loan.thirdPartyDocumentNumber,
      }),
      creditProductName: loan.creditProductName,
      affiliationOfficeName: loan.affiliationOfficeName,
      daysPastDue: summary.totalPastDueDays,
      minDaysPastDue: loan.minDaysPastDue,
      outstandingBalance,
      overdueBalance: roundMoney(summary.overdueBalance),
      currentBalance: roundMoney(summary.currentBalance),
      provisionAmount,
      estimatedUncoveredAmount,
      hasLegalProcess: loan.hasLegalProcess,
      legalProcessDate: loan.legalProcessDate,
      lastPaymentDate: lastPaymentDateByLoan.get(loan.id) ?? null,
      creditStartDate: loan.creditStartDate,
      maturityDate: loan.maturityDate,
      recommendedWriteOffAmount,
    });
  }

  rows.sort((left, right) => {
    if (right.daysPastDue !== left.daysPastDue) {
      return right.daysPastDue - left.daysPastDue;
    }
    if (right.outstandingBalance !== left.outstandingBalance) {
      return right.outstandingBalance - left.outstandingBalance;
    }
    if (left.creditStartDate !== right.creditStartDate) {
      return left.creditStartDate.localeCompare(right.creditStartDate);
    }
    return left.creditNumber.localeCompare(right.creditNumber);
  });

  return {
    proposalId,
    cutoffDate,
    reviewedCredits,
    eligibleCredits: rows.length,
    totalOutstandingBalance,
    totalProvisionAmount,
    totalEstimatedUncoveredAmount,
    totalRecommendedWriteOff,
    provisionSnapshotPeriodLabel,
    rows,
  } satisfies WriteOffCandidateSummary;
}

async function generateProposal(body: GenerateLoanWriteOffProposalBody, context: HandlerContext) {
  const { request, appRoute } = context;

  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);

    const summary = await buildWriteOffCandidateSummary(body.cutoffDate);

    return {
      status: 200 as const,
      body: {
        proposalId: summary.proposalId,
        cutoffDate: summary.cutoffDate,
        reviewedCredits: summary.reviewedCredits,
        eligibleCredits: summary.eligibleCredits,
        totalOutstandingBalance: summary.totalOutstandingBalance,
        totalProvisionAmount: summary.totalProvisionAmount,
        totalEstimatedUncoveredAmount: summary.totalEstimatedUncoveredAmount,
        totalRecommendedWriteOff: summary.totalRecommendedWriteOff,
        provisionSnapshotPeriodLabel: summary.provisionSnapshotPeriodLabel,
        message:
          summary.eligibleCredits > 0
            ? 'Propuesta calculada con cartera real al corte. Prioridad: mayor mora, mayor saldo y crédito más antiguo.'
            : 'No se encontraron créditos elegibles para castigo con la fecha de corte seleccionada.',
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al generar propuesta de castiga cartera',
    });
  }
}

async function reviewProposal(body: ReviewLoanWriteOffProposalBody, context: HandlerContext) {
  const { request, appRoute } = context;

  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);

    const { proposalId, cutoffDate } = parseProposalId(body.proposalId);
    const summary = await buildWriteOffCandidateSummary(cutoffDate);

    return {
      status: 200 as const,
      body: {
        proposalId,
        cutoffDate: summary.cutoffDate,
        reviewedCredits: summary.reviewedCredits,
        eligibleCredits: summary.eligibleCredits,
        totalOutstandingBalance: summary.totalOutstandingBalance,
        totalProvisionAmount: summary.totalProvisionAmount,
        totalEstimatedUncoveredAmount: summary.totalEstimatedUncoveredAmount,
        totalRecommendedWriteOff: summary.totalRecommendedWriteOff,
        provisionSnapshotPeriodLabel: summary.provisionSnapshotPeriodLabel,
        rows: summary.rows,
        message:
          'Detalle recalculado en línea con datos reales. La ejecución queda pendiente hasta definir auxiliares y asientos de castigo.',
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al revisar propuesta de castiga cartera',
    });
  }
}

async function execute(body: ExecuteLoanWriteOffBody, context: HandlerContext) {
  const { request, appRoute } = context;

  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);
    const { proposalId, cutoffDate } = parseProposalId(body.proposalId);
    const movementDate = formatDateOnly(body.movementDate);
    const summary = await buildWriteOffCandidateSummary(cutoffDate);
    const selectedCreditNumbers = new Set(
      body.selectedCreditNumbers.map((creditNumber) => creditNumber.trim().toUpperCase())
    );
    const selectedRows = summary.rows.filter((row) =>
      selectedCreditNumbers.has(row.creditNumber.toUpperCase())
    );

    if (!selectedRows.length) {
      throwHttpError({
        status: 400,
        code: 'BAD_REQUEST',
        message: 'No hay créditos elegibles seleccionados para ejecutar castigo',
      });
    }

    const missingSelectedCredits = body.selectedCreditNumbers.filter(
      (creditNumber) =>
        !summary.rows.some(
          (row) => row.creditNumber.toUpperCase() === creditNumber.trim().toUpperCase()
        )
    );

    if (missingSelectedCredits.length) {
      throwHttpError({
        status: 409,
        code: 'CONFLICT',
        message: `Algunos créditos ya no están elegibles para castigo: ${missingSelectedCredits.join(', ')}`,
      });
    }

    const settings = await db.query.creditsSettings.findFirst({
      columns: {
        appSlug: true,
        portfolioProvisionGlAccountId: true,
        writeOffGlAccountId: true,
        writeOffExpenseGlAccountId: true,
      },
    });

    if (
      !settings?.portfolioProvisionGlAccountId ||
      !settings.writeOffGlAccountId ||
      !settings.writeOffExpenseGlAccountId
    ) {
      throwHttpError({
        status: 400,
        code: 'BAD_REQUEST',
        message:
          'Debe configurar Cuenta Provisión Cartera, Cuenta Castigo Cartera y Cuenta Gasto Castigo antes de ejecutar.',
      });
    }

    const portfolioProvisionGlAccountId = settings.portfolioProvisionGlAccountId;
    const writeOffGlAccountId = settings.writeOffGlAccountId;
    const writeOffExpenseGlAccountId = settings.writeOffExpenseGlAccountId;

    const selectedLoanRows = await db
      .select({
        id: loans.id,
        creditNumber: loans.creditNumber,
        thirdPartyId: loans.thirdPartyId,
        costCenterId: loans.costCenterId,
      })
      .from(loans)
      .where(
        and(
          inArray(
            loans.creditNumber,
            selectedRows.map((row) => row.creditNumber)
          ),
          eq(loans.isWrittenOff, false)
        )
      );

    const loanByCreditNumber = new Map<string, SelectedLoanRow>(
      selectedLoanRows.map((row) => [row.creditNumber.toUpperCase(), row])
    );

    const totalWrittenOffAmount = roundMoney(
      selectedRows.reduce((acc, row) => acc + row.recommendedWriteOffAmount, 0)
    );

    await db.transaction(async (tx) => {
      for (const row of selectedRows) {
        const loan = loanByCreditNumber.get(row.creditNumber.toUpperCase());
        if (!loan) {
          throwHttpError({
            status: 409,
            code: 'CONFLICT',
            message: `El crédito ${row.creditNumber} ya no está disponible para castigo`,
          });
        }

        const documentCode = buildWriteOffDocumentCode(loan.id);
        const coveredByProvision = roundMoney(
          Math.min(row.recommendedWriteOffAmount, row.provisionAmount)
        );
        const uncoveredAmount = roundMoney(
          Math.max(0, row.recommendedWriteOffAmount - coveredByProvision)
        );
        let sequence = 1;

        const entryValues: Array<typeof accountingEntries.$inferInsert> = [];

        if (coveredByProvision > 0.01) {
          entryValues.push({
            processType: 'WRITE_OFF',
            documentCode,
            sequence,
            entryDate: movementDate,
            glAccountId: portfolioProvisionGlAccountId,
            costCenterId: loan.costCenterId,
            thirdPartyId: loan.thirdPartyId,
            description: `Castigo cartera ${row.creditNumber} - aplicación provisión`,
            nature: 'DEBIT',
            amount: String(coveredByProvision),
            loanId: loan.id,
            status: 'DRAFT',
            sourceType: 'MANUAL_ADJUSTMENT',
            sourceId: `WRITE_OFF:${loan.id}`,
          });
          sequence += 1;
        }

        if (uncoveredAmount > 0.01) {
          entryValues.push({
            processType: 'WRITE_OFF',
            documentCode,
            sequence,
            entryDate: movementDate,
            glAccountId: writeOffExpenseGlAccountId,
            costCenterId: loan.costCenterId,
            thirdPartyId: loan.thirdPartyId,
            description: `Castigo cartera ${row.creditNumber} - gasto no cubierto`,
            nature: 'DEBIT',
            amount: String(uncoveredAmount),
            loanId: loan.id,
            status: 'DRAFT',
            sourceType: 'MANUAL_ADJUSTMENT',
            sourceId: `WRITE_OFF:${loan.id}`,
          });
          sequence += 1;
        }

        entryValues.push({
          processType: 'WRITE_OFF',
          documentCode,
          sequence,
          entryDate: movementDate,
          glAccountId: writeOffGlAccountId,
          costCenterId: loan.costCenterId,
          thirdPartyId: loan.thirdPartyId,
          description: `Castigo cartera ${row.creditNumber}`,
          nature: 'CREDIT',
          amount: String(row.recommendedWriteOffAmount),
          loanId: loan.id,
          status: 'DRAFT',
          sourceType: 'MANUAL_ADJUSTMENT',
          sourceId: `WRITE_OFF:${loan.id}`,
        });

        await tx.insert(accountingEntries).values(entryValues);

        await tx
          .update(loans)
          .set({
            isWrittenOff: true,
            writtenOffDate: movementDate,
            isInterestWrittenOff: true,
            interestWriteOffDocument: documentCode,
          })
          .where(and(eq(loans.id, loan.id), eq(loans.isWrittenOff, false)));
      }
    });

    return {
      status: 200 as const,
      body: {
        proposalId,
        executedCredits: selectedRows.length,
        totalWrittenOffAmount,
        movementDate,
        message:
          'Castigo ejecutado. Se generaron movimientos contables en DRAFT y los créditos quedaron marcados como castigados.',
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al ejecutar castiga cartera',
    });
  }
}

export const loanWriteOff = tsr.router(contract.loanWriteOff, {
  generateProposal: ({ body }, context) => generateProposal(body, context),
  reviewProposal: ({ body }, context) => reviewProposal(body, context),
  execute: ({ body }, context) => execute(body, context),
});
