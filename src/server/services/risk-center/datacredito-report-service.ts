import { accountingEntries, db, glAccounts, loanInstallments, loanPayments, loans } from '@/server/db';
import { roundMoney, toNumber } from '@/server/utils/value-utils';
import { and, eq, inArray, lte, sql } from 'drizzle-orm';
import { differenceInCalendarDays, parseISO } from 'date-fns';

type GenerateDatacreditoReportArgs = {
  creditCutoffDate: Date;
  paymentCutoffDate: Date;
};

export type RiskCenterLoanItem = {
  loanId: number;
  wasReported: boolean;
  reportedStatus: string;
  daysPastDue: number;
  currentBalance: number;
  overdueBalance: number;
  reportedThirdPartiesCount: number;
  note?: string | null;
  metadata?: Record<string, unknown> | null;
};

type DatacreditoParty = {
  documentNumber: string;
  businessName: string | null;
  firstName: string | null;
  secondName: string | null;
  firstLastName: string | null;
  secondLastName: string | null;
  homeAddress: string | null;
  workAddress: string | null;
  homePhone: string | null;
  workPhone: string | null;
  mobilePhone: string | null;
  email: string | null;
  identificationType?: { code: string | null; name: string | null } | null;
  homeCity?: { code: string; name: string } | null;
  workCity?: { code: string; name: string } | null;
};

type LoanMetrics = {
  currentBalance: number;
  overdueBalance: number;
  overdueInstallments: number;
  openInstallments: number;
  oldestOverdueDays: number;
};

function formatDbDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function formatLegacyDate(value: string | null | undefined) {
  if (!value) return '00000000';
  return value.replaceAll('-', '');
}

function padLeft(value: string | number, size: number, char = '0') {
  return String(value).slice(0, size).padStart(size, char);
}

function padRight(value: string | number | null | undefined, size: number, char = ' ') {
  const normalized = String(value ?? '').replace(/\r?\n/g, ' ').trim();
  return normalized.slice(0, size).padEnd(size, char);
}

