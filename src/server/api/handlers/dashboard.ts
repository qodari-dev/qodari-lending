import { DashboardSummary } from '@/schemas/dashboard';
import {
  accountingPeriods,
  affiliationOffices,
  channels,
  creditFundBudgets,
  creditFunds,
  db,
  investmentTypes,
  loanApplicationApprovalHistory,
  loanApplicationStatusHistory,
  loanApplications,
  loanPaymentMethodAllocations,
  loanPayments,
  loans,
  paymentTenderTypes,
  rejectionReasons,
  thirdParties,
} from '@/server/db';
import { genericTsRestErrorResponse, throwHttpError } from '@/server/utils/generic-ts-rest-error';
import {
  getNextMonth,
  pad2,
  shiftMonth,
  toMonthStart,
  toUtcDateEndInclusive,
  toUtcDateStart,
} from '@/server/utils/date-utils';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { toInteger, toNullableInteger, toNumber, toSafeString } from '@/server/utils/value-utils';
import { tsr } from '@ts-rest/serverless/next';
import { and, eq, gte, lt, sql } from 'drizzle-orm';
import { contract } from '../contracts';

const CATEGORY_CODES = ['A', 'B', 'C', 'D'] as const;
const LOAN_APPLICATION_STATUS_ORDER = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELED'] as const;

const MONTH_LABEL_SHORT: Record<number, string> = {
  1: 'Ene',
  2: 'Feb',
  3: 'Mar',
  4: 'Abr',
  5: 'May',
  6: 'Jun',
  7: 'Jul',
  8: 'Ago',
  9: 'Sep',
  10: 'Oct',
  11: 'Nov',
  12: 'Dic',
};

const MONTH_LABEL_LONG: Record<number, string> = {
  1: 'Enero',
  2: 'Febrero',
  3: 'Marzo',
  4: 'Abril',
  5: 'Mayo',
  6: 'Junio',
  7: 'Julio',
  8: 'Agosto',
  9: 'Septiembre',
  10: 'Octubre',
  11: 'Noviembre',
  12: 'Diciembre',
};

type DashboardCacheEntry = {
  expiresAt: number;
  data: DashboardSummary;
};

const DASHBOARD_CACHE_TTL_MS = 5 * 60 * 1000;
const dashboardSummaryCache = new Map<number, DashboardCacheEntry>();

