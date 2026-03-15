import {
  GenerateCreditBalanceCertificateBodySchema,
  GenerateCreditsForCollectionBodySchema,
  GenerateCurrentPortfolioBodySchema,
  GenerateHistoricalPortfolioByPeriodBodySchema,
  GeneratePortfolioIndicatorsBodySchema,
  GeneratePayrollPortfolioByAgreementBodySchema,
  GeneratePortfolioByCreditTypeBodySchema,
  GenerateThirdPartyBalanceCertificateBodySchema,
} from '@/schemas/portfolio-report';
import {
  accountingPeriods,
  accountingEntries,
  agingBuckets,
  agingProfiles,
  agreements,
  affiliationOffices,
  creditProducts,
  db,
  glAccounts,
  loanApplications,
  loanInstallments,
  loanPayments,
  loans,
  portfolioAgingSnapshots,
  portfolioEntries,
  portfolioProvisionSnapshotDetails,
  portfolioProvisionSnapshots,
  thirdParties,
} from '@/server/db';
import { renderTemplateToBase64 } from '@/server/pdf/render';
import { creditBalanceCertificateTemplate } from '@/server/pdf/templates/credit-balance-certificate';
import { thirdPartyBalanceCertificateTemplate } from '@/server/pdf/templates/third-party-balance-certificate';
import { categoryCodeLabels } from '@/schemas/category';
import { genericTsRestErrorResponse, throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { buildCreditBalanceCertificateData } from '@/server/utils/credit-balance-certificate-data';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { buildThirdPartyBalanceCertificateData } from '@/server/utils/third-party-balance-certificate-data';
import { formatDateOnly, roundMoney } from '@/server/utils/value-utils';
import { getThirdPartyLabel } from '@/utils/third-party';
import { tsr } from '@ts-rest/serverless/next';
import { differenceInCalendarDays, parseISO, startOfYear } from 'date-fns';
import { and, asc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { contract } from '../contracts';

type GenerateCurrentPortfolioBody = z.infer<typeof GenerateCurrentPortfolioBodySchema>;
type GenerateHistoricalPortfolioByPeriodBody = z.infer<
  typeof GenerateHistoricalPortfolioByPeriodBodySchema
>;
type GenerateCreditsForCollectionBody = z.infer<typeof GenerateCreditsForCollectionBodySchema>;
type GeneratePayrollPortfolioByAgreementBody = z.infer<
  typeof GeneratePayrollPortfolioByAgreementBodySchema
>;
type GeneratePortfolioByCreditTypeBody = z.infer<typeof GeneratePortfolioByCreditTypeBodySchema>;
type GeneratePortfolioIndicatorsBody = z.infer<typeof GeneratePortfolioIndicatorsBodySchema>;
type GenerateCreditBalanceCertificateBody = z.infer<
  typeof GenerateCreditBalanceCertificateBodySchema
>;
type GenerateThirdPartyBalanceCertificateBody = z.infer<
  typeof GenerateThirdPartyBalanceCertificateBodySchema
>;

type PermissionRequest = Parameters<typeof getAuthContextAndValidatePermission>[0];
type PermissionMetadata = Parameters<typeof getAuthContextAndValidatePermission>[1];

type HandlerContext = {
  request: PermissionRequest;
  appRoute: { metadata: PermissionMetadata };
};

type CurrentPortfolioBucket = {
  id: number;
  name: string;
  daysFrom: number;
  daysTo: number | null;
};

type CurrentPortfolioRawRow = {
  loanId: number;
  creditNumber: string;
  loanStatus: string;
  thirdPartyDocumentNumber: string;
  thirdPartyPersonType: 'NATURAL' | 'LEGAL';
  thirdPartyBusinessName: string | null;
  thirdPartyFirstName: string | null;
  thirdPartySecondName: string | null;
  thirdPartyFirstLastName: string | null;
  thirdPartySecondLastName: string | null;
  agreementName: string | null;
  creditProductName: string;
  glAccountId: number;
  glAccountCode: string;
  glAccountName: string;
  dueDate: string;
  balance: string;
};

type CurrentPortfolioAccumulator = {
  rowKey: string;
  groupBy: 'CREDIT' | 'GL_ACCOUNT';
  creditNumber: string | null;
  thirdPartyDocumentNumber: string | null;
  thirdPartyName: string | null;
  agreementName: string | null;
  creditProductName: string | null;
  auxiliaryCode: string | null;
  auxiliaryName: string | null;
  status: string | null;
  reviewedCreditsCount: number | null;
  installmentValue: number;
  outstandingBalance: number;
  overdueBalance: number;
  maxDaysPastDue: number;
  bucketBalances: Record<string, number>;
  note: string | null;
  creditIds: Set<number>;
};

type HistoricalPortfolioRawRow = {
  agingSnapshotId: number;
  loanId: number;
  creditNumber: string;
  thirdPartyDocumentNumber: string;
  thirdPartyPersonType: 'NATURAL' | 'LEGAL';
  thirdPartyBusinessName: string | null;
  thirdPartyFirstName: string | null;
  thirdPartySecondName: string | null;
  thirdPartyFirstLastName: string | null;
  thirdPartySecondLastName: string | null;
  agreementName: string | null;
  creditProductName: string;
  auxiliaryCode: string;
  auxiliaryName: string;
  daysPastDue: number;
  installmentValue: string;
  currentAmount: string;
  totalPastDue: string;
  totalPortfolio: string;
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
  paidCapitalAmount: number;
  paidCurrentInterestAmount: number;
  paidLateInterestAmount: number;
  totalPaidAmount: number;
  overdueCapitalAmount: number;
  overdueCurrentInterestAmount: number;
  overdueLateInterestAmount: number;
  totalOverdueAmount: number;
  totalPastDueDays: number;
  currentCapitalAmount: number;
  currentCurrentInterestAmount: number;
  totalCurrentAmount: number;
  totalPortfolioAmount: number;
  otherOverdueAmount: number;
  otherCurrentAmount: number;
};

function parseDateOnly(value: string) {
  return parseISO(`${value}T00:00:00`);
}

function resolveBucket(daysPastDue: number, buckets: CurrentPortfolioBucket[]) {
  return (
    buckets.find((bucket) => {
      if (daysPastDue < bucket.daysFrom) return false;
      return bucket.daysTo == null ? true : daysPastDue <= bucket.daysTo;
    }) ?? null
  );
}

function buildEmptyBucketBalances(buckets: CurrentPortfolioBucket[]) {
  return Object.fromEntries(buckets.map((bucket) => [String(bucket.id), 0])) as Record<string, number>;
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

function emptyCollectionLoanSummary(): CollectionLoanSummary {
  return {
    paidCapitalAmount: 0,
    paidCurrentInterestAmount: 0,
    paidLateInterestAmount: 0,
    totalPaidAmount: 0,
    overdueCapitalAmount: 0,
    overdueCurrentInterestAmount: 0,
    overdueLateInterestAmount: 0,
    totalOverdueAmount: 0,
    totalPastDueDays: 0,
    currentCapitalAmount: 0,
    currentCurrentInterestAmount: 0,
    totalCurrentAmount: 0,
    totalPortfolioAmount: 0,
    otherOverdueAmount: 0,
    otherCurrentAmount: 0,
  };
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
  const summary = emptyCollectionLoanSummary();

  for (const entry of args.entryRows) {
    const category = resolveCollectionReceivableCategory(entry.glAccountId, args.accountMap);
    const amount = roundMoney(Number(entry.amount));

    if (entry.nature === 'CREDIT') {
      summary.totalPaidAmount = roundMoney(summary.totalPaidAmount + amount);
      if (category === 'CAPITAL') {
        summary.paidCapitalAmount = roundMoney(summary.paidCapitalAmount + amount);
      } else if (category === 'INTEREST') {
        summary.paidCurrentInterestAmount = roundMoney(summary.paidCurrentInterestAmount + amount);
      } else if (category === 'LATE_INTEREST') {
        summary.paidLateInterestAmount = roundMoney(summary.paidLateInterestAmount + amount);
      }
    }
  }

  const positions = buildCollectionPositions(args);

  for (const position of positions) {
    const isOverdue = !!position.dueDate && position.dueDate < args.cutoffDate;
    summary.totalPortfolioAmount = roundMoney(summary.totalPortfolioAmount + position.balance);

    if (isOverdue) {
      summary.totalOverdueAmount = roundMoney(summary.totalOverdueAmount + position.balance);
      if (position.dueDate) {
        summary.totalPastDueDays = Math.max(
          summary.totalPastDueDays,
          differenceInCalendarDays(parseDateOnly(args.cutoffDate), parseDateOnly(position.dueDate))
        );
      }

      if (position.category === 'CAPITAL') {
        summary.overdueCapitalAmount = roundMoney(
          summary.overdueCapitalAmount + position.balance
        );
      } else if (position.category === 'INTEREST') {
        summary.overdueCurrentInterestAmount = roundMoney(
          summary.overdueCurrentInterestAmount + position.balance
        );
      } else if (position.category === 'LATE_INTEREST') {
        summary.overdueLateInterestAmount = roundMoney(
          summary.overdueLateInterestAmount + position.balance
        );
      } else {
        summary.otherOverdueAmount = roundMoney(summary.otherOverdueAmount + position.balance);
      }
    } else {
      summary.totalCurrentAmount = roundMoney(summary.totalCurrentAmount + position.balance);
      if (position.category === 'CAPITAL') {
        summary.currentCapitalAmount = roundMoney(summary.currentCapitalAmount + position.balance);
      } else if (position.category === 'INTEREST') {
        summary.currentCurrentInterestAmount = roundMoney(
          summary.currentCurrentInterestAmount + position.balance
        );
      } else {
        summary.otherCurrentAmount = roundMoney(summary.otherCurrentAmount + position.balance);
      }
    }
  }

  return summary;
}

async function getActiveAgingProfile() {
  const activeProfiles = await db.query.agingProfiles.findMany({
    where: eq(agingProfiles.isActive, true),
    columns: { id: true, name: true },
    limit: 2,
  });

  if (!activeProfiles.length) {
    throwHttpError({
      status: 400,
      code: 'BAD_REQUEST',
      message: 'No existe un perfil de aging activo para generar el reporte',
    });
  }

  if (activeProfiles.length > 1) {
    throwHttpError({
      status: 409,
      code: 'CONFLICT',
      message: 'Existen múltiples perfiles de aging activos',
    });
  }

  const profile = activeProfiles[0]!;
  const buckets = await db.query.agingBuckets.findMany({
    where: and(eq(agingBuckets.agingProfileId, profile.id), eq(agingBuckets.isActive, true)),
    columns: {
      id: true,
      name: true,
      daysFrom: true,
      daysTo: true,
    },
    orderBy: [asc(agingBuckets.daysFrom), asc(agingBuckets.sortOrder)],
  });

  if (!buckets.length) {
    throwHttpError({
      status: 400,
      code: 'BAD_REQUEST',
      message: 'El perfil de aging activo no tiene buckets configurados',
    });
  }

  return { profile, buckets };
}

async function generateCurrentPortfolio(body: GenerateCurrentPortfolioBody, context: HandlerContext) {
  const { request, appRoute } = context;
  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);

    const creditProduct = await db.query.creditProducts.findFirst({
      where: and(eq(creditProducts.id, body.creditProductId), eq(creditProducts.isActive, true)),
      columns: { id: true, name: true },
    });

    if (!creditProduct) {
      throwHttpError({
        status: 404,
        code: 'NOT_FOUND',
        message: 'La línea de crédito seleccionada no existe o está inactiva',
      });
    }

    const { profile, buckets } = await getActiveAgingProfile();
    const cutoffDate = formatDateOnly(body.cutoffDate);
    const cutoffDateValue = parseDateOnly(cutoffDate);

    const rows = await db
      .select({
        loanId: loans.id,
        creditNumber: loans.creditNumber,
        loanStatus: loans.status,
        thirdPartyDocumentNumber: thirdParties.documentNumber,
        thirdPartyPersonType: thirdParties.personType,
        thirdPartyBusinessName: thirdParties.businessName,
        thirdPartyFirstName: thirdParties.firstName,
        thirdPartySecondName: thirdParties.secondName,
        thirdPartyFirstLastName: thirdParties.firstLastName,
        thirdPartySecondLastName: thirdParties.secondLastName,
        agreementName: agreements.businessName,
        creditProductName: creditProducts.name,
        glAccountId: glAccounts.id,
        glAccountCode: glAccounts.code,
        glAccountName: glAccounts.name,
        dueDate: portfolioEntries.dueDate,
        balance: portfolioEntries.balance,
      })
      .from(portfolioEntries)
      .innerJoin(loans, eq(portfolioEntries.loanId, loans.id))
      .innerJoin(loanApplications, eq(loans.loanApplicationId, loanApplications.id))
      .innerJoin(creditProducts, eq(loanApplications.creditProductId, creditProducts.id))
      .innerJoin(thirdParties, eq(loans.thirdPartyId, thirdParties.id))
      .innerJoin(glAccounts, eq(portfolioEntries.glAccountId, glAccounts.id))
      .leftJoin(agreements, eq(loans.agreementId, agreements.id))
      .where(
        and(
          eq(loanApplications.creditProductId, body.creditProductId),
          eq(portfolioEntries.status, 'OPEN'),
          sql`${portfolioEntries.balance} > 0`,
          eq(loans.status, 'ACCOUNTED'),
          eq(loans.disbursementStatus, 'DISBURSED')
        )
      );

    const distinctCreditIds = new Set<number>();
    const grouped = new Map<string, CurrentPortfolioAccumulator>();

    for (const row of rows as CurrentPortfolioRawRow[]) {
      distinctCreditIds.add(row.loanId);

      const dueDate = parseDateOnly(row.dueDate);
      const daysPastDue = Math.max(0, differenceInCalendarDays(cutoffDateValue, dueDate));
      const bucket = resolveBucket(daysPastDue, buckets);
      if (!bucket) {
        throwHttpError({
          status: 400,
          code: 'BAD_REQUEST',
          message: `No existe bucket de aging para ${daysPastDue} días de mora`,
        });
      }

      const balance = roundMoney(Number(row.balance));
      const key = body.groupBy === 'CREDIT' ? String(row.loanId) : String(row.glAccountId);
      const existing = grouped.get(key) ?? {
        rowKey: key,
        groupBy: body.groupBy,
        creditNumber: body.groupBy === 'CREDIT' ? row.creditNumber : null,
        thirdPartyDocumentNumber: body.groupBy === 'CREDIT' ? row.thirdPartyDocumentNumber : null,
        thirdPartyName:
          body.groupBy === 'CREDIT'
            ? getThirdPartyLabel({
                personType: row.thirdPartyPersonType,
                businessName: row.thirdPartyBusinessName,
                firstName: row.thirdPartyFirstName,
                secondName: row.thirdPartySecondName,
                firstLastName: row.thirdPartyFirstLastName,
                secondLastName: row.thirdPartySecondLastName,
                documentNumber: row.thirdPartyDocumentNumber,
              })
            : null,
        agreementName: body.groupBy === 'CREDIT' ? row.agreementName : null,
        creditProductName: row.creditProductName,
        auxiliaryCode: body.groupBy === 'GL_ACCOUNT' ? row.glAccountCode : null,
        auxiliaryName: body.groupBy === 'GL_ACCOUNT' ? row.glAccountName : null,
        status: body.groupBy === 'CREDIT' ? row.loanStatus : null,
        reviewedCreditsCount: body.groupBy === 'GL_ACCOUNT' ? 0 : null,
        installmentValue: 0,
        outstandingBalance: 0,
        overdueBalance: 0,
        maxDaysPastDue: 0,
        bucketBalances: buildEmptyBucketBalances(buckets),
        note: null,
        creditIds: new Set<number>(),
      };

      existing.creditIds.add(row.loanId);
      existing.outstandingBalance = roundMoney(existing.outstandingBalance + balance);
      if (daysPastDue > 0) {
        existing.overdueBalance = roundMoney(existing.overdueBalance + balance);
      }
      existing.maxDaysPastDue = Math.max(existing.maxDaysPastDue, daysPastDue);
      existing.bucketBalances[String(bucket.id)] = roundMoney(
        (existing.bucketBalances[String(bucket.id)] ?? 0) + balance
      );

      grouped.set(key, existing);
    }

    const reportRows = Array.from(grouped.values())
      .map((item) => ({
        rowKey: item.rowKey,
        groupBy: item.groupBy,
        creditNumber: item.creditNumber,
        thirdPartyDocumentNumber: item.thirdPartyDocumentNumber,
        thirdPartyName: item.thirdPartyName,
        agreementName: item.agreementName,
        creditProductName: item.creditProductName,
        auxiliaryCode: item.auxiliaryCode,
        auxiliaryName: item.auxiliaryName,
        status:
          item.groupBy === 'CREDIT'
            ? item.overdueBalance > 0
              ? 'EN MORA'
              : 'AL DIA'
            : null,
        reviewedCreditsCount: item.groupBy === 'GL_ACCOUNT' ? item.creditIds.size : null,
        installmentValue: item.installmentValue,
        outstandingBalance: item.outstandingBalance,
        overdueBalance: item.overdueBalance,
        maxDaysPastDue: item.maxDaysPastDue,
        bucketBalances: item.bucketBalances,
        note: item.note,
      }))
      .sort((a, b) => {
        if (body.groupBy === 'CREDIT') {
          return (a.creditNumber ?? '').localeCompare(b.creditNumber ?? '');
        }
        return (a.auxiliaryCode ?? '').localeCompare(b.auxiliaryCode ?? '');
      });

    return {
      status: 200 as const,
      body: {
        reportType: 'CURRENT_PORTFOLIO' as const,
        cutoffDate,
        groupBy: body.groupBy,
        agingProfileName: profile.name,
        creditProductName: creditProduct.name,
        buckets,
        reviewedCredits: distinctCreditIds.size,
        reportedCredits: reportRows.length,
        rows: reportRows,
        message: `Reporte de cartera actual generado con perfil de aging ${profile.name}.`,
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al generar reporte cartera de creditos actual',
    });
  }
}

async function generateHistoricalPortfolioByPeriod(
  body: GenerateHistoricalPortfolioByPeriodBody,
  context: HandlerContext
) {
  const { request, appRoute } = context;
  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);
    const cutoffDate = formatDateOnly(body.cutoffDate);
    const cutoffDateValue = parseDateOnly(cutoffDate);
    const year = cutoffDateValue.getFullYear();
    const month = cutoffDateValue.getMonth() + 1;
    const creditProduct = await db.query.creditProducts.findFirst({
      where: and(eq(creditProducts.id, body.creditProductId), eq(creditProducts.isActive, true)),
      columns: { id: true, name: true },
    });

    if (!creditProduct) {
      throwHttpError({
        status: 404,
        code: 'NOT_FOUND',
        message: 'La línea de crédito seleccionada no existe o está inactiva',
      });
    }

    const period = await db.query.accountingPeriods.findFirst({
      where: and(
        eq(accountingPeriods.year, year),
        eq(accountingPeriods.month, month),
        eq(accountingPeriods.isClosed, true)
      ),
      columns: { id: true, year: true, month: true },
    });

    if (!period) {
      throwHttpError({
        status: 404,
        code: 'NOT_FOUND',
        message: 'No existe un período cerrado para la fecha seleccionada',
      });
    }

    const provisionSnapshots = await db.query.portfolioProvisionSnapshots.findMany({
      where: eq(portfolioProvisionSnapshots.accountingPeriodId, period.id),
      columns: {
        id: true,
        agingProfileId: true,
      },
      limit: 2,
    });

    if (!provisionSnapshots.length) {
      throwHttpError({
        status: 404,
        code: 'NOT_FOUND',
        message: 'El período cerrado no tiene snapshots de cartera generados',
      });
    }

    if (provisionSnapshots.length > 1) {
      throwHttpError({
        status: 409,
        code: 'CONFLICT',
        message: 'El período tiene múltiples snapshots de provisión y no puede consolidarse',
      });
    }

    const provisionSnapshot = provisionSnapshots[0]!;
    const agingProfile = await db.query.agingProfiles.findFirst({
      where: eq(agingProfiles.id, provisionSnapshot.agingProfileId),
      columns: { id: true, name: true },
    });

    if (!agingProfile) {
      throwHttpError({
        status: 404,
        code: 'NOT_FOUND',
        message: 'No se encontró el perfil de aging usado en el cierre del período',
      });
    }

    const buckets = await db.query.agingBuckets.findMany({
      where: and(eq(agingBuckets.agingProfileId, agingProfile.id), eq(agingBuckets.isActive, true)),
      columns: { id: true, name: true, daysFrom: true, daysTo: true },
      orderBy: [asc(agingBuckets.daysFrom), asc(agingBuckets.sortOrder)],
    });

    const snapshotRows = await db
      .select({
        agingSnapshotId: portfolioAgingSnapshots.id,
        loanId: portfolioAgingSnapshots.loanId,
        creditNumber: loans.creditNumber,
        thirdPartyDocumentNumber: thirdParties.documentNumber,
        thirdPartyPersonType: thirdParties.personType,
        thirdPartyBusinessName: thirdParties.businessName,
        thirdPartyFirstName: thirdParties.firstName,
        thirdPartySecondName: thirdParties.secondName,
        thirdPartyFirstLastName: thirdParties.firstLastName,
        thirdPartySecondLastName: thirdParties.secondLastName,
        agreementName: agreements.businessName,
        creditProductName: creditProducts.name,
        auxiliaryCode: glAccounts.code,
        auxiliaryName: glAccounts.name,
        daysPastDue: portfolioAgingSnapshots.daysPastDue,
        installmentValue: portfolioAgingSnapshots.installmentValue,
        currentAmount: portfolioAgingSnapshots.currentAmount,
        totalPastDue: portfolioAgingSnapshots.totalPastDue,
        totalPortfolio: portfolioAgingSnapshots.totalPortfolio,
      })
      .from(portfolioAgingSnapshots)
      .innerJoin(loans, eq(portfolioAgingSnapshots.loanId, loans.id))
      .innerJoin(creditProducts, eq(portfolioAgingSnapshots.creditProductId, creditProducts.id))
      .innerJoin(glAccounts, eq(portfolioAgingSnapshots.glAccountId, glAccounts.id))
      .innerJoin(thirdParties, eq(portfolioAgingSnapshots.thirdPartyId, thirdParties.id))
      .leftJoin(agreements, eq(loans.agreementId, agreements.id))
      .where(
        and(
          eq(portfolioAgingSnapshots.accountingPeriodId, period.id),
          eq(portfolioAgingSnapshots.creditProductId, body.creditProductId)
        )
      )
      .orderBy(asc(loans.creditNumber), asc(glAccounts.code));

    if (!snapshotRows.length) {
      throwHttpError({
        status: 404,
        code: 'NOT_FOUND',
        message: 'El período cerrado no tiene snapshots de cartera disponibles',
      });
    }

    const detailRows = await db
      .select({
        agingSnapshotId: portfolioProvisionSnapshotDetails.agingSnapshotId,
        agingBucketId: portfolioProvisionSnapshotDetails.agingBucketId,
        baseAmount: portfolioProvisionSnapshotDetails.baseAmount,
      })
      .from(portfolioProvisionSnapshotDetails)
      .where(eq(portfolioProvisionSnapshotDetails.provisionSnapshotId, provisionSnapshot.id));

    const bucketBalancesBySnapshot = new Map<number, Record<string, number>>();
    for (const detail of detailRows) {
      const existing =
        bucketBalancesBySnapshot.get(detail.agingSnapshotId) ?? buildEmptyBucketBalances(buckets);
      existing[String(detail.agingBucketId)] = roundMoney(Number(detail.baseAmount));
      bucketBalancesBySnapshot.set(detail.agingSnapshotId, existing);
    }

    const distinctCredits = new Set<number>();
    const grouped = new Map<string, CurrentPortfolioAccumulator>();

    for (const row of snapshotRows as HistoricalPortfolioRawRow[]) {
      distinctCredits.add(row.loanId);

      const key = body.groupBy === 'CREDIT' ? String(row.loanId) : row.auxiliaryCode;
      const existing = grouped.get(key) ?? {
        rowKey: key,
        groupBy: body.groupBy,
        creditNumber: body.groupBy === 'CREDIT' ? row.creditNumber : null,
        thirdPartyDocumentNumber: body.groupBy === 'CREDIT' ? row.thirdPartyDocumentNumber : null,
        thirdPartyName:
          body.groupBy === 'CREDIT'
            ? getThirdPartyLabel({
                personType: row.thirdPartyPersonType,
                businessName: row.thirdPartyBusinessName,
                firstName: row.thirdPartyFirstName,
                secondName: row.thirdPartySecondName,
                firstLastName: row.thirdPartyFirstLastName,
                secondLastName: row.thirdPartySecondLastName,
                documentNumber: row.thirdPartyDocumentNumber,
              })
            : null,
        agreementName: body.groupBy === 'CREDIT' ? row.agreementName : null,
        creditProductName: row.creditProductName,
        auxiliaryCode: body.groupBy === 'GL_ACCOUNT' ? row.auxiliaryCode : null,
        auxiliaryName: body.groupBy === 'GL_ACCOUNT' ? row.auxiliaryName : null,
        status: null,
        reviewedCreditsCount: body.groupBy === 'GL_ACCOUNT' ? 0 : null,
        installmentValue: 0,
        outstandingBalance: 0,
        overdueBalance: 0,
        maxDaysPastDue: 0,
        bucketBalances: buildEmptyBucketBalances(buckets),
        note: null,
        creditIds: new Set<number>(),
      };

      existing.creditIds.add(row.loanId);
      existing.installmentValue = roundMoney(existing.installmentValue + Number(row.installmentValue));
      existing.outstandingBalance = roundMoney(existing.outstandingBalance + Number(row.totalPortfolio));
      existing.overdueBalance = roundMoney(existing.overdueBalance + Number(row.totalPastDue));
      existing.maxDaysPastDue = Math.max(existing.maxDaysPastDue, row.daysPastDue);
      existing.bucketBalances = Object.entries(
        bucketBalancesBySnapshot.get(row.agingSnapshotId) ?? buildEmptyBucketBalances(buckets)
      ).reduce<Record<string, number>>((acc, [bucketId, amount]) => {
        acc[bucketId] = roundMoney((existing.bucketBalances[bucketId] ?? 0) + amount);
        return acc;
      }, existing.bucketBalances);
      grouped.set(key, existing);
    }

    const rows = Array.from(grouped.values())
      .map((item) => ({
        rowKey: item.rowKey,
        groupBy: item.groupBy,
        creditNumber: item.creditNumber,
        thirdPartyDocumentNumber: item.thirdPartyDocumentNumber,
        thirdPartyName: item.thirdPartyName,
        agreementName: item.agreementName,
        creditProductName: item.creditProductName,
        auxiliaryCode: item.auxiliaryCode,
        auxiliaryName: item.auxiliaryName,
        status: item.groupBy === 'CREDIT' ? (item.maxDaysPastDue > 0 ? 'EN MORA' : 'AL DIA') : null,
        reviewedCreditsCount: item.groupBy === 'GL_ACCOUNT' ? item.creditIds.size : null,
        daysPastDue: item.maxDaysPastDue,
        installmentValue: item.installmentValue,
        currentAmount: roundMoney(item.outstandingBalance - item.overdueBalance),
        overdueBalance: item.overdueBalance,
        outstandingBalance: item.outstandingBalance,
        bucketBalances: item.bucketBalances,
        note: null,
      }))
      .sort((a, b) =>
        body.groupBy === 'CREDIT'
          ? (a.creditNumber ?? '').localeCompare(b.creditNumber ?? '')
          : (a.auxiliaryCode ?? '').localeCompare(b.auxiliaryCode ?? '')
      );

    const periodLabel = `${period.year}-${String(period.month).padStart(2, '0')}`;

    return {
      status: 200 as const,
      body: {
        reportType: 'HISTORICAL_PORTFOLIO_BY_PERIOD' as const,
        cutoffDate,
        groupBy: body.groupBy,
        periodLabel,
        agingProfileName: agingProfile.name,
        creditProductName: creditProduct.name,
        buckets,
        reviewedCredits: distinctCredits.size,
        reportedCredits: rows.length,
        rows,
        message: `Reporte histórico generado desde snapshots del período ${periodLabel}.`,
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al generar reporte historico de cartera por periodo',
    });
  }
}

