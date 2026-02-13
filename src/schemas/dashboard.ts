import { Contract } from '@/server/api/contracts';
import { MONTH_LABELS } from '@/schemas/accounting-period';
import { CategoryCodeSchema } from '@/schemas/category';
import { LOAN_APPLICATION_STATUS_OPTIONS } from '@/schemas/loan-application';
import { PAYMENT_TENDER_TYPE_VALUES } from '@/schemas/payment-tender-type';
import { ClientInferResponseBody } from '@ts-rest/core';
import { z } from 'zod';

export { MONTH_LABELS };

export const GetDashboardSummaryQuerySchema = z.object({
  accountingPeriodId: z.number().int().positive(),
});

export const DashboardPeriodSchema = z.object({
  id: z.number().int().positive(),
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  label: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
});

export const DashboardStatusCountSchema = z.object({
  status: z.enum(LOAN_APPLICATION_STATUS_OPTIONS),
  total: z.number().int().nonnegative(),
});

export const DashboardApplicationsByOfficeSchema = z.object({
  affiliationOfficeId: z.number().int().positive(),
  affiliationOfficeCode: z.string().nullable(),
  affiliationOfficeName: z.string(),
  total: z.number().int().nonnegative(),
});

export const DashboardApplicationsByChannelSchema = z.object({
  channelId: z.number().int().positive().nullable(),
  channelCode: z.string().nullable(),
  channelName: z.string(),
  total: z.number().int().nonnegative(),
});

export const DashboardApplicationsByInvestmentTypeSchema = z.object({
  investmentTypeId: z.number().int().positive().nullable(),
  investmentTypeName: z.string(),
  total: z.number().int().nonnegative(),
  requestedAmountTotal: z.number().nonnegative(),
});

export const DashboardTopRejectionReasonSchema = z.object({
  rejectionReasonId: z.number().int().positive().nullable(),
  rejectionReasonName: z.string(),
  total: z.number().int().nonnegative(),
});

export const DashboardCollectionByMethodSchema = z.object({
  collectionMethodId: z.number().int().positive(),
  collectionMethodName: z.string(),
  collectionMethodType: z.enum(PAYMENT_TENDER_TYPE_VALUES),
  paymentCount: z.number().int().nonnegative(),
  totalAmount: z.number().nonnegative(),
});

export const DashboardFundSummarySchema = z.object({
  creditFundId: z.number().int().positive(),
  creditFundName: z.string(),
  isControlled: z.boolean(),
  fundAmount: z.number(),
  reinvestmentAmount: z.number(),
  expenseAmount: z.number(),
  availableAmount: z.number(),
});

export const DashboardCategoryCountSchema = z.object({
  categoryCode: CategoryCodeSchema,
  total: z.number().int().nonnegative(),
});

export const DashboardLoanCategorySummarySchema = z.object({
  categoryCode: CategoryCodeSchema,
  totalCount: z.number().int().nonnegative(),
  totalAmount: z.number().nonnegative(),
});

export const DashboardLoanTrendPointSchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  label: z.string().min(1),
  totalCount: z.number().int().nonnegative(),
  totalAmount: z.number().nonnegative(),
});

export const DashboardSummaryResponseSchema = z.object({
  period: DashboardPeriodSchema,
  applications: z.object({
    createdCount: z.number().int().nonnegative(),
    approvedCount: z.number().int().nonnegative(),
    rejectedCount: z.number().int().nonnegative(),
    canceledCount: z.number().int().nonnegative(),
    byCurrentStatus: z.array(DashboardStatusCountSchema),
    byOffice: z.array(DashboardApplicationsByOfficeSchema),
    byChannel: z.array(DashboardApplicationsByChannelSchema),
    byInvestmentType: z.array(DashboardApplicationsByInvestmentTypeSchema),
    topRejectionReasons: z.array(DashboardTopRejectionReasonSchema),
  }),
  collections: z.object({
    totalCount: z.number().int().nonnegative(),
    totalAmount: z.number().nonnegative(),
    byMethod: z.array(DashboardCollectionByMethodSchema),
  }),
  funds: z.object({
    totalFundAmount: z.number(),
    totalReinvestmentAmount: z.number(),
    totalExpenseAmount: z.number(),
    totalAvailableAmount: z.number(),
    byFund: z.array(DashboardFundSummarySchema),
  }),
  people: z.object({
    totalNewNatural: z.number().int().nonnegative(),
    byCategory: z.array(DashboardCategoryCountSchema),
  }),
  loans: z.object({
    approvedCount: z.number().int().nonnegative(),
    approvedAmountTotal: z.number().nonnegative(),
    byCategory: z.array(DashboardLoanCategorySummarySchema),
    trendLast12Months: z.array(DashboardLoanTrendPointSchema),
  }),
});

export type DashboardSummary = ClientInferResponseBody<Contract['dashboard']['getSummary'], 200>;
export type GetDashboardSummaryQuery = z.infer<typeof GetDashboardSummaryQuerySchema>;
