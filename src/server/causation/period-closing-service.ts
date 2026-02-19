import {
  accountingPeriods,
  agingBuckets,
  agingProfiles,
  db,
  loanApplications,
  loanInstallments,
  loans,
  portfolioAgingSnapshots,
  portfolioEntries,
  portfolioProvisionSnapshotDetails,
  portfolioProvisionSnapshots,
  processRuns,
} from '@/server/db';
import { throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { roundMoney, toDecimalString, toNumber } from '@/server/utils/value-utils';
import { differenceInCalendarDays, format, lastDayOfMonth } from 'date-fns';
import { and, asc, desc, eq, inArray, or, sql } from 'drizzle-orm';

type CloseCausationPeriodInput = {
  accountingPeriodId: number;
  executedByUserId: string;
  executedByUserName: string;
};

type CloseCausationPeriodResult = {
  accountingPeriodId: number;
  periodLabel: string;
  closedAt: string;
  insertedAgingSnapshots: number;
  insertedProvisionSnapshots: number;
  insertedAccrualSnapshots: number;
  message: string;
};

type ActiveBucket = {
  id: number;
  daysFrom: number;
  daysTo: number | null;
  provisionRate: string | null;
};

type PortfolioSnapshotRow = {
  glAccountId: number;
  thirdPartyId: number;
  loanId: number;
  dueDate: string;
  balance: string;
  affiliationOfficeId: number;
  creditProductId: number;
  categoryCode: 'A' | 'B' | 'C' | 'D';
  repaymentMethodId: number | null;
  installmentPrincipalAmount: string | null;
  installmentInterestAmount: string | null;
  installmentInsuranceAmount: string | null;
};

type GroupAccumulator = {
  key: string;
  loanId: number;
  glAccountId: number;
  thirdPartyId: number;
  affiliationOfficeId: number;
  creditProductId: number;
  categoryCode: 'A' | 'B' | 'C' | 'D';
  repaymentMethodId: number;
  principalAmount: number;
  installmentValue: number;
  daysPastDue: number;
  currentAmount: number;
  totalPastDue: number;
  totalPortfolio: number;
  bucketBases: Map<number, number>;
};

function parseDateOnly(value: string) {
  return new Date(`${value}T00:00:00`);
}

function toDateOnly(value: Date) {
  return format(value, 'yyyy-MM-dd');
}

function resolveBucket(daysPastDue: number, buckets: ActiveBucket[]) {
  return (
    buckets.find(
      (bucket) =>
        daysPastDue >= bucket.daysFrom && (bucket.daysTo === null || daysPastDue <= bucket.daysTo)
    ) ?? null
  );
}

export async function closeCausationPeriod(
  input: CloseCausationPeriodInput
): Promise<CloseCausationPeriodResult> {
  return db.transaction(async (tx) => {
    const period = await tx.query.accountingPeriods.findFirst({
      where: and(
        eq(accountingPeriods.id, input.accountingPeriodId),
        eq(accountingPeriods.isClosed, false)
      ),
      columns: {
        id: true,
        year: true,
        month: true,
      },
    });

    if (!period) {
      throwHttpError({
        status: 404,
        code: 'NOT_FOUND',
        message: 'Periodo contable abierto no encontrado',
      });
    }

    const periodLabel = `${period.year}-${String(period.month).padStart(2, '0')}`;
    const periodEndDate = lastDayOfMonth(new Date(period.year, period.month - 1, 1));
    const periodEndDateOnly = toDateOnly(periodEndDate);

    const pendingRun = await tx.query.processRuns.findFirst({
      where: and(
        eq(processRuns.accountingPeriodId, period.id),
        inArray(processRuns.status, ['QUEUED', 'RUNNING'])
      ),
      columns: { id: true },
    });
    if (pendingRun) {
      throwHttpError({
        status: 409,
        code: 'CONFLICT',
        message: 'No se puede cerrar el periodo con corridas pendientes o en ejecución',
      });
    }

    const activeProfiles = await tx.query.agingProfiles.findMany({
      where: eq(agingProfiles.isActive, true),
      columns: { id: true, name: true },
      limit: 2,
    });

    if (!activeProfiles.length) {
      throwHttpError({
        status: 400,
        code: 'BAD_REQUEST',
        message: 'No existe un perfil de aging activo para generar snapshots',
      });
    }

    if (activeProfiles.length > 1) {
      throwHttpError({
        status: 409,
        code: 'CONFLICT',
        message: 'Existen múltiples perfiles de aging activos',
      });
    }

    const agingProfile = activeProfiles[0]!;
    const buckets = await tx.query.agingBuckets.findMany({
      where: and(eq(agingBuckets.agingProfileId, agingProfile.id), eq(agingBuckets.isActive, true)),
      columns: {
        id: true,
        daysFrom: true,
        daysTo: true,
        provisionRate: true,
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

    const existingAgingSnapshot = await tx.query.portfolioAgingSnapshots.findFirst({
      where: and(
        eq(portfolioAgingSnapshots.accountingPeriodId, period.id),
        eq(portfolioAgingSnapshots.agingProfileId, agingProfile.id)
      ),
      columns: { id: true },
    });
    if (existingAgingSnapshot) {
      throwHttpError({
        status: 409,
        code: 'CONFLICT',
        message: 'Ya existen snapshots de cartera para este periodo',
      });
    }

    const existingProvisionSnapshot = await tx.query.portfolioProvisionSnapshots.findFirst({
      where: and(
        eq(portfolioProvisionSnapshots.accountingPeriodId, period.id),
        eq(portfolioProvisionSnapshots.agingProfileId, agingProfile.id)
      ),
      columns: { id: true },
    });
    if (existingProvisionSnapshot) {
      throwHttpError({
        status: 409,
        code: 'CONFLICT',
        message: 'Ya existen snapshots de provisión para este periodo',
      });
    }

    const rows = await tx
      .select({
        glAccountId: portfolioEntries.glAccountId,
        thirdPartyId: portfolioEntries.thirdPartyId,
        loanId: portfolioEntries.loanId,
        dueDate: portfolioEntries.dueDate,
        balance: portfolioEntries.balance,
        affiliationOfficeId: loans.affiliationOfficeId,
        creditProductId: loanApplications.creditProductId,
        categoryCode: loanApplications.categoryCode,
        repaymentMethodId: loans.repaymentMethodId,
        installmentPrincipalAmount: loanInstallments.principalAmount,
        installmentInterestAmount: loanInstallments.interestAmount,
        installmentInsuranceAmount: loanInstallments.insuranceAmount,
      })
      .from(portfolioEntries)
      .innerJoin(loans, eq(portfolioEntries.loanId, loans.id))
      .innerJoin(loanApplications, eq(loans.loanApplicationId, loanApplications.id))
      .leftJoin(
        loanInstallments,
        and(
          eq(loanInstallments.loanId, portfolioEntries.loanId),
          eq(loanInstallments.installmentNumber, portfolioEntries.installmentNumber)
        )
      )
      .where(
        and(
          eq(portfolioEntries.status, 'OPEN'),
          sql`${portfolioEntries.balance} > 0`,
          inArray(loans.status, ['ACTIVE', 'ACCOUNTED'])
        )
      );

    const groupByLoanAndAccount = new Map<string, GroupAccumulator>();

    for (const row of rows as PortfolioSnapshotRow[]) {
      if (!row.affiliationOfficeId || !row.repaymentMethodId) {
        throwHttpError({
          status: 400,
          code: 'BAD_REQUEST',
          message: `Crédito ${row.loanId} sin oficina o método de recaudo`,
        });
      }

      const key = `${row.loanId}:${row.glAccountId}`;
      const bucketDate = parseDateOnly(row.dueDate);
      const daysPastDue = Math.max(0, differenceInCalendarDays(periodEndDate, bucketDate));
      const bucket = resolveBucket(daysPastDue, buckets);
      if (!bucket) {
        throwHttpError({
          status: 400,
          code: 'BAD_REQUEST',
          message: `No existe bucket de aging para ${daysPastDue} días de mora`,
        });
      }

      const balance = roundMoney(toNumber(row.balance));
      const installmentValue = roundMoney(
        toNumber(row.installmentPrincipalAmount ?? '0') +
          toNumber(row.installmentInterestAmount ?? '0') +
          toNumber(row.installmentInsuranceAmount ?? '0')
      );

      const current = groupByLoanAndAccount.get(key) ?? {
        key,
        loanId: row.loanId,
        glAccountId: row.glAccountId,
        thirdPartyId: row.thirdPartyId,
        affiliationOfficeId: row.affiliationOfficeId,
        creditProductId: row.creditProductId,
        categoryCode: row.categoryCode,
        repaymentMethodId: row.repaymentMethodId,
        principalAmount: 0,
        installmentValue: 0,
        daysPastDue: 0,
        currentAmount: 0,
        totalPastDue: 0,
        totalPortfolio: 0,
        bucketBases: new Map<number, number>(),
      } satisfies GroupAccumulator;

      current.principalAmount = roundMoney(current.principalAmount + balance);
      current.totalPortfolio = roundMoney(current.totalPortfolio + balance);
      current.daysPastDue = Math.max(current.daysPastDue, daysPastDue);
      current.installmentValue = Math.max(current.installmentValue, installmentValue);
      if (daysPastDue > 0) {
        current.totalPastDue = roundMoney(current.totalPastDue + balance);
      } else {
        current.currentAmount = roundMoney(current.currentAmount + balance);
      }

      const bucketBase = current.bucketBases.get(bucket.id) ?? 0;
      current.bucketBases.set(bucket.id, roundMoney(bucketBase + balance));
      groupByLoanAndAccount.set(key, current);
    }

    const groupedSnapshots = Array.from(groupByLoanAndAccount.values());

    const insertedAgingRows =
      groupedSnapshots.length > 0
        ? await tx
            .insert(portfolioAgingSnapshots)
            .values(
              groupedSnapshots.map((group) => ({
                accountingPeriodId: period.id,
                agingProfileId: agingProfile.id,
                generatedByUserId: input.executedByUserId,
                affiliationOfficeId: group.affiliationOfficeId,
                creditProductId: group.creditProductId,
                glAccountId: group.glAccountId,
                loanId: group.loanId,
                thirdPartyId: group.thirdPartyId,
                categoryCode: group.categoryCode,
                principalAmount: toDecimalString(group.principalAmount),
                installmentValue: toDecimalString(group.installmentValue),
                repaymentMethodId: group.repaymentMethodId,
                daysPastDue: group.daysPastDue,
                currentAmount: toDecimalString(group.currentAmount),
                totalPastDue: toDecimalString(group.totalPastDue),
                totalPortfolio: toDecimalString(group.totalPortfolio),
              }))
            )
            .returning({
              id: portfolioAgingSnapshots.id,
              loanId: portfolioAgingSnapshots.loanId,
              glAccountId: portfolioAgingSnapshots.glAccountId,
            })
        : [];

    const agingSnapshotIdByKey = new Map(
      insertedAgingRows.map((item) => [`${item.loanId}:${item.glAccountId}`, item.id])
    );

    const previousProvisionSnapshot = await tx
      .select({
        totalRequiredProvision: portfolioProvisionSnapshots.totalRequiredProvision,
      })
      .from(portfolioProvisionSnapshots)
      .innerJoin(
        accountingPeriods,
        eq(portfolioProvisionSnapshots.accountingPeriodId, accountingPeriods.id)
      )
      .where(
        and(
          eq(portfolioProvisionSnapshots.agingProfileId, agingProfile.id),
          or(
            sql`${accountingPeriods.year} < ${period.year}`,
            and(
              eq(accountingPeriods.year, period.year),
              sql`${accountingPeriods.month} < ${period.month}`
            )
          )
        )
      )
      .orderBy(desc(accountingPeriods.year), desc(accountingPeriods.month))
      .limit(1);

    const previousProvisionBalance = roundMoney(
      toNumber(previousProvisionSnapshot[0]?.totalRequiredProvision ?? '0')
    );

    let totalBaseAmount = 0;
    let totalRequiredProvision = 0;
    const provisionDetailValues: Array<typeof portfolioProvisionSnapshotDetails.$inferInsert> = [];

    for (const group of groupedSnapshots) {
      const agingSnapshotId = agingSnapshotIdByKey.get(group.key);
      if (!agingSnapshotId) continue;

      for (const [bucketId, baseAmountRaw] of group.bucketBases.entries()) {
        const baseAmount = roundMoney(baseAmountRaw);
        if (baseAmount <= 0) continue;

        const bucket = buckets.find((item) => item.id === bucketId);
        if (!bucket) continue;

        const provisionRate = toNumber(bucket.provisionRate ?? '0');
        const provisionAmount = roundMoney((baseAmount * provisionRate) / 100);

        totalBaseAmount = roundMoney(totalBaseAmount + baseAmount);
        totalRequiredProvision = roundMoney(totalRequiredProvision + provisionAmount);

        provisionDetailValues.push({
          provisionSnapshotId: 0,
          agingSnapshotId,
          agingBucketId: bucketId,
          baseAmount: toDecimalString(baseAmount),
          provisionRate: bucket.provisionRate,
          provisionAmount: toDecimalString(provisionAmount),
        });
      }
    }

    const deltaToPost = roundMoney(totalRequiredProvision - previousProvisionBalance);
    const [provisionSnapshot] = await tx
      .insert(portfolioProvisionSnapshots)
      .values({
        accountingPeriodId: period.id,
        agingProfileId: agingProfile.id,
        generatedByUserId: input.executedByUserId,
        totalBaseAmount: toDecimalString(totalBaseAmount),
        totalRequiredProvision: toDecimalString(totalRequiredProvision),
        previousProvisionBalance: toDecimalString(previousProvisionBalance),
        deltaToPost: toDecimalString(deltaToPost),
        note: `Cierre ${periodLabel}`,
        metadata: {
          periodEndDate: periodEndDateOnly,
          agingSnapshots: insertedAgingRows.length,
        },
      })
      .returning({ id: portfolioProvisionSnapshots.id });

    if (provisionDetailValues.length > 0) {
      await tx.insert(portfolioProvisionSnapshotDetails).values(
        provisionDetailValues.map((item) => ({
          ...item,
          provisionSnapshotId: provisionSnapshot!.id,
        }))
      );
    }

    const accrualSnapshotCountResult = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(processRuns)
      .where(
        and(
          eq(processRuns.accountingPeriodId, period.id),
          inArray(processRuns.processType, ['INTEREST', 'LATE_INTEREST', 'INSURANCE', 'OTHER']),
          eq(processRuns.status, 'COMPLETED')
        )
      );
    const insertedAccrualSnapshots = accrualSnapshotCountResult[0]?.count ?? 0;

    const [closedPeriod] = await tx
      .update(accountingPeriods)
      .set({
        isClosed: true,
        closedAt: new Date(),
        closedByUserId: input.executedByUserId,
        closedByUserName: input.executedByUserName,
      })
      .where(and(eq(accountingPeriods.id, period.id), eq(accountingPeriods.isClosed, false)))
      .returning({
        id: accountingPeriods.id,
        closedAt: accountingPeriods.closedAt,
      });

    if (!closedPeriod) {
      throwHttpError({
        status: 409,
        code: 'CONFLICT',
        message: 'El periodo ya fue cerrado por otro proceso',
      });
    }

    return {
      accountingPeriodId: period.id,
      periodLabel,
      closedAt: toDateOnly(closedPeriod.closedAt ?? new Date()),
      insertedAgingSnapshots: insertedAgingRows.length,
      insertedProvisionSnapshots: provisionSnapshot ? 1 : 0,
      insertedAccrualSnapshots,
      message: `Cierre completado. Aging: ${insertedAgingRows.length}, Provisión: ${provisionSnapshot ? 1 : 0}, Causación: ${insertedAccrualSnapshots}.`,
    };
  });
}
