import { Contract } from '@/server/api/contracts';
import { ClientInferResponseBody } from '@ts-rest/core';
import { z } from 'zod';

export const CurrentPortfolioGroupBySchema = z.enum(['CREDIT', 'GL_ACCOUNT']);

export const GenerateCurrentPortfolioBodySchema = z.object({
  creditProductId: z.number().int().positive(),
  cutoffDate: z.coerce.date(),
  groupBy: CurrentPortfolioGroupBySchema,
});

export const CurrentPortfolioBucketSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  daysFrom: z.number().int().nonnegative(),
  daysTo: z.number().int().nonnegative().nullable(),
});

export const CurrentPortfolioReportRowSchema = z.object({
  rowKey: z.string().min(1),
  groupBy: CurrentPortfolioGroupBySchema,
  creditNumber: z.string().min(1).nullable(),
  thirdPartyDocumentNumber: z.string().nullable(),
  thirdPartyName: z.string().nullable(),
  agreementName: z.string().nullable(),
  creditProductName: z.string().nullable(),
  auxiliaryCode: z.string().nullable(),
  auxiliaryName: z.string().nullable(),
  status: z.string().min(1).nullable(),
  reviewedCreditsCount: z.number().int().nonnegative().nullable(),
  outstandingBalance: z.number().nonnegative(),
  overdueBalance: z.number().nonnegative(),
  maxDaysPastDue: z.number().int().nonnegative(),
  bucketBalances: z.record(z.string(), z.number().nonnegative()),
  note: z.string().nullable(),
});

export type CurrentPortfolioReportRow = z.infer<typeof CurrentPortfolioReportRowSchema>;

export const GenerateCurrentPortfolioResponseSchema = z.object({
  reportType: z.literal('CURRENT_PORTFOLIO'),
  cutoffDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  groupBy: CurrentPortfolioGroupBySchema,
  agingProfileName: z.string().min(1),
  creditProductName: z.string().min(1),
  buckets: z.array(CurrentPortfolioBucketSchema),
  reviewedCredits: z.number().int().nonnegative(),
  reportedCredits: z.number().int().nonnegative(),
  rows: z.array(CurrentPortfolioReportRowSchema),
  message: z.string(),
});

export type GenerateCurrentPortfolioReportResult = ClientInferResponseBody<
  Contract['portfolioReport']['generateCurrentPortfolio'],
  200
>;

export const GenerateHistoricalPortfolioByPeriodBodySchema = z.object({
  creditProductId: z.number().int().positive(),
  cutoffDate: z.coerce.date(),
  groupBy: CurrentPortfolioGroupBySchema,
});

export const HistoricalPortfolioByPeriodReportRowSchema = z.object({
  rowKey: z.string().min(1),
  groupBy: CurrentPortfolioGroupBySchema,
  creditNumber: z.string().min(1).nullable(),
  thirdPartyDocumentNumber: z.string().nullable(),
  thirdPartyName: z.string().nullable(),
  agreementName: z.string().nullable(),
  creditProductName: z.string().nullable(),
  auxiliaryCode: z.string().nullable(),
  auxiliaryName: z.string().nullable(),
  status: z.string().min(1).nullable(),
  reviewedCreditsCount: z.number().int().nonnegative().nullable(),
  daysPastDue: z.number().int().nonnegative(),
  installmentValue: z.number().nonnegative(),
  currentAmount: z.number().nonnegative(),
  overdueBalance: z.number().nonnegative(),
  outstandingBalance: z.number().nonnegative(),
  bucketBalances: z.record(z.string(), z.number().nonnegative()),
  note: z.string().nullable(),
});

export type HistoricalPortfolioByPeriodReportRow = z.infer<
  typeof HistoricalPortfolioByPeriodReportRowSchema
>;

export const GenerateHistoricalPortfolioByPeriodResponseSchema = z.object({
  reportType: z.literal('HISTORICAL_PORTFOLIO_BY_PERIOD'),
  cutoffDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  groupBy: CurrentPortfolioGroupBySchema,
  periodLabel: z.string().min(1),
  agingProfileName: z.string().min(1),
  creditProductName: z.string().min(1),
  buckets: z.array(CurrentPortfolioBucketSchema),
  reviewedCredits: z.number().int().nonnegative(),
  reportedCredits: z.number().int().nonnegative(),
  rows: z.array(HistoricalPortfolioByPeriodReportRowSchema),
  message: z.string(),
});

export type GenerateHistoricalPortfolioByPeriodReportResult = ClientInferResponseBody<
  Contract['portfolioReport']['generateHistoricalPortfolioByPeriod'],
  200
>;

export const GenerateCreditsForCollectionBodySchema = z.object({
  cutoffDate: z.coerce.date(),
});

