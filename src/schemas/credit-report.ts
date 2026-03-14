import { Contract } from '@/server/api/contracts';
import { LoanBalanceSummary, LoanStatement } from '@/schemas/loan';
import { ClientInferResponseBody } from '@ts-rest/core';
import { z } from 'zod';

function buildDateRangeBodySchema() {
  return z
    .object({
      startDate: z.coerce.date(),
      endDate: z.coerce.date(),
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
}

function buildDateRangeResponse<
  TReportType extends string,
  TRowsSchema extends z.ZodTypeAny,
>(reportType: TReportType, rowsSchema: TRowsSchema) {
  return z.object({
    reportType: z.literal(reportType),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    reviewedCredits: z.number().int().nonnegative(),
    reportedCredits: z.number().int().nonnegative(),
    rows: z.array(rowsSchema),
    message: z.string(),
  });
}

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

export type CreditExtractClientMovement = {
  id: string;
  entryDate: string;
  movement: string;
  reference: string;
  concept: string;
  chargeAmount: string;
  paymentAmount: string;
  runningBalance: string;
};

export type CreditExtractClientStatement = {
  from: string | null;
  to: string | null;
  openingBalance: string;
  closingBalance: string;
  totalCharges: string;
  totalPayments: string;
  movements: CreditExtractClientMovement[];
};

export type CreditExtractReportResponse = {
  loan: CreditExtractReportLoan;
  balanceSummary: LoanBalanceSummary;
  statement: LoanStatement;
  clientStatement: CreditExtractClientStatement;
  generatedAt: string;
};

// Cuotas pagadas
export const GeneratePaidInstallmentsReportBodySchema = z.object({
  creditNumber: z.string().trim().min(1).max(20),
});
export const GeneratePaidInstallmentsReportResponseSchema = z.object({
  reportType: z.literal('PAID_INSTALLMENTS_PDF'),
  creditNumber: z.string().min(1),
  fileName: z.string().min(1),
  pdfBase64: z.string().min(1),
  message: z.string(),
});
export type GeneratePaidInstallmentsReportResult = ClientInferResponseBody<
  Contract['creditReport']['generatePaidInstallments'],
  200
>;

// Creditos liquidados
export const GenerateLiquidatedCreditsReportBodySchema = buildDateRangeBodySchema();
export const LiquidatedCreditsReportRowSchema = z.object({
  creditNumber: z.string().min(1),
  thirdPartyDocumentNumber: z.string().nullable(),
  thirdPartyName: z.string().min(1),
  liquidatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  liquidatedAmount: z.number().nonnegative(),
});
export type LiquidatedCreditsReportRow = z.infer<typeof LiquidatedCreditsReportRowSchema>;
export const GenerateLiquidatedCreditsReportResponseSchema = buildDateRangeResponse(
  'LIQUIDATED_CREDITS',
  LiquidatedCreditsReportRowSchema
);
export type GenerateLiquidatedCreditsReportResult = ClientInferResponseBody<
  Contract['creditReport']['generateLiquidatedCredits'],
  200
>;

// Creditos no liquidados
export const GenerateNonLiquidatedCreditsReportBodySchema = z.object({});
export const NonLiquidatedCreditsReportRowSchema = z.object({
  creditNumber: z.string().min(1),
  requestNumber: z.string().min(1),
  thirdPartyDocumentNumber: z.string().nullable(),
  thirdPartyName: z.string().min(1),
  creditProductName: z.string().nullable(),
  affiliationOfficeName: z.string().nullable(),
  applicationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.string().min(1),
  requestedAmount: z.number().nonnegative(),
  approvedAmount: z.number().nonnegative(),
});
export type NonLiquidatedCreditsReportRow = z.infer<typeof NonLiquidatedCreditsReportRowSchema>;
export const GenerateNonLiquidatedCreditsReportResponseSchema = z.object({
  reportType: z.literal('NON_LIQUIDATED_CREDITS'),
  reviewedCredits: z.number().int().nonnegative(),
  reportedCredits: z.number().int().nonnegative(),
  rows: z.array(NonLiquidatedCreditsReportRowSchema),
  message: z.string(),
});
export type GenerateNonLiquidatedCreditsReportResult = ClientInferResponseBody<
  Contract['creditReport']['generateNonLiquidatedCredits'],
  200
>;

// Creditos liquidados no desembolsados
export const GenerateLiquidatedNotDisbursedCreditsReportBodySchema = z.object({});
export const LiquidatedNotDisbursedCreditsReportRowSchema = z.object({
  creditNumber: z.string().min(1),
  requestNumber: z.string().min(1),
  thirdPartyDocumentNumber: z.string().nullable(),
  thirdPartyName: z.string().min(1),
  creditProductName: z.string().nullable(),
  affiliationOfficeName: z.string().nullable(),
  applicationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  liquidatedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  status: z.string().min(1),
  disbursementStatus: z.string().min(1),
  requestedAmount: z.number().nonnegative(),
  approvedAmount: z.number().nonnegative(),
  disbursementAmount: z.number().nonnegative(),
});
export type LiquidatedNotDisbursedCreditsReportRow = z.infer<
  typeof LiquidatedNotDisbursedCreditsReportRowSchema
>;
export const GenerateLiquidatedNotDisbursedCreditsReportResponseSchema = z.object({
  reportType: z.literal('LIQUIDATED_NOT_DISBURSED_CREDITS'),
  reviewedCredits: z.number().int().nonnegative(),
  reportedCredits: z.number().int().nonnegative(),
  rows: z.array(LiquidatedNotDisbursedCreditsReportRowSchema),
  message: z.string(),
});
export type GenerateLiquidatedNotDisbursedCreditsReportResult = ClientInferResponseBody<
  Contract['creditReport']['generateLiquidatedNotDisbursedCredits'],
  200
>;

// Creditos anulados/rechazados
export const CANCELLED_REJECTED_CREDITS_REPORT_TYPE_OPTIONS = [
  'CANCELED',
  'REJECTED',
  'VOID',
] as const;
export type CancelledRejectedCreditsReportType =
  (typeof CANCELLED_REJECTED_CREDITS_REPORT_TYPE_OPTIONS)[number];

export const cancelledRejectedCreditsReportTypeLabels: Record<
  CancelledRejectedCreditsReportType,
  string
> = {
  CANCELED: 'Cancelados',
  REJECTED: 'Rechazados',
  VOID: 'Anulados',
};

export const GenerateCancelledRejectedCreditsReportBodySchema = z
  .object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    reportType: z.enum(CANCELLED_REJECTED_CREDITS_REPORT_TYPE_OPTIONS),
  })
  .superRefine((value, ctx) => {
    if (value.endDate < value.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'La fecha final de estado debe ser mayor o igual a la inicial',
      });
    }
  });