async function generateCreditsForCollection(
  body: GenerateCreditsForCollectionBody,
  context: HandlerContext
) {
  const { request, appRoute } = context;
  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);
    const cutoffDate = formatDateOnly(body.cutoffDate);

    const loanRows = await db.query.loans.findMany({
      where: and(
        eq(loans.disbursementStatus, 'DISBURSED'),
        inArray(loans.status, ['ACCOUNTED', 'PAID'])
      ),
      columns: {
        id: true,
        creditNumber: true,
        status: true,
        creditStartDate: true,
        maturityDate: true,
        principalAmount: true,
        installments: true,
        isWrittenOff: true,
      },
      with: {
        affiliationOffice: {
          columns: {
            name: true,
          },
        },
        agreement: {
          columns: {
            businessName: true,
          },
        },
        repaymentMethod: {
          columns: {
            name: true,
          },
        },
        borrower: {
          columns: {
            documentNumber: true,
            personType: true,
            businessName: true,
            firstName: true,
            secondName: true,
            firstLastName: true,
            secondLastName: true,
            employerDocumentNumber: true,
            employerBusinessName: true,
            homePhone: true,
            mobilePhone: true,
            homeAddress: true,
          },
          with: {
            homeCity: {
              columns: {
                name: true,
              },
            },
          },
        },
        loanApplication: {
          columns: {
            salary: true,
            categoryCode: true,
            financingFactor: true,
          },
          with: {
            creditProduct: {
              columns: {
                id: true,
                name: true,
              },
              with: {
                creditProductAccounts: {
                  columns: {
                    capitalGlAccountId: true,
                    interestGlAccountId: true,
                    lateInterestGlAccountId: true,
                  },
                },
              },
            },
          },
        },
        loanInstallments: {
          columns: {
            installmentNumber: true,
            principalAmount: true,
            interestAmount: true,
            insuranceAmount: true,
          },
          orderBy: [asc(loanInstallments.installmentNumber)],
        },
      },
      orderBy: [asc(loans.creditNumber)],
    });

    const reviewedCredits = loanRows.length;
    if (!loanRows.length) {
      return {
        status: 200 as const,
        body: {
          reportType: 'CREDITS_FOR_COLLECTION' as const,
          cutoffDate,
          reviewedCredits: 0,
          reportedCredits: 0,
          rows: [],
          message: 'No existen créditos desembolsados para evaluar en la fecha de corte.',
        },
      };
    }

    const loanIds = loanRows.map((loan) => loan.id);

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
      .orderBy(asc(loanPayments.loanId), asc(loanPayments.paymentDate));

    const lastPaymentDateByLoan = new Map<number, string>();
    for (const row of paymentRows) {
      lastPaymentDateByLoan.set(row.loanId, row.paymentDate);
    }

    const rows = loanRows
      .map((loan, index) => {
        const accountMap = loan.loanApplication.creditProduct.creditProductAccounts[0]
          ? {
              capitalGlAccountId:
                loan.loanApplication.creditProduct.creditProductAccounts[0].capitalGlAccountId,
              interestGlAccountId:
                loan.loanApplication.creditProduct.creditProductAccounts[0].interestGlAccountId,
              lateInterestGlAccountId:
                loan.loanApplication.creditProduct.creditProductAccounts[0].lateInterestGlAccountId,
            }
          : null;

        const summary = buildCollectionSummary({
          cutoffDate,
          entryRows: entriesByLoan.get(loan.id) ?? [],
          accountMap,
        });

        if (summary.totalPortfolioAmount <= 0.01) return null;

        const firstInstallment = loan.loanInstallments.find((item) => item.installmentNumber === 1);
        const installmentValue = firstInstallment
          ? roundMoney(
              Number(firstInstallment.principalAmount) +
                Number(firstInstallment.interestAmount) +
                Number(firstInstallment.insuranceAmount)
            )
          : loan.installments > 0
            ? roundMoney(Number(loan.principalAmount) / loan.installments)
            : roundMoney(Number(loan.principalAmount));

        const noteParts: string[] = [];
        if (summary.otherOverdueAmount > 0 || summary.otherCurrentAmount > 0) {
          noteParts.push(
            `Otros conceptos: vencido ${summary.otherOverdueAmount.toFixed(2)}, sin vencer ${summary.otherCurrentAmount.toFixed(2)}`
          );
        }
        if (loan.isWrittenOff) {
          noteParts.push('Crédito castigado');
        }

        return {
          item: index + 1,
          officeName: loan.affiliationOffice?.name ?? 'Sin oficina',
          creditNumber: loan.creditNumber,
          loanStatus: loan.status,
          thirdPartyDocumentNumber: loan.borrower?.documentNumber ?? null,
          thirdPartyName: getThirdPartyLabel(loan.borrower),
          employerDocumentNumber: loan.borrower?.employerDocumentNumber ?? null,
          employerBusinessName: loan.borrower?.employerBusinessName ?? null,
          phone: loan.borrower?.mobilePhone ?? loan.borrower?.homePhone ?? null,
          address: loan.borrower?.homeAddress ?? null,
          cityName: loan.borrower?.homeCity?.name ?? null,
          agreementName: loan.agreement?.businessName ?? null,
          creditProductName: loan.loanApplication.creditProduct.name,
          approvalDate: loan.creditStartDate,
          maturityDate: loan.maturityDate,
          repaymentMethodName: loan.repaymentMethod?.name ?? null,
          creditValue: roundMoney(Number(loan.principalAmount)),
          installments: loan.installments,
          installmentValue,
          salary: roundMoney(Number(loan.loanApplication.salary)),
          categoryLabel: categoryCodeLabels[loan.loanApplication.categoryCode],
          financingFactor: Number(loan.loanApplication.financingFactor),
          paidCapitalAmount: summary.paidCapitalAmount,
          paidCurrentInterestAmount: summary.paidCurrentInterestAmount,
          paidLateInterestAmount: summary.paidLateInterestAmount,
          totalPaidAmount: summary.totalPaidAmount,
          overdueCapitalAmount: summary.overdueCapitalAmount,
          overdueCurrentInterestAmount: summary.overdueCurrentInterestAmount,
          overdueLateInterestAmount: summary.overdueLateInterestAmount,
          totalOverdueAmount: summary.totalOverdueAmount,
          totalPastDueDays: summary.totalPastDueDays,
          currentCapitalAmount: summary.currentCapitalAmount,
          currentCurrentInterestAmount: summary.currentCurrentInterestAmount,
          totalCurrentAmount: summary.totalCurrentAmount,
          totalPortfolioAmount: summary.totalPortfolioAmount,
          lastPaymentDate: lastPaymentDateByLoan.get(loan.id) ?? null,
          isWrittenOff: loan.isWrittenOff,
          note: noteParts.length ? noteParts.join(' | ') : null,
        };
      })
      .filter((row): row is NonNullable<typeof row> => !!row);

    return {
      status: 200 as const,
      body: {
        reportType: 'CREDITS_FOR_COLLECTION' as const,
        cutoffDate,
        reviewedCredits,
        reportedCredits: rows.length,
        rows,
        message: 'Reporte de créditos para cobro generado.',
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al generar reporte de creditos para cobro',
    });
  }
}