export const CreditsForCollectionReportRowSchema = z.object({
  item: z.number().int().positive(),
  officeName: z.string().min(1),
  creditNumber: z.string().min(1),
  loanStatus: z.string().min(1),
  thirdPartyDocumentNumber: z.string().nullable(),
  thirdPartyName: z.string().min(1),
  employerDocumentNumber: z.string().nullable(),
  employerBusinessName: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  cityName: z.string().nullable(),
  agreementName: z.string().nullable(),
  creditProductName: z.string().nullable(),
  approvalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  maturityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  repaymentMethodName: z.string().nullable(),
  creditValue: z.number().nonnegative(),
  installments: z.number().int().nonnegative(),
  installmentValue: z.number().nonnegative(),
  salary: z.number().nonnegative(),
  categoryLabel: z.string().nullable(),
  financingFactor: z.number().nonnegative(),
  paidCapitalAmount: z.number().nonnegative(),
  paidCurrentInterestAmount: z.number().nonnegative(),
  paidLateInterestAmount: z.number().nonnegative(),
  totalPaidAmount: z.number().nonnegative(),
  overdueCapitalAmount: z.number().nonnegative(),
  overdueCurrentInterestAmount: z.number().nonnegative(),
  overdueLateInterestAmount: z.number().nonnegative(),
  totalOverdueAmount: z.number().nonnegative(),
  totalPastDueDays: z.number().int().nonnegative(),
  currentCapitalAmount: z.number().nonnegative(),
  currentCurrentInterestAmount: z.number().nonnegative(),
  totalCurrentAmount: z.number().nonnegative(),
  totalPortfolioAmount: z.number().nonnegative(),
  lastPaymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  isWrittenOff: z.boolean(),
  note: z.string().nullable(),
});

export type CreditsForCollectionReportRow = z.infer<typeof CreditsForCollectionReportRowSchema>;

export const GenerateCreditsForCollectionResponseSchema = z.object({
  reportType: z.literal('CREDITS_FOR_COLLECTION'),
  cutoffDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reviewedCredits: z.number().int().nonnegative(),
  reportedCredits: z.number().int().nonnegative(),
  rows: z.array(CreditsForCollectionReportRowSchema),
  message: z.string(),
});

export type GenerateCreditsForCollectionReportResult = ClientInferResponseBody<
  Contract['portfolioReport']['generateCreditsForCollection'],
  200
>;

export const GeneratePayrollPortfolioByAgreementBodySchema = z.object({
  agreementId: z.number().int().positive(),
  cutoffDate: z.coerce.date(),
});

export const PayrollPortfolioByAgreementReportRowSchema = z.object({
  item: z.number().int().positive(),
  creditNumber: z.string().min(1),
  thirdPartyDocumentNumber: z.string().nullable(),
  thirdPartyName: z.string().min(1),
  employerBusinessName: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  cityName: z.string().nullable(),
  agreementName: z.string().min(1),
  creditProductName: z.string().nullable(),
  repaymentMethodName: z.string().nullable(),
  loanStatus: z.string().min(1),
  creditStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  firstCollectionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  maturityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  nextDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  daysPastDue: z.number().int().nonnegative(),
  installments: z.number().int().nonnegative(),
  installmentValue: z.number().nonnegative(),
  totalPortfolioAmount: z.number().nonnegative(),
  overdueBalance: z.number().nonnegative(),
  currentBalance: z.number().nonnegative(),
  lastPaymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  note: z.string().nullable(),
});

export type PayrollPortfolioByAgreementReportRow = z.infer<
  typeof PayrollPortfolioByAgreementReportRowSchema
>;

export const GeneratePayrollPortfolioByAgreementResponseSchema = z.object({
  reportType: z.literal('PAYROLL_PORTFOLIO_BY_AGREEMENT'),
  cutoffDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  agreementName: z.string().min(1),
  reviewedCredits: z.number().int().nonnegative(),
  reportedCredits: z.number().int().nonnegative(),
  rows: z.array(PayrollPortfolioByAgreementReportRowSchema),
  message: z.string(),
});

export type GeneratePayrollPortfolioByAgreementReportResult = ClientInferResponseBody<
  Contract['portfolioReport']['generatePayrollPortfolioByAgreement'],
  200
>;

export const GeneratePortfolioByCreditTypeBodySchema = z.object({
  creditProductId: z.number().int().positive(),
});

export const PortfolioByCreditTypeReportRowSchema = z.object({
  item: z.number().int().positive(),
  creditNumber: z.string().min(1),
  thirdPartyDocumentNumber: z.string().nullable(),
  thirdPartyName: z.string().min(1),
  creditValue: z.number().nonnegative(),
  paidAmount: z.number().nonnegative(),
  outstandingBalance: z.number().nonnegative(),
  note: z.string().nullable(),
});

export type PortfolioByCreditTypeReportRow = z.infer<typeof PortfolioByCreditTypeReportRowSchema>;