function getThirdPartyName(thirdParty: DatacreditoParty) {
  if (thirdParty.businessName) return thirdParty.businessName;

  return [
    thirdParty.firstLastName,
    thirdParty.secondLastName,
    thirdParty.firstName,
    thirdParty.secondName,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();
}

function getIdentificationCode(source: DatacreditoParty) {
  const code = (source.identificationType?.code ?? source.identificationType?.name ?? '').toUpperCase();
  if (code.includes('NIT')) return '02';
  if (code.includes('CE') || code.includes('EXTRANJ')) return '03';
  if (code.includes('TI')) return '04';
  if (code.includes('PA')) return '05';
  return '01';
}

function getCityName(source: DatacreditoParty) {
  return source.homeCity?.name ?? source.workCity?.name ?? '';
}

function getAddress(source: DatacreditoParty) {
  return source.homeAddress ?? source.workAddress ?? '';
}

function getPhone(source: DatacreditoParty) {
  return source.mobilePhone ?? source.homePhone ?? source.workPhone ?? '';
}

function shouldIncludePaidLoan(loan: {
  status: (typeof loans.$inferSelect)['status'];
  isReportedToRiskCenter: boolean;
  riskCenterReportDate: string | null;
  lastPaymentDate: string | null;
}) {
  if (loan.status !== 'PAID') return true;
  if (!loan.isReportedToRiskCenter) return true;
  if (!loan.riskCenterReportDate) return true;
  if (!loan.lastPaymentDate) return false;
  return loan.riskCenterReportDate < loan.lastPaymentDate;
}

function buildMetricsMap(
  entryRows: Array<{
    loanId: number | null;
    installmentNumber: number | null;
    dueDate: string | null;
    nature: 'DEBIT' | 'CREDIT';
    amount: string;
  }>,
  paymentCutoffDate: string
) {
  const grouped = new Map<number, Map<number, { dueDate: string | null; balance: number }>>();

  for (const row of entryRows) {
    if (!row.loanId || row.installmentNumber === null) continue;
    const loanMap = grouped.get(row.loanId) ?? new Map<number, { dueDate: string | null; balance: number }>();
    const current = loanMap.get(row.installmentNumber) ?? { dueDate: row.dueDate, balance: 0 };
    const delta = row.nature === 'DEBIT' ? toNumber(row.amount) : -toNumber(row.amount);
    current.balance = roundMoney(current.balance + delta);
    current.dueDate = row.dueDate ?? current.dueDate;
    loanMap.set(row.installmentNumber, current);
    grouped.set(row.loanId, loanMap);
  }

  const result = new Map<number, LoanMetrics>();

  for (const [loanId, installmentMap] of grouped.entries()) {
    const installments = Array.from(installmentMap.values());
    const overdue = installments.filter(
      (item) => item.balance > 0.01 && !!item.dueDate && item.dueDate < paymentCutoffDate
    );
    const oldestOverdueDays = overdue.length
      ? Math.max(
          ...overdue.map((item) =>
            differenceInCalendarDays(parseISO(paymentCutoffDate), parseISO(item.dueDate as string))
          )
        )
      : 0;

    result.set(loanId, {
      currentBalance: installments.reduce((acc, item) => roundMoney(acc + item.balance), 0),
      overdueBalance: overdue.reduce((acc, item) => roundMoney(acc + item.balance), 0),
      overdueInstallments: overdue.length,
      openInstallments: installments.filter((item) => item.balance > 0.01).length,
      oldestOverdueDays,
    });
  }

  return result;
}

function buildDatacreditoLine(args: {
  person: DatacreditoParty;
  loan: {
    creditNumber: string;
    creditStartDate: string;
    maturityDate: string;
    statusDate: string;
    principalAmount: string;
    installments: number;
    status: (typeof loans.$inferSelect)['status'];
    isWrittenOff: boolean;
    hasRefinancingOrigin: boolean;
  };
  responsibilityCode: '00' | '01';
  metrics: LoanMetrics;
  quotaValue: number;
  latestPaymentDate: string | null;
  paymentCutoffDate: string;
}) {
  let holderSituation = '0';
  let paymentForm = '0';
  let creditNovelty = '01';
  let accountState = '01';
  let daysPastDue = Math.min(args.metrics.oldestOverdueDays, 999);
  let overdueBalance = args.metrics.overdueBalance;
  let cancelledInstallments = Math.max(0, args.loan.installments - args.metrics.openInstallments);
  let overdueInstallments = args.metrics.overdueInstallments;

  if (args.metrics.currentBalance <= 0.01) {
    holderSituation = '3';
    paymentForm = '1';
    creditNovelty = '05';
    accountState = '03';
    daysPastDue = 0;
    overdueBalance = 0;
    cancelledInstallments = args.loan.installments;
    overdueInstallments = 0;
  } else if (daysPastDue >= 360) {
    creditNovelty = '12';
    accountState = '05';
  } else if (daysPastDue >= 120) {
    creditNovelty = '09';
    accountState = '02';
  } else if (daysPastDue >= 90) {
    creditNovelty = '08';
    accountState = '02';
  } else if (daysPastDue >= 60) {
    creditNovelty = '07';
    accountState = '02';
  } else if (daysPastDue >= 30) {
    creditNovelty = '06';
    accountState = '02';
  }

  if (args.loan.isWrittenOff) {
    creditNovelty = '13';
    accountState = '06';
  }

  if (args.loan.status === 'REFINANCED') {
    paymentForm = '4';
    accountState = '12';
  }

  const originState = args.loan.hasRefinancingOrigin ? '1' : '0';
  const cityName = getCityName(args.person);
  const name = getThirdPartyName(args.person);
  const rawAvailable = roundMoney(toNumber(args.loan.principalAmount) - args.metrics.currentBalance);

  const parts = [
    getIdentificationCode(args.person),
    padLeft(args.person.documentNumber, 11),
    padRight(name, 45),
    padLeft(args.loan.creditNumber, 18),
    formatLegacyDate(args.loan.creditStartDate),
    formatLegacyDate(args.loan.maturityDate),
    args.responsibilityCode,
    creditNovelty,
    originState,
    padLeft(Math.round(toNumber(args.loan.principalAmount)), 11),
    padLeft(Math.round(args.metrics.currentBalance), 11),
    padLeft(Math.max(0, Math.round(rawAvailable)), 11),
    padLeft(Math.round(args.quotaValue), 11),
    padLeft(Math.round(overdueBalance), 11),
    padLeft(args.loan.installments, 3),
    padLeft(cancelledInstallments, 3),
    padLeft(overdueInstallments, 3),
    formatLegacyDate(formatDbDate(new Date(args.paymentCutoffDate))),
    formatLegacyDate(args.latestPaymentDate),
    padRight(cityName, 20),
    padRight(getAddress(args.person), 60),
    padRight((args.person.email ?? '').toLowerCase(), 60),
    padRight(getPhone(args.person), 20),
    holderSituation,
    padLeft(daysPastDue, 3),
    paymentForm,
    formatLegacyDate(args.loan.statusDate),
    accountState,
    formatLegacyDate(args.paymentCutoffDate),
    '0',
    formatLegacyDate(args.paymentCutoffDate),
    '000',
    '00000000',
  ];

  return parts.join('');
}

export async function generateDatacreditoReport(args: GenerateDatacreditoReportArgs) {
  const creditCutoffDate = formatDbDate(args.creditCutoffDate);
  const paymentCutoffDate = formatDbDate(args.paymentCutoffDate);

  const candidateLoans = await db.query.loans.findMany({
    where: and(
      lte(loans.creditStartDate, creditCutoffDate),
      inArray(loans.status, ['ACCOUNTED', 'REFINANCED', 'PAID']),
      eq(loans.disbursementStatus, 'DISBURSED')
    ),
    with: {
      borrower: {
        with: {
          identificationType: true,
          homeCity: true,
          workCity: true,
        },
      },
      loanApplication: {
        with: {
          creditProduct: true,
          loanApplicationCoDebtors: {
            with: {
              thirdParty: {
                with: {
                  identificationType: true,
                  homeCity: true,
                  workCity: true,
                },
              },
            },
          },
        },
      },
      loanRefinancingLinksRefinanced: true,
    },
    orderBy: (fields, operators) => [operators.asc(fields.creditNumber)],
  });

  const reviewedBase = candidateLoans.filter(
    (loan) => loan.loanApplication?.creditProduct?.reportsToCreditBureau === true
  );
  const reviewedCredits = reviewedBase.length;
  const reportableLoans = reviewedBase.filter((loan) =>
    shouldIncludePaidLoan({
      status: loan.status,
      isReportedToRiskCenter: loan.isReportedToRiskCenter,
      riskCenterReportDate: loan.riskCenterReportDate,
      lastPaymentDate: loan.lastPaymentDate,
    })
  );

  const loanIds = reportableLoans.map((loan) => loan.id);

  if (!loanIds.length) {
    return {
      reviewedCredits,
      reportedCredits: 0,
      items: [] as RiskCenterLoanItem[],
      fileContent: '',
    };
  }

  const [receivableEntryRows, installmentRows, paymentRows] = await Promise.all([
    db
      .select({
        loanId: accountingEntries.loanId,
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
          lte(accountingEntries.entryDate, paymentCutoffDate),
          eq(glAccounts.detailType, 'RECEIVABLE')
        )
      ),
    db
      .select({
        loanId: loanInstallments.loanId,
        installmentNumber: loanInstallments.installmentNumber,
        dueDate: loanInstallments.dueDate,
        principalAmount: loanInstallments.principalAmount,
        interestAmount: loanInstallments.interestAmount,
      })
      .from(loanInstallments)
      .where(and(inArray(loanInstallments.loanId, loanIds), sql`${loanInstallments.status} <> 'VOID'`)),
    db
      .select({
        loanId: loanPayments.loanId,
        lastPaymentDate: sql<string>`max(${loanPayments.paymentDate})`,
      })
      .from(loanPayments)
      .where(and(inArray(loanPayments.loanId, loanIds), lte(loanPayments.paymentDate, paymentCutoffDate)))
      .groupBy(loanPayments.loanId),
  ]);

  const metricsByLoan = buildMetricsMap(receivableEntryRows, paymentCutoffDate);
  const paymentDateByLoan = new Map(paymentRows.map((row) => [row.loanId, row.lastPaymentDate ?? null]));
  const installmentsByLoan = new Map<
    number,
    Array<{
      installmentNumber: number;
      dueDate: string;
      principalAmount: string;
      interestAmount: string;
    }>
  >();

  for (const row of installmentRows) {
    const list = installmentsByLoan.get(row.loanId) ?? [];
    list.push(row);
    installmentsByLoan.set(row.loanId, list);
  }

  const lines: string[] = [];
  const items: RiskCenterLoanItem[] = [];

  for (const loan of reviewedBase) {
    const metrics = metricsByLoan.get(loan.id) ?? {
      currentBalance: 0,
      overdueBalance: 0,
      overdueInstallments: 0,
      openInstallments: 0,
      oldestOverdueDays: 0,
    };
    const installmentList = (installmentsByLoan.get(loan.id) ?? []).sort(
      (a, b) => a.installmentNumber - b.installmentNumber
    );
    const regularInstallment =
      installmentList.find((item) => item.installmentNumber === 2) ??
      installmentList.find((item) => item.installmentNumber === 1) ??
      null;
    const quotaValue = regularInstallment
      ? roundMoney(toNumber(regularInstallment.principalAmount) + toNumber(regularInstallment.interestAmount))
      : 0;
    const latestDueInMonth =
      installmentList
        .filter((item) => item.dueDate.slice(0, 7) === paymentCutoffDate.slice(0, 7))
        .map((item) => item.dueDate)
        .sort((a, b) => a.localeCompare(b))
        .at(-1) ?? loan.maturityDate;
    const wasReported = reportableLoans.some((item) => item.id === loan.id);
    const reportedThirdPartiesCount = 1 + (loan.loanApplication?.loanApplicationCoDebtors?.length ?? 0);

    const loanBase = {
      creditNumber: loan.creditNumber,
      creditStartDate: loan.creditStartDate,
      maturityDate: latestDueInMonth,
      statusDate: loan.statusDate,
      principalAmount: loan.principalAmount,
      installments: loan.installments,
      status: loan.status,
      isWrittenOff: loan.isWrittenOff,
      hasRefinancingOrigin: (loan.loanRefinancingLinksRefinanced?.length ?? 0) > 0,
    };

    items.push({
      loanId: loan.id,
      wasReported,
      reportedStatus:
        metrics.currentBalance <= 0.01
          ? 'PAID'
          : loan.isWrittenOff
            ? 'WRITTEN_OFF'
            : metrics.oldestOverdueDays >= 360
              ? 'DOUBTFUL'
              : metrics.overdueInstallments > 0
                ? 'OVERDUE'
                : 'CURRENT',
      daysPastDue: metrics.oldestOverdueDays,
      currentBalance: metrics.currentBalance,
      overdueBalance: metrics.overdueBalance,
      reportedThirdPartiesCount,
      metadata: {
        overdueInstallments: metrics.overdueInstallments,
        openInstallments: metrics.openInstallments,
        quotaValue,
      },
    });

    if (!wasReported) continue;

    lines.push(
      buildDatacreditoLine({
        person: loan.borrower,
        loan: loanBase,
        responsibilityCode: '00',
        metrics,
        quotaValue,
        latestPaymentDate: paymentDateByLoan.get(loan.id) ?? loan.lastPaymentDate ?? null,
        paymentCutoffDate,
      })
    );

    for (const item of loan.loanApplication?.loanApplicationCoDebtors ?? []) {
      if (!item.thirdParty) continue;
      lines.push(
        buildDatacreditoLine({
          person: item.thirdParty,
          loan: loanBase,
          responsibilityCode: '01',
          metrics,
          quotaValue,
          latestPaymentDate: paymentDateByLoan.get(loan.id) ?? loan.lastPaymentDate ?? null,
          paymentCutoffDate,
        })
      );
    }
  }

  return {
    reviewedCredits,
    reportedCredits: reportableLoans.length,
    items,
    fileContent: lines.join('\r\n'),
  };
}