async function generatePayrollPortfolioByAgreement(
  body: GeneratePayrollPortfolioByAgreementBody,
  context: HandlerContext
) {
  const { request, appRoute } = context;
  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);
    const cutoffDate = formatDateOnly(body.cutoffDate);
    const agreement = await db.query.agreements.findFirst({
      where: eq(agreements.id, body.agreementId),
      columns: {
        id: true,
        agreementCode: true,
        businessName: true,
      },
    });

    if (!agreement) {
      throwHttpError({
        status: 404,
        code: 'NOT_FOUND',
        message: 'Convenio no encontrado',
      });
    }

    const loanRows = await db.query.loans.findMany({
      where: and(
        eq(loans.agreementId, body.agreementId),
        eq(loans.disbursementStatus, 'DISBURSED'),
        inArray(loans.status, ['ACCOUNTED', 'PAID'])
      ),
      columns: {
        id: true,
        creditNumber: true,
        status: true,
        creditStartDate: true,
        firstCollectionDate: true,
        maturityDate: true,
        principalAmount: true,
        installments: true,
      },
      with: {
        borrower: {
          columns: {
            documentNumber: true,
            personType: true,
            businessName: true,
            firstName: true,
            secondName: true,
            firstLastName: true,
            secondLastName: true,
            employerBusinessName: true,
            homePhone: true,
            mobilePhone: true,
            homeAddress: true,
          },
          with: {
            homeCity: {
              columns: {
                name: true,
              },
            },
          },
        },
        repaymentMethod: {
          columns: {
            name: true,
          },
        },
        loanApplication: {
          with: {
            creditProduct: {
              columns: {
                name: true,
              },
              with: {
                creditProductAccounts: {
                  columns: {
                    capitalGlAccountId: true,
                    interestGlAccountId: true,
                    lateInterestGlAccountId: true,
                  },
                },
              },
            },
          },
        },
        loanInstallments: {
          columns: {
            installmentNumber: true,
            principalAmount: true,
            interestAmount: true,
            insuranceAmount: true,
          },
          orderBy: [asc(loanInstallments.installmentNumber)],
        },
      },
      orderBy: [asc(loans.creditNumber)],
    });

    const reviewedCredits = loanRows.length;
    if (!loanRows.length) {
      return {
        status: 200 as const,
        body: {
          reportType: 'PAYROLL_PORTFOLIO_BY_AGREEMENT' as const,
          cutoffDate,
          agreementName: agreement.businessName,
          reviewedCredits: 0,
          reportedCredits: 0,
          rows: [],
          message: `No existen créditos desembolsados asociados al convenio ${agreement.businessName}.`,
        },
      };
    }

    const loanIds = loanRows.map((loan) => loan.id);
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
      .orderBy(asc(loanPayments.loanId), asc(loanPayments.paymentDate));

    const lastPaymentDateByLoan = new Map<number, string>();
    for (const row of paymentRows) {
      lastPaymentDateByLoan.set(row.loanId, row.paymentDate);
    }

    const rows = loanRows
      .map((loan, index) => {
        const accountMap = loan.loanApplication.creditProduct.creditProductAccounts[0]
          ? {
              capitalGlAccountId:
                loan.loanApplication.creditProduct.creditProductAccounts[0].capitalGlAccountId,
              interestGlAccountId:
                loan.loanApplication.creditProduct.creditProductAccounts[0].interestGlAccountId,
              lateInterestGlAccountId:
                loan.loanApplication.creditProduct.creditProductAccounts[0].lateInterestGlAccountId,
            }
          : null;

        const entryRows = entriesByLoan.get(loan.id) ?? [];
        const summary = buildCollectionSummary({
          cutoffDate,
          entryRows,
          accountMap,
        });

        if (summary.totalPortfolioAmount <= 0.01) return null;

        const positivePositions = buildCollectionPositions({ entryRows, accountMap });
        const datedPositions = positivePositions.filter(
          (position): position is CollectionPosition & { dueDate: string } => Boolean(position.dueDate)
        );
        const nextDueDate =
          datedPositions
            .filter((position) => position.dueDate >= cutoffDate)
            .sort((left, right) => left.dueDate.localeCompare(right.dueDate))[0]?.dueDate ??
          datedPositions.sort((left, right) => left.dueDate.localeCompare(right.dueDate))[0]?.dueDate ??
          null;

        const firstInstallment = loan.loanInstallments.find((item) => item.installmentNumber === 1);
        const installmentValue = firstInstallment
          ? roundMoney(
              Number(firstInstallment.principalAmount) +
                Number(firstInstallment.interestAmount) +
                Number(firstInstallment.insuranceAmount)
            )
          : loan.installments > 0
            ? roundMoney(Number(loan.principalAmount) / loan.installments)
            : roundMoney(Number(loan.principalAmount));

        const noteParts: string[] = [];
        if (summary.otherOverdueAmount > 0 || summary.otherCurrentAmount > 0) {
          noteParts.push(
            `Otros conceptos: vencido ${summary.otherOverdueAmount.toFixed(2)}, sin vencer ${summary.otherCurrentAmount.toFixed(2)}`
          );
        }

        return {
          item: index + 1,
          creditNumber: loan.creditNumber,
          thirdPartyDocumentNumber: loan.borrower?.documentNumber ?? null,
          thirdPartyName: getThirdPartyLabel(loan.borrower),
          employerBusinessName: loan.borrower?.employerBusinessName ?? null,
          phone: loan.borrower?.mobilePhone ?? loan.borrower?.homePhone ?? null,
          address: loan.borrower?.homeAddress ?? null,
          cityName: loan.borrower?.homeCity?.name ?? null,
          agreementName: agreement.businessName,
          creditProductName: loan.loanApplication.creditProduct.name,
          repaymentMethodName: loan.repaymentMethod?.name ?? null,
          loanStatus: loan.status,
          creditStartDate: loan.creditStartDate,
          firstCollectionDate: loan.firstCollectionDate,
          maturityDate: loan.maturityDate,
          nextDueDate,
          daysPastDue: summary.totalPastDueDays,
          installments: loan.installments,
          installmentValue,
          totalPortfolioAmount: summary.totalPortfolioAmount,
          overdueBalance: summary.totalOverdueAmount,
          currentBalance: summary.totalCurrentAmount,
          lastPaymentDate: lastPaymentDateByLoan.get(loan.id) ?? null,
          note: noteParts.length ? noteParts.join(' | ') : null,
        };
      })
      .filter((row): row is NonNullable<typeof row> => !!row);

    return {
      status: 200 as const,
      body: {
        reportType: 'PAYROLL_PORTFOLIO_BY_AGREEMENT' as const,
        cutoffDate,
        agreementName: agreement.businessName,
        reviewedCredits,
        reportedCredits: rows.length,
        rows,
        message: `Reporte de cartera de libranza generado para ${agreement.businessName}.`,
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al generar reporte de cartera de libranza por convenio',
    });
  }
}