export const GeneratePortfolioByCreditTypeResponseSchema = z.object({
  reportType: z.literal('PORTFOLIO_BY_CREDIT_TYPE'),
  cutoffDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  creditProductName: z.string().min(1),
  reviewedCredits: z.number().int().nonnegative(),
  reportedCredits: z.number().int().nonnegative(),
  rows: z.array(PortfolioByCreditTypeReportRowSchema),
  message: z.string(),
});

export type GeneratePortfolioByCreditTypeReportResult = ClientInferResponseBody<
  Contract['portfolioReport']['generatePortfolioByCreditType'],
  200
>;

export const GenerateCreditBalanceCertificateBodySchema = z.object({
  creditNumber: z.string().trim().min(1).max(20),
  cutoffDate: z.coerce.date(),
});

export const GenerateCreditBalanceCertificateResponseSchema = z.object({
  reportType: z.literal('CREDIT_BALANCE_CERTIFICATE_PDF'),
  creditNumber: z.string().min(1),
  cutoffDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fileName: z.string().min(1),
  pdfBase64: z.string().min(1),
  message: z.string(),
});

export type GenerateCreditBalanceCertificateReportResult = ClientInferResponseBody<
  Contract['portfolioReport']['generateCreditBalanceCertificate'],
  200
>;

export const GenerateThirdPartyBalanceCertificateBodySchema = z.object({
  thirdPartyDocumentNumber: z.string().trim().min(1).max(20),
  cutoffDate: z.coerce.date(),
});

export const GenerateThirdPartyBalanceCertificateResponseSchema = z.object({
  reportType: z.literal('THIRD_PARTY_BALANCE_CERTIFICATE_PDF'),
  thirdPartyDocumentNumber: z.string().min(1),
  cutoffDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fileName: z.string().min(1),
  pdfBase64: z.string().min(1),
  message: z.string(),
});

export type GenerateThirdPartyBalanceCertificateReportResult = ClientInferResponseBody<
  Contract['portfolioReport']['generateThirdPartyBalanceCertificate'],
  200
>;

export const GeneratePortfolioIndicatorsBodySchema = z
  .object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    creditProductId: z.number().int().positive().optional(),
    affiliationOfficeId: z.number().int().positive().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.endDate < value.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'La fecha final debe ser mayor o igual a la fecha inicial',
      });
    }
  });

export const PortfolioIndicatorOpportunityRowSchema = z.object({
  officeName: z.string().min(1),
  creditProductName: z.string().min(1),
  approvedCount: z.number().int().nonnegative(),
  averageApprovalDays: z.number().nonnegative(),
  maxApprovalDays: z.number().int().nonnegative(),
});

export const PortfolioIndicatorCollectionGeneralRowSchema = z.object({
  creditProductName: z.string().min(1),
  scheduledAmount: z.number().nonnegative(),
  collectedAmount: z.number().nonnegative(),
  collectionRate: z.number().nonnegative(),
});

export const PortfolioIndicatorCollectionByOfficeRowSchema = z.object({
  officeName: z.string().min(1),
  creditProductName: z.string().min(1),
  scheduledAmount: z.number().nonnegative(),
  collectedAmount: z.number().nonnegative(),
  collectionRate: z.number().nonnegative(),
});

export const PortfolioIndicatorApprovedRowSchema = z.object({
  creditProductName: z.string().min(1),
  approvedCountPeriod: z.number().int().nonnegative(),
  approvedAmountPeriod: z.number().nonnegative(),
  approvedCountYearToDate: z.number().int().nonnegative(),
  approvedAmountYearToDate: z.number().nonnegative(),
});

export type PortfolioIndicatorOpportunityRow = z.infer<typeof PortfolioIndicatorOpportunityRowSchema>;
export type PortfolioIndicatorCollectionGeneralRow = z.infer<
  typeof PortfolioIndicatorCollectionGeneralRowSchema
>;
export type PortfolioIndicatorCollectionByOfficeRow = z.infer<
  typeof PortfolioIndicatorCollectionByOfficeRowSchema
>;
export type PortfolioIndicatorApprovedRow = z.infer<typeof PortfolioIndicatorApprovedRowSchema>;

export const GeneratePortfolioIndicatorsResponseSchema = z.object({
  reportType: z.literal('PORTFOLIO_INDICATORS'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  creditProductName: z.string().nullable(),
  affiliationOfficeName: z.string().nullable(),
  opportunityRows: z.array(PortfolioIndicatorOpportunityRowSchema),
  collectionGeneralRows: z.array(PortfolioIndicatorCollectionGeneralRowSchema),
  collectionByOfficeRows: z.array(PortfolioIndicatorCollectionByOfficeRowSchema),
  approvedRows: z.array(PortfolioIndicatorApprovedRowSchema),
  message: z.string(),
});

export type GeneratePortfolioIndicatorsReportResult = ClientInferResponseBody<
  Contract['portfolioReport']['generatePortfolioIndicators'],
  200
>;
