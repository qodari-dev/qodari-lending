import { Contract } from '@/server/api/contracts';
import { ClientInferResponseBody } from '@ts-rest/core';
import { z } from 'zod';

export const GenerateCurrentPortfolioBodySchema = z.object({
  cutoffDate: z.coerce.date(),
});

export const CurrentPortfolioReportRowSchema = z.object({
  creditNumber: z.string().min(1),
  thirdPartyDocumentNumber: z.string().nullable(),
  thirdPartyName: z.string().min(1),
  agreementName: z.string().nullable(),
  creditProductName: z.string().nullable(),
  status: z.string().min(1),
  outstandingBalance: z.number().nonnegative(),
  overdueBalance: z.number().nonnegative(),
  note: z.string().nullable(),
});

export type CurrentPortfolioReportRow = z.infer<typeof CurrentPortfolioReportRowSchema>;

export const GenerateCurrentPortfolioResponseSchema = z.object({
  reportType: z.literal('CURRENT_PORTFOLIO'),
  cutoffDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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
  cutoffDate: z.coerce.date(),
});

export const HistoricalPortfolioByPeriodReportRowSchema = z.object({
  creditNumber: z.string().min(1),
  thirdPartyDocumentNumber: z.string().nullable(),
  thirdPartyName: z.string().min(1),
  agreementName: z.string().nullable(),
  creditProductName: z.string().nullable(),
  status: z.string().min(1),
  outstandingBalance: z.number().nonnegative(),
  overdueBalance: z.number().nonnegative(),
  note: z.string().nullable(),
});

export type HistoricalPortfolioByPeriodReportRow = z.infer<
  typeof HistoricalPortfolioByPeriodReportRowSchema
>;

export const GenerateHistoricalPortfolioByPeriodResponseSchema = z.object({
  reportType: z.literal('HISTORICAL_PORTFOLIO_BY_PERIOD'),
  cutoffDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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
  creditNumber: z.string().min(1),
  thirdPartyDocumentNumber: z.string().nullable(),
  thirdPartyName: z.string().min(1),
  agreementName: z.string().nullable(),
  creditProductName: z.string().nullable(),
  status: z.string().min(1),
  outstandingBalance: z.number().nonnegative(),
  overdueBalance: z.number().nonnegative(),
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
  cutoffDate: z.coerce.date(),
});

export const PayrollPortfolioByAgreementReportRowSchema = z.object({
  creditNumber: z.string().min(1),
  thirdPartyDocumentNumber: z.string().nullable(),
  thirdPartyName: z.string().min(1),
  agreementName: z.string().nullable(),
  creditProductName: z.string().nullable(),
  status: z.string().min(1),
  outstandingBalance: z.number().nonnegative(),
  overdueBalance: z.number().nonnegative(),
  note: z.string().nullable(),
});

export type PayrollPortfolioByAgreementReportRow = z.infer<
  typeof PayrollPortfolioByAgreementReportRowSchema
>;

export const GeneratePayrollPortfolioByAgreementResponseSchema = z.object({
  reportType: z.literal('PAYROLL_PORTFOLIO_BY_AGREEMENT'),
  cutoffDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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
  cutoffDate: z.coerce.date(),
});

export const PortfolioByCreditTypeReportRowSchema = z.object({
  creditNumber: z.string().min(1),
  thirdPartyDocumentNumber: z.string().nullable(),
  thirdPartyName: z.string().min(1),
  agreementName: z.string().nullable(),
  creditProductName: z.string().nullable(),
  status: z.string().min(1),
  outstandingBalance: z.number().nonnegative(),
  overdueBalance: z.number().nonnegative(),
  note: z.string().nullable(),
});

export type PortfolioByCreditTypeReportRow = z.infer<typeof PortfolioByCreditTypeReportRowSchema>;

export const GeneratePortfolioByCreditTypeResponseSchema = z.object({
  reportType: z.literal('PORTFOLIO_BY_CREDIT_TYPE'),
  cutoffDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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
  cutoffDate: z.coerce.date(),
});

export const CreditBalanceCertificateReportRowSchema = z.object({
  creditNumber: z.string().min(1),
  thirdPartyDocumentNumber: z.string().nullable(),
  thirdPartyName: z.string().min(1),
  agreementName: z.string().nullable(),
  creditProductName: z.string().nullable(),
  status: z.string().min(1),
  outstandingBalance: z.number().nonnegative(),
  overdueBalance: z.number().nonnegative(),
  note: z.string().nullable(),
});

export type CreditBalanceCertificateReportRow = z.infer<typeof CreditBalanceCertificateReportRowSchema>;

export const GenerateCreditBalanceCertificateResponseSchema = z.object({
  reportType: z.literal('CREDIT_BALANCE_CERTIFICATE'),
  cutoffDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reviewedCredits: z.number().int().nonnegative(),
  reportedCredits: z.number().int().nonnegative(),
  rows: z.array(CreditBalanceCertificateReportRowSchema),
  message: z.string(),
});

export type GenerateCreditBalanceCertificateReportResult = ClientInferResponseBody<
  Contract['portfolioReport']['generateCreditBalanceCertificate'],
  200
>;

export const GenerateThirdPartyBalanceCertificateBodySchema = z.object({
  cutoffDate: z.coerce.date(),
});

export const ThirdPartyBalanceCertificateReportRowSchema = z.object({
  creditNumber: z.string().min(1),
  thirdPartyDocumentNumber: z.string().nullable(),
  thirdPartyName: z.string().min(1),
  agreementName: z.string().nullable(),
  creditProductName: z.string().nullable(),
  status: z.string().min(1),
  outstandingBalance: z.number().nonnegative(),
  overdueBalance: z.number().nonnegative(),
  note: z.string().nullable(),
});

export type ThirdPartyBalanceCertificateReportRow = z.infer<
  typeof ThirdPartyBalanceCertificateReportRowSchema
>;

export const GenerateThirdPartyBalanceCertificateResponseSchema = z.object({
  reportType: z.literal('THIRD_PARTY_BALANCE_CERTIFICATE'),
  cutoffDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reviewedCredits: z.number().int().nonnegative(),
  reportedCredits: z.number().int().nonnegative(),
  rows: z.array(ThirdPartyBalanceCertificateReportRowSchema),
  message: z.string(),
});

export type GenerateThirdPartyBalanceCertificateReportResult = ClientInferResponseBody<
  Contract['portfolioReport']['generateThirdPartyBalanceCertificate'],
  200
>;

export const GeneratePortfolioIndicatorsBodySchema = z.object({
  cutoffDate: z.coerce.date(),
});

export const PortfolioIndicatorsReportRowSchema = z.object({
  indicatorCode: z.string().min(1),
  indicatorName: z.string().min(1),
  indicatorValue: z.number().nonnegative(),
  unit: z.enum(['PERCENTAGE', 'CURRENCY', 'COUNT']),
});

export type PortfolioIndicatorsReportRow = z.infer<typeof PortfolioIndicatorsReportRowSchema>;

export const GeneratePortfolioIndicatorsResponseSchema = z.object({
  reportType: z.literal('PORTFOLIO_INDICATORS'),
  cutoffDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reviewedCredits: z.number().int().nonnegative(),
  reportedCredits: z.number().int().nonnegative(),
  rows: z.array(PortfolioIndicatorsReportRowSchema),
  message: z.string(),
});

export type GeneratePortfolioIndicatorsReportResult = ClientInferResponseBody<
  Contract['portfolioReport']['generatePortfolioIndicators'],
  200
>;
