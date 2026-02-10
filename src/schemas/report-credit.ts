import { Contract } from '@/server/api/contracts';
import { LoanBalanceSummary, LoanStatement } from '@/schemas/loan';
import { ClientInferResponseBody } from '@ts-rest/core';
import { z } from 'zod';

export const GetCreditExtractReportQuerySchema = z.object({
  creditNumber: z.string().trim().min(1).max(20),
});

export type CreditExtractReportLoan = {
  id: number;
  creditNumber: string;
  status: string;
  recordDate: string;
  creditStartDate: string;
  maturityDate: string;
  firstCollectionDate: string | null;
  borrowerDocumentNumber: string | null;
  borrowerName: string;
  affiliationOfficeName: string | null;
  agreementLabel: string | null;
};

export type CreditExtractReportResponse = {
  loan: CreditExtractReportLoan;
  balanceSummary: LoanBalanceSummary;
  statement: LoanStatement;
  generatedAt: string;
};

export type CreditExtractReportResult = ClientInferResponseBody<
  Contract['reportCredit']['getExtract'],
  200
>;
