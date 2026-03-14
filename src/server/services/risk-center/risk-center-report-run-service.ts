import { db, loans, riskCenterReportItems, riskCenterReportRuns } from '@/server/db';
import { RiskCenterReportType } from '@/schemas/risk-center-report';
import { formatDateOnly } from '@/server/utils/value-utils';
import { eq } from 'drizzle-orm';

export type PersistRiskCenterRunItem = {
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

type PersistRiskCenterRunArgs = {
  riskCenterType: RiskCenterReportType;
  creditCutoffDate: Date;
  paymentCutoffDate: Date;
  reviewedCredits: number;
  reportedCredits: number;
  fileName: string;
  generatedByUserId: string;
  generatedByUserName: string;
  message: string;
  items: PersistRiskCenterRunItem[];
};

export async function persistRiskCenterReportRun(args: PersistRiskCenterRunArgs) {
  const paymentCutoffDate = formatDateOnly(args.paymentCutoffDate);
  const creditCutoffDate = formatDateOnly(args.creditCutoffDate);

  return db.transaction(async (tx) => {
    const [run] = await tx
      .insert(riskCenterReportRuns)
      .values({
        riskCenterType: args.riskCenterType,
        creditCutoffDate,
        paymentCutoffDate,
        reviewedCredits: args.reviewedCredits,
        reportedCredits: args.reportedCredits,
        fileName: args.fileName,
        generatedByUserId: args.generatedByUserId,
        generatedByUserName: args.generatedByUserName,
        note: args.message,
        metadata: {
          message: args.message,
        },
      })
      .returning();

    if (args.items.length) {
      await tx.insert(riskCenterReportItems).values(
        args.items.map((item) => ({
          riskCenterReportRunId: run.id,
          loanId: item.loanId,
          riskCenterType: args.riskCenterType,
          reportDate: paymentCutoffDate,
          wasReported: item.wasReported,
          reportedStatus: item.reportedStatus,
          daysPastDue: item.daysPastDue,
          currentBalance: item.currentBalance.toFixed(2),
          overdueBalance: item.overdueBalance.toFixed(2),
          reportedThirdPartiesCount: item.reportedThirdPartiesCount,
          note: item.note ?? null,
          metadata: item.metadata ?? null,
        }))
      );

      for (const item of args.items) {
        await tx
          .update(loans)
          .set({
            isReportedToRiskCenter: item.wasReported,
            riskCenterReportDate: paymentCutoffDate,
          })
          .where(eq(loans.id, item.loanId));
      }
    }

    return run;
  });
}
