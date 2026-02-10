import { accountingEntries, db, loanPayments, loans, portfolioEntries } from '@/server/db';
import { throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { formatDateOnly, roundMoney, toDecimalString, toNumber } from '@/server/utils/value-utils';
import { and, asc, eq, gte, inArray, lt, lte, sql } from 'drizzle-orm';

type LoanStatementQuery = {
  from?: Date;
  to?: Date;
};

function getStatementSourceLabel(sourceType: (typeof accountingEntries.$inferSelect)['sourceType']): string {
  switch (sourceType) {
    case 'LOAN_APPROVAL':
      return 'Liquidacion';
    case 'LOAN_PAYMENT':
      return 'Abono';
    case 'LOAN_PAYMENT_VOID':
      return 'Anulacion abono';
    case 'PROCESS_RUN':
      return 'Proceso';
    case 'REFINANCE':
      return 'Refinanciacion';
    case 'MANUAL_ADJUSTMENT':
      return 'Ajuste manual';
    default:
      return sourceType;
  }
}

function getReceivableDelta(entry: {
  status: (typeof accountingEntries.$inferSelect)['status'];
  nature: (typeof accountingEntries.$inferSelect)['nature'];
  amount: string;
  glAccount?: { detailType: 'RECEIVABLE' | 'PAYABLE' | 'NONE' } | null;
}) {
  if (entry.status === 'VOIDED') return 0;
  if (entry.glAccount?.detailType !== 'RECEIVABLE') return 0;
  const amount = toNumber(entry.amount);
  if (amount <= 0) return 0;
  return entry.nature === 'DEBIT' ? amount : -amount;
}

export async function ensureLoanExists(loanId: number) {
  const loan = await db.query.loans.findFirst({
    where: eq(loans.id, loanId),
    columns: {
      id: true,
      creditNumber: true,
      status: true,
    },
  });

  if (!loan) {
    throwHttpError({
      status: 404,
      message: `Credito con ID ${loanId} no encontrado`,
      code: 'NOT_FOUND',
    });
  }

  return loan;
}

export async function getLoanBalanceSummary(loanId: number) {
  const today = formatDateOnly(new Date());
  const rows = await db.query.portfolioEntries.findMany({
    where: and(eq(portfolioEntries.loanId, loanId), sql`${portfolioEntries.status} <> 'VOID'`),
    with: {
      glAccount: true,
    },
    orderBy: [asc(portfolioEntries.dueDate), asc(portfolioEntries.installmentNumber)],
  });

  const byAccountMap = new Map<
    number,
    {
      glAccountId: number;
      glAccountCode: string | null;
      glAccountName: string | null;
      chargeAmount: number;
      paymentAmount: number;
      balance: number;
    }
  >();

  const openInstallments = new Set<number>();
  let totalCharged = 0;
  let totalPaid = 0;
  let currentBalance = 0;
  let overdueBalance = 0;
  let nextDueDate: string | null = null;

  for (const row of rows) {
    const chargeAmount = toNumber(row.chargeAmount);
    const paymentAmount = toNumber(row.paymentAmount);
    const balance = toNumber(row.balance);

    totalCharged = roundMoney(totalCharged + chargeAmount);
    totalPaid = roundMoney(totalPaid + paymentAmount);
    currentBalance = roundMoney(currentBalance + balance);

    if (balance > 0.01) {
      openInstallments.add(row.installmentNumber);
      if (row.dueDate < today) {
        overdueBalance = roundMoney(overdueBalance + balance);
      }
      if (!nextDueDate || row.dueDate < nextDueDate) {
        nextDueDate = row.dueDate;
      }
    }

    const current = byAccountMap.get(row.glAccountId) ?? {
      glAccountId: row.glAccountId,
      glAccountCode: row.glAccount?.code ?? null,
      glAccountName: row.glAccount?.name ?? null,
      chargeAmount: 0,
      paymentAmount: 0,
      balance: 0,
    };
    current.chargeAmount = roundMoney(current.chargeAmount + chargeAmount);
    current.paymentAmount = roundMoney(current.paymentAmount + paymentAmount);
    current.balance = roundMoney(current.balance + balance);
    byAccountMap.set(row.glAccountId, current);
  }

  const byAccount = Array.from(byAccountMap.values())
    .map((item) => ({
      glAccountId: item.glAccountId,
      glAccountCode: item.glAccountCode,
      glAccountName: item.glAccountName,
      chargeAmount: toDecimalString(item.chargeAmount),
      paymentAmount: toDecimalString(item.paymentAmount),
      balance: toDecimalString(item.balance),
    }))
    .sort((a, b) => toNumber(b.balance) - toNumber(a.balance));

  return {
    asOfDate: today,
    totalCharged: toDecimalString(totalCharged),
    totalPaid: toDecimalString(totalPaid),
    currentBalance: toDecimalString(currentBalance),
    overdueBalance: toDecimalString(overdueBalance),
    currentDueBalance: toDecimalString(roundMoney(currentBalance - overdueBalance)),
    openInstallments: openInstallments.size,
    nextDueDate,
    byAccount,
  };
}

export async function getLoanStatement(loanId: number, query: LoanStatementQuery) {
  const filters = [eq(accountingEntries.loanId, loanId)];
  const fromDate = query.from ? formatDateOnly(query.from) : undefined;
  const toDate = query.to ? formatDateOnly(query.to) : undefined;

  if (fromDate && toDate && fromDate > toDate) {
    throwHttpError({
      status: 400,
      message: 'Rango de fechas invalido en extracto',
      code: 'BAD_REQUEST',
    });
  }

  if (fromDate) {
    filters.push(gte(accountingEntries.entryDate, fromDate));
  }
  if (toDate) {
    filters.push(lte(accountingEntries.entryDate, toDate));
  }

  let openingBalance = 0;
  if (fromDate) {
    const openingEntries = await db.query.accountingEntries.findMany({
      where: and(eq(accountingEntries.loanId, loanId), lt(accountingEntries.entryDate, fromDate)),
      with: {
        glAccount: {
          columns: {
            detailType: true,
          },
        },
      },
      orderBy: [
        asc(accountingEntries.entryDate),
        asc(accountingEntries.documentCode),
        asc(accountingEntries.sequence),
        asc(accountingEntries.id),
      ],
    });

    openingBalance = openingEntries.reduce((acc, entry) => {
      return roundMoney(acc + getReceivableDelta(entry));
    }, 0);
  }

  const entries = await db.query.accountingEntries.findMany({
    where: and(...filters),
    with: {
      glAccount: {
        columns: {
          code: true,
          name: true,
          detailType: true,
        },
      },
    },
    orderBy: [
      asc(accountingEntries.entryDate),
      asc(accountingEntries.documentCode),
      asc(accountingEntries.sequence),
      asc(accountingEntries.id),
    ],
  });

  const paymentSourceIds = Array.from(
    new Set(
      entries
        .filter((entry) => entry.sourceType === 'LOAN_PAYMENT' || entry.sourceType === 'LOAN_PAYMENT_VOID')
        .map((entry) => Number(entry.sourceId))
        .filter((value) => Number.isFinite(value) && value > 0)
    )
  );

  const paymentsMap = new Map<number, { paymentNumber: string; paymentDate: string }>();
  if (paymentSourceIds.length) {
    const payments = await db.query.loanPayments.findMany({
      where: inArray(loanPayments.id, paymentSourceIds),
      columns: {
        id: true,
        paymentNumber: true,
        paymentDate: true,
      },
    });
    for (const payment of payments) {
      paymentsMap.set(payment.id, {
        paymentNumber: payment.paymentNumber,
        paymentDate: payment.paymentDate,
      });
    }
  }

  let runningBalance = openingBalance;
  const rows = entries.map((entry) => {
    const receivableDelta = getReceivableDelta(entry);
    runningBalance = roundMoney(runningBalance + receivableDelta);
    const paymentId = Number(entry.sourceId);
    const paymentRef = Number.isFinite(paymentId) ? paymentsMap.get(paymentId) : undefined;

    return {
      id: entry.id,
      entryDate: entry.entryDate,
      processType: entry.processType,
      documentCode: entry.documentCode,
      sequence: entry.sequence,
      sourceType: entry.sourceType,
      sourceLabel: getStatementSourceLabel(entry.sourceType),
      sourceId: entry.sourceId,
      relatedPaymentNumber: paymentRef?.paymentNumber ?? null,
      glAccountId: entry.glAccountId,
      glAccountCode: entry.glAccount?.code ?? null,
      glAccountName: entry.glAccount?.name ?? null,
      glAccountDetailType: entry.glAccount?.detailType ?? 'NONE',
      description: entry.description,
      nature: entry.nature,
      amount: entry.amount,
      receivableDelta: toDecimalString(receivableDelta),
      runningBalance: toDecimalString(runningBalance),
      installmentNumber: entry.installmentNumber,
      dueDate: entry.dueDate,
      status: entry.status,
    };
  });

  return {
    from: fromDate ?? null,
    to: toDate ?? null,
    openingBalance: toDecimalString(openingBalance),
    closingBalance: toDecimalString(runningBalance),
    entries: rows,
  };
}
