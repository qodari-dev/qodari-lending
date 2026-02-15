import { Contract } from '@/server/api/contracts';
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

// Cuotas pagadas
export const GeneratePaidInstallmentsReportBodySchema = buildDateRangeBodySchema();
export const PaidInstallmentsReportRowSchema = z.object({
  creditNumber: z.string().min(1),
  thirdPartyDocumentNumber: z.string().nullable(),
  thirdPartyName: z.string().min(1),
  paidInstallments: z.number().int().nonnegative(),
  paidAmount: z.number().nonnegative(),
});
export type PaidInstallmentsReportRow = z.infer<typeof PaidInstallmentsReportRowSchema>;
export const GeneratePaidInstallmentsReportResponseSchema = buildDateRangeResponse(
  'PAID_INSTALLMENTS',
  PaidInstallmentsReportRowSchema
);
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
export const GenerateNonLiquidatedCreditsReportBodySchema = buildDateRangeBodySchema();
export const NonLiquidatedCreditsReportRowSchema = z.object({
  creditNumber: z.string().min(1),
  thirdPartyDocumentNumber: z.string().nullable(),
  thirdPartyName: z.string().min(1),
  status: z.string().min(1),
  outstandingBalance: z.number().nonnegative(),
  daysPastDue: z.number().int().nonnegative(),
});
export type NonLiquidatedCreditsReportRow = z.infer<typeof NonLiquidatedCreditsReportRowSchema>;
export const GenerateNonLiquidatedCreditsReportResponseSchema = buildDateRangeResponse(
  'NON_LIQUIDATED_CREDITS',
  NonLiquidatedCreditsReportRowSchema
);
export type GenerateNonLiquidatedCreditsReportResult = ClientInferResponseBody<
  Contract['creditReport']['generateNonLiquidatedCredits'],
  200
>;

// Creditos anulados/rechazados
export const GenerateCancelledRejectedCreditsReportBodySchema = buildDateRangeBodySchema();
export const CancelledRejectedCreditsReportRowSchema = z.object({
  requestNumber: z.string().min(1),
  thirdPartyDocumentNumber: z.string().nullable(),
  thirdPartyName: z.string().min(1),
  status: z.string().min(1),
  rejectionReason: z.string().nullable(),
  statusDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type CancelledRejectedCreditsReportRow = z.infer<typeof CancelledRejectedCreditsReportRowSchema>;
export const GenerateCancelledRejectedCreditsReportResponseSchema = buildDateRangeResponse(
  'CANCELLED_REJECTED_CREDITS',
  CancelledRejectedCreditsReportRowSchema
);
export type GenerateCancelledRejectedCreditsReportResult = ClientInferResponseBody<
  Contract['creditReport']['generateCancelledRejectedCredits'],
  200
>;

// Comprobante de movimientos
export const GenerateMovementVoucherReportBodySchema = buildDateRangeBodySchema();
export const MovementVoucherReportRowSchema = z.object({
  creditNumber: z.string().min(1),
  movementDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  voucherNumber: z.string().min(1),
  movementType: z.string().min(1),
  amount: z.number().nonnegative(),
});
export type MovementVoucherReportRow = z.infer<typeof MovementVoucherReportRowSchema>;
export const GenerateMovementVoucherReportResponseSchema = buildDateRangeResponse(
  'MOVEMENT_VOUCHER',
  MovementVoucherReportRowSchema
);
export type GenerateMovementVoucherReportResult = ClientInferResponseBody<
  Contract['creditReport']['generateMovementVoucher'],
  200
>;

// Creditos saldados
export const GenerateSettledCreditsReportBodySchema = buildDateRangeBodySchema();
export const SettledCreditsReportRowSchema = z.object({
  creditNumber: z.string().min(1),
  thirdPartyDocumentNumber: z.string().nullable(),
  thirdPartyName: z.string().min(1),
  settledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  settledAmount: z.number().nonnegative(),
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

// Superintendencia
export const GenerateSuperintendenciaReportBodySchema = buildDateRangeBodySchema();
export const SuperintendenciaReportRowSchema = z.object({
  creditNumber: z.string().min(1),
  thirdPartyDocumentNumber: z.string().nullable(),
  thirdPartyName: z.string().min(1),
  status: z.string().min(1),
  outstandingBalance: z.number().nonnegative(),
  reportCode: z.string().min(1),
});
export type SuperintendenciaReportRow = z.infer<typeof SuperintendenciaReportRowSchema>;
export const GenerateSuperintendenciaReportResponseSchema = buildDateRangeResponse(
  'SUPERINTENDENCIA',
  SuperintendenciaReportRowSchema
);
export type GenerateSuperintendenciaReportResult = ClientInferResponseBody<
  Contract['creditReport']['generateSuperintendencia'],
  200
>;

// PDF Acta
export const GenerateMinutesPdfBodySchema = z.object({
  minutesNumber: z.string().trim().min(1).max(50),
});
export const GenerateMinutesPdfResponseSchema = z.object({
  reportType: z.literal('MINUTES_PDF'),
  minutesNumber: z.string().min(1),
  fileName: z.string().min(1),
  pdfBase64: z.string().min(1),
  message: z.string(),
});
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