async function generatePortfolioByCreditType(
  body: GeneratePortfolioByCreditTypeBody,
  context: HandlerContext
) {
  const { request, appRoute } = context;
  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);
    const cutoffDate = formatDateOnly(new Date());
    const creditProduct = await db.query.creditProducts.findFirst({
      where: and(eq(creditProducts.id, body.creditProductId), eq(creditProducts.isActive, true)),
      columns: {
        id: true,
        name: true,
      },
      with: {
        creditProductAccounts: {
          columns: {
            capitalGlAccountId: true,
            interestGlAccountId: true,
            lateInterestGlAccountId: true,
          },
        },
      },
    });

    if (!creditProduct) {
      throwHttpError({
        status: 404,
        code: 'NOT_FOUND',
        message: 'Linea de credito no encontrada',
      });
    }

    const loanRows = await db.query.loans.findMany({
      where: and(
        eq(loans.disbursementStatus, 'DISBURSED'),
        inArray(loans.status, ['ACCOUNTED', 'PAID'])
      ),
      columns: {
        id: true,
        creditNumber: true,
        principalAmount: true,
      },
      with: {
        borrower: {
          columns: {
            documentNumber: true,
            personType: true,
            businessName: true,
            firstName: true,
            secondName: true,
            firstLastName: true,
            secondLastName: true,
          },
        },
        loanApplication: {
          columns: {},
          with: {
            creditProduct: {
              columns: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [asc(loans.creditNumber)],
    });

    const filteredLoans = loanRows.filter(
      (loan) => loan.loanApplication.creditProduct.id === body.creditProductId
    );
    const reviewedCredits = filteredLoans.length;

    if (!filteredLoans.length) {
      return {
        status: 200 as const,
        body: {
          reportType: 'PORTFOLIO_BY_CREDIT_TYPE' as const,
          cutoffDate,
          creditProductName: creditProduct.name,
          reviewedCredits: 0,
          reportedCredits: 0,
          rows: [],
          message: `No existen créditos desembolsados para la línea ${creditProduct.name}.`,
        },
      };
    }

    const loanIds = filteredLoans.map((loan) => loan.id);
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

    const accountMap = creditProduct.creditProductAccounts[0]
      ? {
          capitalGlAccountId: creditProduct.creditProductAccounts[0].capitalGlAccountId,
          interestGlAccountId: creditProduct.creditProductAccounts[0].interestGlAccountId,
          lateInterestGlAccountId: creditProduct.creditProductAccounts[0].lateInterestGlAccountId,
        }
      : null;

    const rows = filteredLoans
      .map((loan, index) => {
        const summary = buildCollectionSummary({
          cutoffDate,
          entryRows: entriesByLoan.get(loan.id) ?? [],
          accountMap,
        });

        if (summary.totalPortfolioAmount <= 0.01) return null;

        const noteParts: string[] = [];
        if (summary.totalOverdueAmount > 0.01) {
          noteParts.push(`Saldo vencido ${summary.totalOverdueAmount.toFixed(2)}`);
        }

        return {
          item: index + 1,
          creditNumber: loan.creditNumber,
          thirdPartyDocumentNumber: loan.borrower?.documentNumber ?? null,
          thirdPartyName: getThirdPartyLabel(loan.borrower),
          creditValue: roundMoney(Number(loan.principalAmount)),
          paidAmount: summary.totalPaidAmount,
          outstandingBalance: summary.totalPortfolioAmount,
          note: noteParts.length ? noteParts.join(' | ') : null,
        };
      })
      .filter((row): row is NonNullable<typeof row> => !!row);

    return {
      status: 200 as const,
      body: {
        reportType: 'PORTFOLIO_BY_CREDIT_TYPE' as const,
        cutoffDate,
        creditProductName: creditProduct.name,
        reviewedCredits,
        reportedCredits: rows.length,
        rows,
        message: `Reporte de cartera por línea generado para ${creditProduct.name}.`,
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al generar reporte de cartera por tipo de credito',
    });
  }
}

async function generatePortfolioIndicators(
  body: GeneratePortfolioIndicatorsBody,
  context: HandlerContext
) {
  const { request, appRoute } = context;
  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);
    const startDate = formatDateOnly(body.startDate);
    const endDate = formatDateOnly(body.endDate);
    const yearStartDate = formatDateOnly(startOfYear(body.endDate));

    const [creditProduct, affiliationOffice] = await Promise.all([
      body.creditProductId
        ? db.query.creditProducts.findFirst({
            where: and(eq(creditProducts.id, body.creditProductId), eq(creditProducts.isActive, true)),
            columns: { id: true, name: true },
          })
        : Promise.resolve(null),
      body.affiliationOfficeId
        ? db.query.affiliationOffices.findFirst({
            where: eq(affiliationOffices.id, body.affiliationOfficeId),
            columns: { id: true, name: true },
          })
        : Promise.resolve(null),
    ]);

    if (body.creditProductId && !creditProduct) {
      throwHttpError({
        status: 404,
        code: 'NOT_FOUND',
        message: 'Linea de credito no encontrada',
      });
    }

    if (body.affiliationOfficeId && !affiliationOffice) {
      throwHttpError({
        status: 404,
        code: 'NOT_FOUND',
        message: 'Oficina de afiliacion no encontrada',
      });
    }

    const periodApprovalFilters = [eq(loanApplications.status, 'APPROVED'), gte(loanApplications.statusDate, startDate), lte(loanApplications.statusDate, endDate)];
    const yearApprovalFilters = [eq(loanApplications.status, 'APPROVED'), gte(loanApplications.statusDate, yearStartDate), lte(loanApplications.statusDate, endDate)];

    if (body.creditProductId) {
      periodApprovalFilters.push(eq(loanApplications.creditProductId, body.creditProductId));
      yearApprovalFilters.push(eq(loanApplications.creditProductId, body.creditProductId));
    }
    if (body.affiliationOfficeId) {
      periodApprovalFilters.push(eq(loanApplications.affiliationOfficeId, body.affiliationOfficeId));
      yearApprovalFilters.push(eq(loanApplications.affiliationOfficeId, body.affiliationOfficeId));
    }

    const [approvedInPeriod, approvedYearToDate, scheduledReceivables, collectedPayments] =
      await Promise.all([
        db.query.loanApplications.findMany({
          where: and(...periodApprovalFilters),
          columns: {
            applicationDate: true,
            statusDate: true,
            approvedAmount: true,
          },
          with: {
            creditProduct: {
              columns: { name: true },
            },
            affiliationOffice: {
              columns: { name: true },
            },
          },
          orderBy: [asc(loanApplications.statusDate)],
        }),
        db.query.loanApplications.findMany({
          where: and(...yearApprovalFilters),
          columns: {
            approvedAmount: true,
          },
          with: {
            creditProduct: {
              columns: { name: true },
            },
          },
        }),
        db
          .select({
            creditProductName: creditProducts.name,
            officeName: affiliationOffices.name,
            amount: accountingEntries.amount,
          })
          .from(accountingEntries)
          .innerJoin(glAccounts, eq(accountingEntries.glAccountId, glAccounts.id))
          .innerJoin(loans, eq(accountingEntries.loanId, loans.id))
          .innerJoin(loanApplications, eq(loans.loanApplicationId, loanApplications.id))
          .innerJoin(creditProducts, eq(loanApplications.creditProductId, creditProducts.id))
          .leftJoin(affiliationOffices, eq(loans.affiliationOfficeId, affiliationOffices.id))
          .where(
            and(
              eq(accountingEntries.status, 'ACCOUNTED'),
              eq(accountingEntries.nature, 'DEBIT'),
              eq(glAccounts.detailType, 'RECEIVABLE'),
              gte(accountingEntries.dueDate, startDate),
              lte(accountingEntries.dueDate, endDate),
              eq(loans.disbursementStatus, 'DISBURSED'),
              inArray(loans.status, ['ACCOUNTED', 'PAID']),
              ...(body.creditProductId ? [eq(loanApplications.creditProductId, body.creditProductId)] : []),
              ...(body.affiliationOfficeId ? [eq(loans.affiliationOfficeId, body.affiliationOfficeId)] : [])
            )
          ),
        db
          .select({
            creditProductName: creditProducts.name,
            officeName: affiliationOffices.name,
            amount: loanPayments.amount,
          })
          .from(loanPayments)
          .innerJoin(loans, eq(loanPayments.loanId, loans.id))
          .innerJoin(loanApplications, eq(loans.loanApplicationId, loanApplications.id))
          .innerJoin(creditProducts, eq(loanApplications.creditProductId, creditProducts.id))
          .leftJoin(affiliationOffices, eq(loans.affiliationOfficeId, affiliationOffices.id))
          .where(
            and(
              eq(loanPayments.status, 'PAID'),
              gte(loanPayments.paymentDate, startDate),
              lte(loanPayments.paymentDate, endDate),
              eq(loans.disbursementStatus, 'DISBURSED'),
              inArray(loans.status, ['ACCOUNTED', 'PAID']),
              ...(body.creditProductId ? [eq(loanApplications.creditProductId, body.creditProductId)] : []),
              ...(body.affiliationOfficeId ? [eq(loans.affiliationOfficeId, body.affiliationOfficeId)] : [])
            )
          ),
      ]);

    const opportunityMap = new Map<
      string,
      {
        officeName: string;
        creditProductName: string;
        approvedCount: number;
        totalApprovalDays: number;
        maxApprovalDays: number;
      }
    >();

    for (const application of approvedInPeriod) {
      const officeName = application.affiliationOffice?.name ?? 'Sin oficina';
      const creditProductName = application.creditProduct?.name ?? 'Sin linea';
      const key = `${officeName}::${creditProductName}`;
      const approvalDays = Math.max(
        0,
        differenceInCalendarDays(
          parseDateOnly(application.statusDate ?? application.applicationDate),
          parseDateOnly(application.applicationDate)
        )
      );

      const current = opportunityMap.get(key) ?? {
        officeName,
        creditProductName,
        approvedCount: 0,
        totalApprovalDays: 0,
        maxApprovalDays: 0,
      };

      current.approvedCount += 1;
      current.totalApprovalDays = roundMoney(current.totalApprovalDays + approvalDays);
      current.maxApprovalDays = Math.max(current.maxApprovalDays, approvalDays);
      opportunityMap.set(key, current);
    }

    const opportunityRows = [...opportunityMap.values()]
      .map((row) => ({
        officeName: row.officeName,
        creditProductName: row.creditProductName,
        approvedCount: row.approvedCount,
        averageApprovalDays:
          row.approvedCount > 0 ? roundMoney(row.totalApprovalDays / row.approvedCount) : 0,
        maxApprovalDays: row.maxApprovalDays,
      }))
      .sort(
        (left, right) =>
          left.creditProductName.localeCompare(right.creditProductName) ||
          left.officeName.localeCompare(right.officeName)
      );

    const collectionGeneralMap = new Map<
      string,
      { creditProductName: string; scheduledAmount: number; collectedAmount: number }
    >();
    const collectionByOfficeMap = new Map<
      string,
      { officeName: string; creditProductName: string; scheduledAmount: number; collectedAmount: number }
    >();

    for (const row of scheduledReceivables) {
      const creditProductName = row.creditProductName ?? 'Sin linea';
      const officeName = row.officeName ?? 'Sin oficina';
      const amount = roundMoney(Number(row.amount));

      const generalCurrent = collectionGeneralMap.get(creditProductName) ?? {
        creditProductName,
        scheduledAmount: 0,
        collectedAmount: 0,
      };
      generalCurrent.scheduledAmount = roundMoney(generalCurrent.scheduledAmount + amount);
      collectionGeneralMap.set(creditProductName, generalCurrent);

      const officeKey = `${officeName}::${creditProductName}`;
      const officeCurrent = collectionByOfficeMap.get(officeKey) ?? {
        officeName,
        creditProductName,
        scheduledAmount: 0,
        collectedAmount: 0,
      };
      officeCurrent.scheduledAmount = roundMoney(officeCurrent.scheduledAmount + amount);
      collectionByOfficeMap.set(officeKey, officeCurrent);
    }

    for (const row of collectedPayments) {
      const creditProductName = row.creditProductName ?? 'Sin linea';
      const officeName = row.officeName ?? 'Sin oficina';
      const amount = roundMoney(Number(row.amount));

      const generalCurrent = collectionGeneralMap.get(creditProductName) ?? {
        creditProductName,
        scheduledAmount: 0,
        collectedAmount: 0,
      };
      generalCurrent.collectedAmount = roundMoney(generalCurrent.collectedAmount + amount);
      collectionGeneralMap.set(creditProductName, generalCurrent);

      const officeKey = `${officeName}::${creditProductName}`;
      const officeCurrent = collectionByOfficeMap.get(officeKey) ?? {
        officeName,
        creditProductName,
        scheduledAmount: 0,
        collectedAmount: 0,
      };
      officeCurrent.collectedAmount = roundMoney(officeCurrent.collectedAmount + amount);
      collectionByOfficeMap.set(officeKey, officeCurrent);
    }

    const collectionGeneralRows = [...collectionGeneralMap.values()]
      .map((row) => ({
        creditProductName: row.creditProductName,
        scheduledAmount: row.scheduledAmount,
        collectedAmount: row.collectedAmount,
        collectionRate:
          row.scheduledAmount > 0
            ? Number(((row.collectedAmount * 100) / row.scheduledAmount).toFixed(2))
            : 0,
      }))
      .sort((left, right) => left.creditProductName.localeCompare(right.creditProductName));

    const collectionByOfficeRows = [...collectionByOfficeMap.values()]
      .map((row) => ({
        officeName: row.officeName,
        creditProductName: row.creditProductName,
        scheduledAmount: row.scheduledAmount,
        collectedAmount: row.collectedAmount,
        collectionRate:
          row.scheduledAmount > 0
            ? Number(((row.collectedAmount * 100) / row.scheduledAmount).toFixed(2))
            : 0,
      }))
      .sort(
        (left, right) =>
          left.officeName.localeCompare(right.officeName) ||
          left.creditProductName.localeCompare(right.creditProductName)
      );

    const approvedMap = new Map<
      string,
      {
        creditProductName: string;
        approvedCountPeriod: number;
        approvedAmountPeriod: number;
        approvedCountYearToDate: number;
        approvedAmountYearToDate: number;
      }
    >();

    for (const application of approvedYearToDate) {
      const creditProductName = application.creditProduct?.name ?? 'Sin linea';
      const current = approvedMap.get(creditProductName) ?? {
        creditProductName,
        approvedCountPeriod: 0,
        approvedAmountPeriod: 0,
        approvedCountYearToDate: 0,
        approvedAmountYearToDate: 0,
      };
      current.approvedCountYearToDate += 1;
      current.approvedAmountYearToDate = roundMoney(
        current.approvedAmountYearToDate + Number(application.approvedAmount ?? '0')
      );
      approvedMap.set(creditProductName, current);
    }

    for (const application of approvedInPeriod) {
      const creditProductName = application.creditProduct?.name ?? 'Sin linea';
      const current = approvedMap.get(creditProductName) ?? {
        creditProductName,
        approvedCountPeriod: 0,
        approvedAmountPeriod: 0,
        approvedCountYearToDate: 0,
        approvedAmountYearToDate: 0,
      };
      current.approvedCountPeriod += 1;
      current.approvedAmountPeriod = roundMoney(
        current.approvedAmountPeriod + Number(application.approvedAmount ?? '0')
      );
      approvedMap.set(creditProductName, current);
    }

    const approvedRows = [...approvedMap.values()].sort((left, right) =>
      left.creditProductName.localeCompare(right.creditProductName)
    );

    return {
      status: 200 as const,
      body: {
        reportType: 'PORTFOLIO_INDICATORS' as const,
        startDate,
        endDate,
        creditProductName: creditProduct?.name ?? null,
        affiliationOfficeName: affiliationOffice?.name ?? null,
        opportunityRows,
        collectionGeneralRows,
        collectionByOfficeRows,
        approvedRows,
        message: 'Indicadores de cartera generados correctamente.',
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al generar indicadores de cartera',
    });
  }
}