export const CancelledRejectedCreditsReportRowSchema = z.object({
  requestNumber: z.string().min(1),
  creditNumber: z.string().nullable(),
  thirdPartyDocumentNumber: z.string().nullable(),
  thirdPartyName: z.string().min(1),
  creditProductName: z.string().nullable(),
  applicationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.string().min(1),
  rejectionReason: z.string().nullable(),
  statusDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  requestedAmount: z.number().nonnegative(),
  approvedAmount: z.number().nonnegative(),
});
export type CancelledRejectedCreditsReportRow = z.infer<typeof CancelledRejectedCreditsReportRowSchema>;
export const GenerateCancelledRejectedCreditsReportResponseSchema = z.object({
  reportType: z.literal('CANCELLED_REJECTED_CREDITS'),
  filterType: z.enum(CANCELLED_REJECTED_CREDITS_REPORT_TYPE_OPTIONS),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reviewedCredits: z.number().int().nonnegative(),
  reportedCredits: z.number().int().nonnegative(),
  rows: z.array(CancelledRejectedCreditsReportRowSchema),
  message: z.string(),
});
export type GenerateCancelledRejectedCreditsReportResult = ClientInferResponseBody<
  Contract['creditReport']['generateCancelledRejectedCredits'],
  200
>;

// Creditos saldados
export const GenerateSettledCreditsReportBodySchema = buildDateRangeBodySchema();
export const SettledCreditsReportRowSchema = z.object({
  creditNumber: z.string().min(1),
  thirdPartyDocumentNumber: z.string().nullable(),
  thirdPartyName: z.string().min(1),
  settledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  lastPaymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  creditAmount: z.number().nonnegative(),
});
export type SettledCreditsReportRow = z.infer<typeof SettledCreditsReportRowSchema>;
export const GenerateSettledCreditsReportResponseSchema = buildDateRangeResponse(
  'SETTLED_CREDITS',
  SettledCreditsReportRowSchema
);
export type GenerateSettledCreditsReportResult = ClientInferResponseBody<
  Contract['creditReport']['generateSettledCredits'],
  200
>;

// PDF Acta
export const GenerateMinutesPdfBodySchema = z.object({
  minutesNumber: z.string().trim().min(1).max(50),
});
export const MinutesReportOptionSchema = z.object({
  minutesNumber: z.string().min(1),
  actDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reviewedApplicationsCount: z.number().int().nonnegative(),
});
export const ListMinutesReportOptionsResponseSchema = z.array(MinutesReportOptionSchema);
export const GenerateMinutesPdfResponseSchema = z.object({
  reportType: z.literal('MINUTES_PDF'),
  minutesNumber: z.string().min(1),
  fileName: z.string().min(1),
  pdfBase64: z.string().min(1),
  message: z.string(),
});
export type MinutesReportOption = z.infer<typeof MinutesReportOptionSchema>;
export type ListMinutesReportOptionsResult = ClientInferResponseBody<
  Contract['creditReport']['listMinutesOptions'],
  200
>;
export type GenerateMinutesPdfResult = ClientInferResponseBody<
  Contract['creditReport']['generateMinutesPdf'],
  200
>;

// PDF Paz y salvo credito
export const GenerateCreditClearancePdfBodySchema = z.object({
  creditNumber: z.string().trim().min(1).max(30),
});
export const GenerateCreditClearancePdfResponseSchema = z.object({
  reportType: z.literal('CREDIT_CLEARANCE_PDF'),
  creditNumber: z.string().min(1),
  fileName: z.string().min(1),
  pdfBase64: z.string().min(1),
  message: z.string(),
});
export type GenerateCreditClearancePdfResult = ClientInferResponseBody<
  Contract['creditReport']['generateCreditClearancePdf'],
  200
>;

// PDF Paz y salvo tercero
export const GenerateThirdPartyClearancePdfBodySchema = z.object({
  thirdPartyDocumentNumber: z.string().trim().min(1).max(30),
});
export const GenerateThirdPartyClearancePdfResponseSchema = z.object({
  reportType: z.literal('THIRD_PARTY_CLEARANCE_PDF'),
  thirdPartyDocumentNumber: z.string().min(1),
  fileName: z.string().min(1),
  pdfBase64: z.string().min(1),
  message: z.string(),
});
export type GenerateThirdPartyClearancePdfResult = ClientInferResponseBody<
  Contract['creditReport']['generateThirdPartyClearancePdf'],
  200
>;

export type GetCreditExtractReportResult = ClientInferResponseBody<
  Contract['creditReport']['getExtract'],
  200
>;

export type GetCreditExtractByLoanIdReportResult = ClientInferResponseBody<
  Contract['creditReport']['getExtractByLoanId'],
  200
>;