async function calculateDashboardSummary(accountingPeriodId: number): Promise<DashboardSummary> {
  const period = await db.query.accountingPeriods.findFirst({
    where: eq(accountingPeriods.id, accountingPeriodId),
  });

  if (!period) {
    throwHttpError({
      status: 404,
      message: 'Periodo contable no encontrado',
      code: 'NOT_FOUND',
    });
  }

  const periodStart = toMonthStart(period.year, period.month);
  const { year: nextYear, month: nextMonth } = getNextMonth(period.year, period.month);
  const periodNextStart = toMonthStart(nextYear, nextMonth);
  const periodEnd = toUtcDateEndInclusive(period.year, period.month);

  const periodStartAt = toUtcDateStart(periodStart);
  const periodNextStartAt = toUtcDateStart(periodNextStart);

  const trendStartMonth = shiftMonth(period.year, period.month, -11);
  const trendStart = toMonthStart(trendStartMonth.year, trendStartMonth.month);

  const [
    applicationsByCurrentStatusRows,
    applicationStatusTransitionRows,
    applicationsByOfficeRows,
    applicationsByChannelRows,
    applicationsByInvestmentTypeRows,
    topRejectionReasonResult,
    approvalAssignmentsResult,
    approvalActionsResult,
    pendingApprovalsResult,
    collectionTotalsRows,
    collectionByMethodRows,
    fundRows,
    naturalPeopleByCategoryRows,
    approvedLoansTotalsRows,
    approvedLoansByCategoryRows,
    approvedLoansTrendResult,
  ] = await Promise.all([
    db
      .select({
        status: loanApplications.status,
        total: sql<number>`count(*)::int`,
      })
      .from(loanApplications)
      .where(
        and(
          gte(loanApplications.applicationDate, periodStart),
          lt(loanApplications.applicationDate, periodNextStart)
        )
      )
      .groupBy(loanApplications.status),

    db
      .select({
        status: loanApplicationStatusHistory.toStatus,
        total: sql<number>`count(*)::int`,
      })
      .from(loanApplicationStatusHistory)
      .where(
        and(
          gte(loanApplicationStatusHistory.changedAt, periodStartAt),
          lt(loanApplicationStatusHistory.changedAt, periodNextStartAt)
        )
      )
      .groupBy(loanApplicationStatusHistory.toStatus),

    db
      .select({
        affiliationOfficeId: affiliationOffices.id,
        affiliationOfficeCode: affiliationOffices.code,
        affiliationOfficeName: affiliationOffices.name,
        total: sql<number>`count(*)::int`,
      })
      .from(loanApplications)
      .innerJoin(affiliationOffices, eq(loanApplications.affiliationOfficeId, affiliationOffices.id))
      .where(
        and(
          gte(loanApplications.applicationDate, periodStart),
          lt(loanApplications.applicationDate, periodNextStart)
        )
      )
      .groupBy(affiliationOffices.id, affiliationOffices.code, affiliationOffices.name)
      .orderBy(sql`count(*) desc`, affiliationOffices.name),

    db
      .select({
        channelId: channels.id,
        channelCode: channels.code,
        channelName: sql<string>`coalesce(${channels.name}, 'Sin canal')`,
        total: sql<number>`count(*)::int`,
      })
      .from(loanApplications)
      .leftJoin(channels, eq(loanApplications.channelId, channels.id))
      .where(
        and(
          gte(loanApplications.applicationDate, periodStart),
          lt(loanApplications.applicationDate, periodNextStart)
        )
      )
      .groupBy(channels.id, channels.code, channels.name)
      .orderBy(sql`count(*) desc`, channels.name),

    db
      .select({
        investmentTypeId: investmentTypes.id,
        investmentTypeName: sql<string>`coalesce(${investmentTypes.name}, 'Sin tipo de inversion')`,
        total: sql<number>`count(*)::int`,
        requestedAmountTotal: sql<string>`coalesce(sum(${loanApplications.requestedAmount}), 0)`,
      })
      .from(loanApplications)
      .leftJoin(investmentTypes, eq(loanApplications.investmentTypeId, investmentTypes.id))
      .where(
        and(
          gte(loanApplications.applicationDate, periodStart),
          lt(loanApplications.applicationDate, periodNextStart)
        )
      )
      .groupBy(investmentTypes.id, investmentTypes.name)
      .orderBy(
        sql`coalesce(sum(${loanApplications.requestedAmount}), 0) desc`,
        investmentTypes.name
      ),

    db.execute(sql<{
      rejectionReasonId: number | null;
      rejectionReasonName: string | null;
      total: number;
    }>`
      SELECT
        rr.id AS "rejectionReasonId",
        rr.name AS "rejectionReasonName",
        COUNT(*)::int AS "total"
      FROM ${loanApplicationStatusHistory} lash
      LEFT JOIN ${rejectionReasons} rr
        ON rr.id = CASE
          WHEN (lash.metadata->>'rejectionReasonId') ~ '^[0-9]+$'
          THEN (lash.metadata->>'rejectionReasonId')::int
          ELSE NULL
        END
      WHERE lash.to_status = 'REJECTED'
        AND lash.changed_at >= ${periodStartAt}
        AND lash.changed_at < ${periodNextStartAt}
      GROUP BY rr.id, rr.name
      ORDER BY COUNT(*) DESC, rr.name ASC
      LIMIT 5
    `),

    db.execute(sql<{
      userId: string | null;
      userName: string | null;
      assignedCount: number;
    }>`
      SELECT
        laah.assigned_to_user_id AS "userId",
        COALESCE(NULLIF(TRIM(laah.assigned_to_user_name), ''), laah.assigned_to_user_id::text, 'Sin usuario') AS "userName",
        COUNT(*)::int AS "assignedCount"
      FROM ${loanApplicationApprovalHistory} laah
      WHERE laah.action IN ('ASSIGNED', 'REASSIGNED')
        AND laah.assigned_to_user_id IS NOT NULL
        AND laah.occurred_at >= ${periodStartAt}
        AND laah.occurred_at < ${periodNextStartAt}
      GROUP BY laah.assigned_to_user_id, laah.assigned_to_user_name
    `),

    db.execute(sql<{
      userId: string | null;
      userName: string | null;
      workedCount: number;
      approvedFinalCount: number;
      forwardedCount: number;
      rejectedCount: number;
      canceledCount: number;
    }>`
      SELECT
        laah.actor_user_id AS "userId",
        COALESCE(NULLIF(TRIM(laah.actor_user_name), ''), laah.actor_user_id::text, 'Sin usuario') AS "userName",
        COUNT(*)::int AS "workedCount",
        COUNT(*) FILTER (WHERE laah.action = 'APPROVED_FINAL')::int AS "approvedFinalCount",
        COUNT(*) FILTER (WHERE laah.action = 'APPROVED_FORWARD')::int AS "forwardedCount",
        COUNT(*) FILTER (WHERE laah.action = 'REJECTED')::int AS "rejectedCount",
        COUNT(*) FILTER (WHERE laah.action = 'CANCELED')::int AS "canceledCount"
      FROM ${loanApplicationApprovalHistory} laah
      WHERE laah.action IN ('APPROVED_FORWARD', 'APPROVED_FINAL', 'REJECTED', 'CANCELED')
        AND laah.actor_user_id IS NOT NULL
        AND laah.occurred_at >= ${periodStartAt}
        AND laah.occurred_at < ${periodNextStartAt}
      GROUP BY laah.actor_user_id, laah.actor_user_name
    `),

    db.execute(sql<{
      userId: string | null;
      userName: string | null;
      pendingCount: number;
    }>`
      SELECT
        la.assigned_approval_user_id AS "userId",
        COALESCE(NULLIF(TRIM(la.assigned_approval_user_name), ''), la.assigned_approval_user_id::text, 'Sin usuario') AS "userName",
        COUNT(*)::int AS "pendingCount"
      FROM ${loanApplications} la
      WHERE la.status = 'PENDING'
        AND la.assigned_approval_user_id IS NOT NULL
        AND la.application_date >= ${periodStart}
        AND la.application_date < ${periodNextStart}
      GROUP BY la.assigned_approval_user_id, la.assigned_approval_user_name
    `),

    db
      .select({
        totalCount: sql<number>`count(*)::int`,
        totalAmount: sql<string>`coalesce(sum(${loanPayments.amount}), 0)`,
      })
      .from(loanPayments)
      .where(
        and(
          eq(loanPayments.status, 'PAID'),
          gte(loanPayments.paymentDate, periodStart),
          lt(loanPayments.paymentDate, periodNextStart)
        )
      ),

    db
      .select({
        collectionMethodId: paymentTenderTypes.id,
        collectionMethodName: paymentTenderTypes.name,
        collectionMethodType: paymentTenderTypes.type,
        paymentCount: sql<number>`count(distinct ${loanPaymentMethodAllocations.loanPaymentId})::int`,
        totalAmount: sql<string>`coalesce(sum(${loanPaymentMethodAllocations.amount}), 0)`,
      })
      .from(loanPaymentMethodAllocations)
      .innerJoin(loanPayments, eq(loanPaymentMethodAllocations.loanPaymentId, loanPayments.id))
      .innerJoin(
        paymentTenderTypes,
        eq(loanPaymentMethodAllocations.collectionMethodId, paymentTenderTypes.id)
      )
      .where(
        and(
          eq(loanPayments.status, 'PAID'),
          gte(loanPayments.paymentDate, periodStart),
          lt(loanPayments.paymentDate, periodNextStart)
        )
      )
      .groupBy(paymentTenderTypes.id, paymentTenderTypes.name, paymentTenderTypes.type)
      .orderBy(sql`coalesce(sum(${loanPaymentMethodAllocations.amount}), 0) desc`),

    db
      .select({
        creditFundId: creditFunds.id,
        creditFundName: creditFunds.name,
        isControlled: creditFunds.isControlled,
        fundAmount: sql<string>`coalesce(sum(${creditFundBudgets.fundAmount}), 0)`,
        reinvestmentAmount: sql<string>`coalesce(sum(${creditFundBudgets.reinvestmentAmount}), 0)`,
        expenseAmount: sql<string>`coalesce(sum(${creditFundBudgets.expenseAmount}), 0)`,
      })
      .from(creditFundBudgets)
      .innerJoin(creditFunds, eq(creditFundBudgets.creditFundId, creditFunds.id))
      .where(eq(creditFundBudgets.accountingPeriodId, accountingPeriodId))
      .groupBy(creditFunds.id, creditFunds.name, creditFunds.isControlled)
      .orderBy(creditFunds.name),

    db
      .select({
        categoryCode: thirdParties.categoryCode,
        total: sql<number>`count(*)::int`,
      })
      .from(thirdParties)
      .where(
        and(
          eq(thirdParties.personType, 'NATURAL'),
          gte(thirdParties.createdAt, periodStartAt),
          lt(thirdParties.createdAt, periodNextStartAt)
        )
      )
      .groupBy(thirdParties.categoryCode),

    db
      .select({
        approvedCount: sql<number>`count(*)::int`,
        approvedAmountTotal: sql<string>`coalesce(sum(${loans.principalAmount}), 0)`,
      })
      .from(loans)
      .where(and(gte(loans.recordDate, periodStart), lt(loans.recordDate, periodNextStart))),

    db
      .select({
        categoryCode: loanApplications.categoryCode,
        totalCount: sql<number>`count(*)::int`,
        totalAmount: sql<string>`coalesce(sum(${loans.principalAmount}), 0)`,
      })
      .from(loans)
      .innerJoin(loanApplications, eq(loans.loanApplicationId, loanApplications.id))
      .where(and(gte(loans.recordDate, periodStart), lt(loans.recordDate, periodNextStart)))
      .groupBy(loanApplications.categoryCode)
      .orderBy(sql`coalesce(sum(${loans.principalAmount}), 0) desc`),

    db.execute(sql<{
      year: number;
      month: number;
      totalCount: number;
      totalAmount: string;
    }>`
      SELECT
        EXTRACT(YEAR FROM l.record_date)::int AS "year",
        EXTRACT(MONTH FROM l.record_date)::int AS "month",
        COUNT(*)::int AS "totalCount",
        COALESCE(SUM(l.principal_amount), 0)::text AS "totalAmount"
      FROM ${loans} l
      WHERE l.record_date >= ${trendStart}
        AND l.record_date < ${periodNextStart}
      GROUP BY 1, 2
      ORDER BY 1, 2
    `),
  ]);

  const currentStatusMap = new Map(
    applicationsByCurrentStatusRows.map((row) => [row.status, Number(row.total ?? 0)])
  );

  const byCurrentStatus = LOAN_APPLICATION_STATUS_ORDER.map((status) => ({
    status,
    total: currentStatusMap.get(status) ?? 0,
  }));

  const createdCount = byCurrentStatus.reduce((acc, row) => acc + row.total, 0);

  const transitionMap = new Map(
    applicationStatusTransitionRows.map((row) => [row.status, Number(row.total ?? 0)])
  );

  const approvedCount = transitionMap.get('APPROVED') ?? 0;
  const rejectedCount = transitionMap.get('REJECTED') ?? 0;
  const canceledCount = transitionMap.get('CANCELED') ?? 0;

  const topRejectionReasons = (topRejectionReasonResult.rows as Array<Record<string, unknown>>).map(
    (row) => ({
      rejectionReasonId: toNullableInteger(row.rejectionReasonId),
      rejectionReasonName: toSafeString(row.rejectionReasonName, 'Sin motivo'),
      total: toInteger(row.total),
    })
  );

  const approvalsByUserMap = new Map<
    string,
    {
      userId: string;
      userName: string;
      assignedCount: number;
      workedCount: number;
      approvedFinalCount: number;
      forwardedCount: number;
      rejectedCount: number;
      canceledCount: number;
      pendingCount: number;
    }
  >();

  function ensureApproverSummary(userId: string, userName: string) {
    const existing = approvalsByUserMap.get(userId);

    if (existing) {
      if (!existing.userName || existing.userName === existing.userId) {
        existing.userName = userName;
      }
      return existing;
    }

    const created = {
      userId,
      userName,
      assignedCount: 0,
      workedCount: 0,
      approvedFinalCount: 0,
      forwardedCount: 0,
      rejectedCount: 0,
      canceledCount: 0,
      pendingCount: 0,
    };

    approvalsByUserMap.set(userId, created);
    return created;
  }

  for (const row of approvalAssignmentsResult.rows as Array<Record<string, unknown>>) {
    const userId = toSafeString(row.userId);
    if (!userId) continue;

    const entry = ensureApproverSummary(userId, toSafeString(row.userName, userId));
    entry.assignedCount = toInteger(row.assignedCount);
  }

  for (const row of approvalActionsResult.rows as Array<Record<string, unknown>>) {
    const userId = toSafeString(row.userId);
    if (!userId) continue;

    const entry = ensureApproverSummary(userId, toSafeString(row.userName, userId));
    entry.workedCount = toInteger(row.workedCount);
    entry.approvedFinalCount = toInteger(row.approvedFinalCount);
    entry.forwardedCount = toInteger(row.forwardedCount);
    entry.rejectedCount = toInteger(row.rejectedCount);
    entry.canceledCount = toInteger(row.canceledCount);
  }

  for (const row of pendingApprovalsResult.rows as Array<Record<string, unknown>>) {
    const userId = toSafeString(row.userId);
    if (!userId) continue;

    const entry = ensureApproverSummary(userId, toSafeString(row.userName, userId));
    entry.pendingCount = toInteger(row.pendingCount);
  }

  const approvalsByUser = Array.from(approvalsByUserMap.values()).sort((a, b) => {
    if (b.workedCount !== a.workedCount) return b.workedCount - a.workedCount;
    if (b.assignedCount !== a.assignedCount) return b.assignedCount - a.assignedCount;
    if (b.pendingCount !== a.pendingCount) return b.pendingCount - a.pendingCount;
    return a.userName.localeCompare(b.userName, 'es');
  });

  const totalAssignedCount = approvalsByUser.reduce((acc, row) => acc + row.assignedCount, 0);
  const totalWorkedCount = approvalsByUser.reduce((acc, row) => acc + row.workedCount, 0);
  const totalApprovedFinalCount = approvalsByUser.reduce(
    (acc, row) => acc + row.approvedFinalCount,
    0
  );
  const totalPendingCount = approvalsByUser.reduce((acc, row) => acc + row.pendingCount, 0);

  const applicationsByChannel = applicationsByChannelRows.map((row) => ({
    channelId: toNullableInteger(row.channelId),
    channelCode: toSafeString(row.channelCode, '') || null,
    channelName: toSafeString(row.channelName, 'Sin canal'),
    total: Number(row.total ?? 0),
  }));

  const applicationsByInvestmentType = applicationsByInvestmentTypeRows.map((row) => ({
    investmentTypeId: toNullableInteger(row.investmentTypeId),
    investmentTypeName: toSafeString(row.investmentTypeName, 'Sin tipo de inversion'),
    total: Number(row.total ?? 0),
    requestedAmountTotal: toNumber(row.requestedAmountTotal),
  }));

  const collectionTotals = collectionTotalsRows[0];
  const totalCollectionCount = Number(collectionTotals?.totalCount ?? 0);
  const totalCollectionAmount = toNumber(collectionTotals?.totalAmount ?? 0);

  const collectionsByMethod = collectionByMethodRows.map((row) => ({
    collectionMethodId: row.collectionMethodId,
    collectionMethodName: row.collectionMethodName,
    collectionMethodType: row.collectionMethodType,
    paymentCount: Number(row.paymentCount ?? 0),
    totalAmount: toNumber(row.totalAmount),
  }));

  const fundsByFund = fundRows.map((row) => {
    const fundAmount = toNumber(row.fundAmount);
    const reinvestmentAmount = toNumber(row.reinvestmentAmount);
    const expenseAmount = toNumber(row.expenseAmount);
    return {
      creditFundId: row.creditFundId,
      creditFundName: row.creditFundName,
      isControlled: row.isControlled,
      fundAmount,
      reinvestmentAmount,
      expenseAmount,
      availableAmount: fundAmount + reinvestmentAmount - expenseAmount,
    };
  });

  const totalFundAmount = fundsByFund.reduce((acc, row) => acc + row.fundAmount, 0);
  const totalReinvestmentAmount = fundsByFund.reduce((acc, row) => acc + row.reinvestmentAmount, 0);
  const totalExpenseAmount = fundsByFund.reduce((acc, row) => acc + row.expenseAmount, 0);
  const totalAvailableAmount = fundsByFund.reduce((acc, row) => acc + row.availableAmount, 0);

  const peopleByCategoryMap = new Map(
    naturalPeopleByCategoryRows.map((row) => [row.categoryCode, Number(row.total ?? 0)])
  );

  const peopleByCategory = CATEGORY_CODES.map((categoryCode) => ({
    categoryCode,
    total: peopleByCategoryMap.get(categoryCode) ?? 0,
  }));

  const totalNewNatural = peopleByCategory.reduce((acc, row) => acc + row.total, 0);

  const loansByCategoryMap = new Map(
    approvedLoansByCategoryRows.map((row) => [
      row.categoryCode,
      {
        totalCount: Number(row.totalCount ?? 0),
        totalAmount: toNumber(row.totalAmount),
      },
    ])
  );

  const loansByCategory = CATEGORY_CODES.map((categoryCode) => {
    const item = loansByCategoryMap.get(categoryCode);
    return {
      categoryCode,
      totalCount: item?.totalCount ?? 0,
      totalAmount: item?.totalAmount ?? 0,
    };
  });

  const approvedLoansTotals = approvedLoansTotalsRows[0];
  const approvedLoansCount = Number(approvedLoansTotals?.approvedCount ?? 0);
  const approvedLoansAmountTotal = toNumber(approvedLoansTotals?.approvedAmountTotal ?? 0);

  const trendMap = new Map(
    (approvedLoansTrendResult.rows as Array<Record<string, unknown>>).map((row) => [
      `${toInteger(row.year)}-${pad2(toInteger(row.month))}`,
      {
        totalCount: toInteger(row.totalCount),
        totalAmount: toNumber(row.totalAmount as string | number | null | undefined),
      },
    ])
  );

  const trendLast12Months = Array.from({ length: 12 }, (_, index) => {
    const offset = index - 11;
    const point = shiftMonth(period.year, period.month, offset);
    const key = `${point.year}-${pad2(point.month)}`;
    const values = trendMap.get(key);

    return {
      year: point.year,
      month: point.month,
      label: `${MONTH_LABEL_SHORT[point.month]} ${point.year}`,
      totalCount: values?.totalCount ?? 0,
      totalAmount: values?.totalAmount ?? 0,
    };
  });

  return {
    period: {
      id: period.id,
      year: period.year,
      month: period.month,
      label: `${MONTH_LABEL_LONG[period.month]} ${period.year}`,
      startDate: periodStart,
      endDate: periodEnd,
    },
    applications: {
      createdCount,
      approvedCount,
      rejectedCount,
      canceledCount,
      byCurrentStatus,
      byOffice: applicationsByOfficeRows.map((row) => ({
        affiliationOfficeId: row.affiliationOfficeId,
        affiliationOfficeCode: row.affiliationOfficeCode,
        affiliationOfficeName: row.affiliationOfficeName,
        total: Number(row.total ?? 0),
      })),
      byChannel: applicationsByChannel,
      byInvestmentType: applicationsByInvestmentType,
      topRejectionReasons,
    },
    collections: {
      totalCount: totalCollectionCount,
      totalAmount: totalCollectionAmount,
      byMethod: collectionsByMethod,
    },
    funds: {
      totalFundAmount,
      totalReinvestmentAmount,
      totalExpenseAmount,
      totalAvailableAmount,
      byFund: fundsByFund,
    },
    people: {
      totalNewNatural,
      byCategory: peopleByCategory,
    },
    loans: {
      approvedCount: approvedLoansCount,
      approvedAmountTotal: approvedLoansAmountTotal,
      byCategory: loansByCategory,
      trendLast12Months,
    },
    approvals: {
      totalAssignedCount,
      totalWorkedCount,
      totalApprovedFinalCount,
      totalPendingCount,
      byUser: approvalsByUser,
    },
  };
}

async function getDashboardSummaryFromCache(accountingPeriodId: number): Promise<DashboardSummary> {
  const cached = dashboardSummaryCache.get(accountingPeriodId);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const data = await calculateDashboardSummary(accountingPeriodId);

  dashboardSummaryCache.set(accountingPeriodId, {
    data,
    expiresAt: now + DASHBOARD_CACHE_TTL_MS,
  });

  return data;
}

export const dashboard = tsr.router(contract.dashboard, {
  getSummary: async ({ query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const body = await getDashboardSummaryFromCache(query.accountingPeriodId);

      return {
        status: 200 as const,
        body,
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: 'Error al consultar dashboard',
      });
    }
  },
});