async function generateCreditBalanceCertificate(
  body: GenerateCreditBalanceCertificateBody,
  context: HandlerContext
) {
  const { request, appRoute } = context;
  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);
    const normalizedCreditNumber = body.creditNumber.trim().toUpperCase();
    const cutoffDate = formatDateOnly(body.cutoffDate);
    const data = await buildCreditBalanceCertificateData(normalizedCreditNumber, body.cutoffDate);
    const pdfBase64 = await renderTemplateToBase64(data, creditBalanceCertificateTemplate);

    return {
      status: 200 as const,
      body: {
        reportType: 'CREDIT_BALANCE_CERTIFICATE_PDF' as const,
        creditNumber: normalizedCreditNumber,
        cutoffDate,
        fileName: `certificado-saldo-${normalizedCreditNumber.toLowerCase()}-${cutoffDate}.pdf`,
        pdfBase64,
        message: 'PDF de certificado de saldo generado correctamente.',
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al generar certificado de saldo del credito',
    });
  }
}

async function generateThirdPartyBalanceCertificate(
  body: GenerateThirdPartyBalanceCertificateBody,
  context: HandlerContext
) {
  const { request, appRoute } = context;
  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);
    const normalizedDocumentNumber = body.thirdPartyDocumentNumber.trim();
    const cutoffDate = formatDateOnly(body.cutoffDate);
    const data = await buildThirdPartyBalanceCertificateData(
      normalizedDocumentNumber,
      body.cutoffDate
    );
    const pdfBase64 = await renderTemplateToBase64(data, thirdPartyBalanceCertificateTemplate);

    return {
      status: 200 as const,
      body: {
        reportType: 'THIRD_PARTY_BALANCE_CERTIFICATE_PDF' as const,
        thirdPartyDocumentNumber: normalizedDocumentNumber,
        cutoffDate,
        fileName: `certificado-saldo-tercero-${normalizedDocumentNumber}-${cutoffDate}.pdf`,
        pdfBase64,
        message: 'PDF de certificado de saldo del tercero generado correctamente.',
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al generar certificado de saldo del tercero',
    });
  }
}

export const portfolioReport = tsr.router(contract.portfolioReport, {
  generateCurrentPortfolio: ({ body }, context) => generateCurrentPortfolio(body, context),
  generateHistoricalPortfolioByPeriod: ({ body }, context) =>
    generateHistoricalPortfolioByPeriod(body, context),
  generateCreditsForCollection: ({ body }, context) => generateCreditsForCollection(body, context),
  generatePayrollPortfolioByAgreement: ({ body }, context) =>
    generatePayrollPortfolioByAgreement(body, context),
  generatePortfolioByCreditType: ({ body }, context) => generatePortfolioByCreditType(body, context),
  generatePortfolioIndicators: ({ body }, context) => generatePortfolioIndicators(body, context),
  generateCreditBalanceCertificate: ({ body }, context) =>
    generateCreditBalanceCertificate(body, context),
  generateThirdPartyBalanceCertificate: ({ body }, context) =>
    generateThirdPartyBalanceCertificate(body, context),
});
