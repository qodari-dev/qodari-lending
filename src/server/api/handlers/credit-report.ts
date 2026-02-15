import {
  CancelledRejectedCreditsReportRow,
  GenerateCancelledRejectedCreditsReportBodySchema,
  GenerateCreditClearancePdfBodySchema,
  GenerateLiquidatedCreditsReportBodySchema,
  GenerateMinutesPdfBodySchema,
  GenerateMovementVoucherReportBodySchema,
  GenerateNonLiquidatedCreditsReportBodySchema,
  GeneratePaidInstallmentsReportBodySchema,
  GenerateSettledCreditsReportBodySchema,
  GenerateSuperintendenciaReportBodySchema,
  GenerateThirdPartyClearancePdfBodySchema,
  LiquidatedCreditsReportRow,
  MovementVoucherReportRow,
  NonLiquidatedCreditsReportRow,
  PaidInstallmentsReportRow,
  SettledCreditsReportRow,
  SuperintendenciaReportRow,
} from '@/schemas/credit-report';
import { genericTsRestErrorResponse } from '@/server/utils/generic-ts-rest-error';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { roundMoney } from '@/server/utils/value-utils';
import { tsr } from '@ts-rest/serverless/next';
import { differenceInCalendarDays, format } from 'date-fns';
import { z } from 'zod';
import { contract } from '../contracts';

type GeneratePaidInstallmentsReportBody = z.infer<typeof GeneratePaidInstallmentsReportBodySchema>;
type GenerateLiquidatedCreditsReportBody = z.infer<typeof GenerateLiquidatedCreditsReportBodySchema>;
type GenerateNonLiquidatedCreditsReportBody = z.infer<
  typeof GenerateNonLiquidatedCreditsReportBodySchema
>;
type GenerateCancelledRejectedCreditsReportBody = z.infer<
  typeof GenerateCancelledRejectedCreditsReportBodySchema
>;
type GenerateMovementVoucherReportBody = z.infer<typeof GenerateMovementVoucherReportBodySchema>;
type GenerateSettledCreditsReportBody = z.infer<typeof GenerateSettledCreditsReportBodySchema>;
type GenerateSuperintendenciaReportBody = z.infer<typeof GenerateSuperintendenciaReportBodySchema>;
type GenerateMinutesPdfBody = z.infer<typeof GenerateMinutesPdfBodySchema>;
type GenerateCreditClearancePdfBody = z.infer<typeof GenerateCreditClearancePdfBodySchema>;
type GenerateThirdPartyClearancePdfBody = z.infer<typeof GenerateThirdPartyClearancePdfBodySchema>;

type PermissionRequest = Parameters<typeof getAuthContextAndValidatePermission>[0];
type PermissionMetadata = Parameters<typeof getAuthContextAndValidatePermission>[1];

type HandlerContext = {
  request: PermissionRequest;
  appRoute: { metadata: PermissionMetadata };
};

function toDateOnly(value: Date) {
  return format(value, 'yyyy-MM-dd');
}

function buildRangeMeta(startDate: Date, endDate: Date, base: number) {
  const spanDays = Math.max(1, differenceInCalendarDays(endDate, startDate) + 1);
  const reviewedCredits = base + spanDays * 4;
  const reportedCredits = Math.max(10, Math.floor(reviewedCredits * 0.74));
  return { reviewedCredits, reportedCredits };
}

function pdfEscape(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildDemoPdfBase64(title: string, lines: string[]) {
  const allLines = [title, ...lines];
  const textOps = allLines
    .map((line, index) => `BT /F1 12 Tf 72 ${760 - index * 18} Td (${pdfEscape(line)}) Tj ET`)
    .join('\n');
  const streamContent = `${textOps}\n`;

  const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  const obj2 = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
  const obj3 =
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n';
  const obj4 = '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';
  const obj5 = `5 0 obj\n<< /Length ${Buffer.byteLength(streamContent, 'utf8')} >>\nstream\n${streamContent}endstream\nendobj\n`;

  const objects = [obj1, obj2, obj3, obj4, obj5];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += obj;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'utf8').toString('base64');
}

function buildPaidInstallmentsRows(count: number): PaidInstallmentsReportRow[] {
  return Array.from({ length: count }).map((_, index) => {
    const sequence = index + 1;
    return {
      creditNumber: `CRPI${String(sequence).padStart(6, '0')}`,
      thirdPartyDocumentNumber: `10${String(30000000 + sequence)}`,
      thirdPartyName: `Tercero ${sequence}`,
      paidInstallments: 2 + (sequence % 8),
      paidAmount: roundMoney((2 + (sequence % 8)) * 145_000),
    };
  });
}

function buildLiquidatedRows(count: number): LiquidatedCreditsReportRow[] {
  return Array.from({ length: count }).map((_, index) => {
    const sequence = index + 1;
    return {
      creditNumber: `CRLQ${String(sequence).padStart(6, '0')}`,
      thirdPartyDocumentNumber: `10${String(31000000 + sequence)}`,
      thirdPartyName: `Tercero ${sequence}`,
      liquidatedAt: toDateOnly(new Date(2026, 0, ((sequence % 27) || 1))),
      liquidatedAmount: roundMoney(1_400_000 + sequence * 82_000),
    };
  });
}

function buildNonLiquidatedRows(count: number): NonLiquidatedCreditsReportRow[] {
  return Array.from({ length: count }).map((_, index) => {
    const sequence = index + 1;
    const outstandingBalance = roundMoney(1_100_000 + sequence * 90_000);
    return {
      creditNumber: `CRNL${String(sequence).padStart(6, '0')}`,
      thirdPartyDocumentNumber: `10${String(32000000 + sequence)}`,
      thirdPartyName: `Tercero ${sequence}`,
      status: sequence % 4 === 0 ? 'EN MORA' : 'ACTIVO',
      outstandingBalance,
      daysPastDue: sequence % 4 === 0 ? 25 + sequence : 0,
    };
  });
}

function buildCancelledRejectedRows(count: number): CancelledRejectedCreditsReportRow[] {
  return Array.from({ length: count }).map((_, index) => {
    const sequence = index + 1;
    const rejected = sequence % 2 === 0;
    return {
      requestNumber: `SOL${String(sequence).padStart(6, '0')}`,
      thirdPartyDocumentNumber: `10${String(33000000 + sequence)}`,
      thirdPartyName: `Tercero ${sequence}`,
      status: rejected ? 'RECHAZADO' : 'ANULADO',
      rejectionReason: rejected ? 'Capacidad de pago insuficiente' : 'Desistimiento',
      statusDate: toDateOnly(new Date(2026, 0, ((sequence % 27) || 1))),
    };
  });
}

function buildMovementVoucherRows(count: number): MovementVoucherReportRow[] {
  return Array.from({ length: count }).map((_, index) => {
    const sequence = index + 1;
    return {
      creditNumber: `CRMV${String(sequence).padStart(6, '0')}`,
      movementDate: toDateOnly(new Date(2026, 0, ((sequence % 27) || 1))),
      voucherNumber: `CMP-${String(sequence).padStart(7, '0')}`,
      movementType: sequence % 2 === 0 ? 'ABONO' : 'CAUSACION',
      amount: roundMoney(120_000 + sequence * 11_500),
    };
  });
}

function buildSettledRows(count: number): SettledCreditsReportRow[] {
  return Array.from({ length: count }).map((_, index) => {
    const sequence = index + 1;
    return {
      creditNumber: `CRST${String(sequence).padStart(6, '0')}`,
      thirdPartyDocumentNumber: `10${String(34000000 + sequence)}`,
      thirdPartyName: `Tercero ${sequence}`,
      settledDate: toDateOnly(new Date(2026, 0, ((sequence % 27) || 1))),
      settledAmount: roundMoney(1_000_000 + sequence * 76_000),
    };
  });
}

function buildSuperintendenciaRows(count: number): SuperintendenciaReportRow[] {
  return Array.from({ length: count }).map((_, index) => {
    const sequence = index + 1;
    return {
      creditNumber: `CRSP${String(sequence).padStart(6, '0')}`,
      thirdPartyDocumentNumber: `10${String(35000000 + sequence)}`,
      thirdPartyName: `Tercero ${sequence}`,
      status: sequence % 3 === 0 ? 'EN MORA' : 'ACTIVO',
      outstandingBalance: roundMoney(1_350_000 + sequence * 70_000),
      reportCode: `SUP-${String((sequence % 9) + 1)}`,
    };
  });
}

async function generatePaidInstallments(
  body: GeneratePaidInstallmentsReportBody,
  context: HandlerContext
) {
  const { request, appRoute } = context;
  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);
    const meta = buildRangeMeta(body.startDate, body.endDate, 65);

    // TODO(credit-report-paid-installments): consultar cuotas pagadas en el rango y construir excel final.
    return {
      status: 200 as const,
      body: {
        reportType: 'PAID_INSTALLMENTS' as const,
        startDate: toDateOnly(body.startDate),
        endDate: toDateOnly(body.endDate),
        reviewedCredits: meta.reviewedCredits,
        reportedCredits: meta.reportedCredits,
        rows: buildPaidInstallmentsRows(meta.reportedCredits),
        message: 'Reporte de cuotas pagadas generado (demo).',
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, { genericMsg: 'Error al generar reporte de cuotas pagadas' });
  }
}

async function generateLiquidatedCredits(
  body: GenerateLiquidatedCreditsReportBody,
  context: HandlerContext
) {
  const { request, appRoute } = context;
  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);
    const meta = buildRangeMeta(body.startDate, body.endDate, 40);

    // TODO(credit-report-liquidated): consultar creditos liquidados en el rango y construir excel final.
    return {
      status: 200 as const,
      body: {
        reportType: 'LIQUIDATED_CREDITS' as const,
        startDate: toDateOnly(body.startDate),
        endDate: toDateOnly(body.endDate),
        reviewedCredits: meta.reviewedCredits,
        reportedCredits: meta.reportedCredits,
        rows: buildLiquidatedRows(meta.reportedCredits),
        message: 'Reporte de creditos liquidados generado (demo).',
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, { genericMsg: 'Error al generar reporte de creditos liquidados' });
  }
}

async function generateNonLiquidatedCredits(
  body: GenerateNonLiquidatedCreditsReportBody,
  context: HandlerContext
) {
  const { request, appRoute } = context;
  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);
    const meta = buildRangeMeta(body.startDate, body.endDate, 58);

    // TODO(credit-report-non-liquidated): consultar creditos no liquidados en el rango y construir excel final.
    return {
      status: 200 as const,
      body: {
        reportType: 'NON_LIQUIDATED_CREDITS' as const,
        startDate: toDateOnly(body.startDate),
        endDate: toDateOnly(body.endDate),
        reviewedCredits: meta.reviewedCredits,
        reportedCredits: meta.reportedCredits,
        rows: buildNonLiquidatedRows(meta.reportedCredits),
        message: 'Reporte de creditos no liquidados generado (demo).',
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al generar reporte de creditos no liquidados',
    });
  }
}

async function generateCancelledRejectedCredits(
  body: GenerateCancelledRejectedCreditsReportBody,
  context: HandlerContext
) {
  const { request, appRoute } = context;
  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);
    const meta = buildRangeMeta(body.startDate, body.endDate, 32);

    // TODO(credit-report-cancelled-rejected): consultar creditos anulados/rechazados en el rango y construir excel final.
    return {
      status: 200 as const,
      body: {
        reportType: 'CANCELLED_REJECTED_CREDITS' as const,
        startDate: toDateOnly(body.startDate),
        endDate: toDateOnly(body.endDate),
        reviewedCredits: meta.reviewedCredits,
        reportedCredits: meta.reportedCredits,
        rows: buildCancelledRejectedRows(meta.reportedCredits),
        message: 'Reporte de creditos anulados o rechazados generado (demo).',
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al generar reporte de creditos anulados/rechazados',
    });
  }
}

async function generateMovementVoucher(
  body: GenerateMovementVoucherReportBody,
  context: HandlerContext
) {
  const { request, appRoute } = context;
  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);
    const meta = buildRangeMeta(body.startDate, body.endDate, 70);

    // TODO(credit-report-movement-voucher): consultar movimientos en el rango y construir comprobante en excel.
    return {
      status: 200 as const,
      body: {
        reportType: 'MOVEMENT_VOUCHER' as const,
        startDate: toDateOnly(body.startDate),
        endDate: toDateOnly(body.endDate),
        reviewedCredits: meta.reviewedCredits,
        reportedCredits: meta.reportedCredits,
        rows: buildMovementVoucherRows(meta.reportedCredits),
        message: 'Comprobante de movimientos generado (demo).',
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al generar comprobante de movimientos',
    });
  }
}

async function generateSettledCredits(body: GenerateSettledCreditsReportBody, context: HandlerContext) {
  const { request, appRoute } = context;
  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);
    const meta = buildRangeMeta(body.startDate, body.endDate, 36);

    // TODO(credit-report-settled): consultar creditos saldados en el rango y construir excel final.
    return {
      status: 200 as const,
      body: {
        reportType: 'SETTLED_CREDITS' as const,
        startDate: toDateOnly(body.startDate),
        endDate: toDateOnly(body.endDate),
        reviewedCredits: meta.reviewedCredits,
        reportedCredits: meta.reportedCredits,
        rows: buildSettledRows(meta.reportedCredits),
        message: 'Reporte de creditos saldados generado (demo).',
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, { genericMsg: 'Error al generar reporte de creditos saldados' });
  }
}

async function generateSuperintendencia(
  body: GenerateSuperintendenciaReportBody,
  context: HandlerContext
) {
  const { request, appRoute } = context;
  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);
    const meta = buildRangeMeta(body.startDate, body.endDate, 68);

    // TODO(credit-report-superintendencia): construir reporte oficial de superintendencia con reglas vigentes.
    return {
      status: 200 as const,
      body: {
        reportType: 'SUPERINTENDENCIA' as const,
        startDate: toDateOnly(body.startDate),
        endDate: toDateOnly(body.endDate),
        reviewedCredits: meta.reviewedCredits,
        reportedCredits: meta.reportedCredits,
        rows: buildSuperintendenciaRows(meta.reportedCredits),
        message: 'Reporte de superintendencia generado (demo).',
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, { genericMsg: 'Error al generar reporte de superintendencia' });
  }
}

async function generateMinutesPdf(body: GenerateMinutesPdfBody, context: HandlerContext) {
  const { request, appRoute } = context;
  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);

    // TODO(credit-report-minutes-pdf): generar PDF oficial del acta desde datos reales y plantilla institucional.
    return {
      status: 200 as const,
      body: {
        reportType: 'MINUTES_PDF' as const,
        minutesNumber: body.minutesNumber.trim(),
        fileName: `acta-${body.minutesNumber.trim().toLowerCase().replace(/\s+/g, '-')}.pdf`,
        pdfBase64: buildDemoPdfBase64('ACTA', [`Numero: ${body.minutesNumber.trim()}`]),
        message: 'PDF de acta generado (demo).',
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, { genericMsg: 'Error al generar PDF de acta' });
  }
}

async function generateCreditClearancePdf(
  body: GenerateCreditClearancePdfBody,
  context: HandlerContext
) {
  const { request, appRoute } = context;
  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);

    // TODO(credit-report-credit-clearance-pdf): generar PDF oficial de paz y salvo de credito.
    return {
      status: 200 as const,
      body: {
        reportType: 'CREDIT_CLEARANCE_PDF' as const,
        creditNumber: body.creditNumber.trim(),
        fileName: `paz-y-salvo-credito-${body.creditNumber.trim().toLowerCase().replace(/\s+/g, '-')}.pdf`,
        pdfBase64: buildDemoPdfBase64('PAZ Y SALVO CREDITO', [
          `Credito: ${body.creditNumber.trim()}`,
        ]),
        message: 'PDF de paz y salvo de credito generado (demo).',
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, { genericMsg: 'Error al generar PDF de paz y salvo de credito' });
  }
}

async function generateThirdPartyClearancePdf(
  body: GenerateThirdPartyClearancePdfBody,
  context: HandlerContext
) {
  const { request, appRoute } = context;
  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);

    // TODO(credit-report-third-party-clearance-pdf): generar PDF oficial de paz y salvo por tercero.
    return {
      status: 200 as const,
      body: {
        reportType: 'THIRD_PARTY_CLEARANCE_PDF' as const,
        thirdPartyDocumentNumber: body.thirdPartyDocumentNumber.trim(),
        fileName: `paz-y-salvo-tercero-${body.thirdPartyDocumentNumber.trim().toLowerCase().replace(/\s+/g, '-')}.pdf`,
        pdfBase64: buildDemoPdfBase64('PAZ Y SALVO TERCERO', [
          `Documento: ${body.thirdPartyDocumentNumber.trim()}`,
        ]),
        message: 'PDF de paz y salvo de tercero generado (demo).',
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, { genericMsg: 'Error al generar PDF de paz y salvo de tercero' });
  }
}

export const creditReport = tsr.router(contract.creditReport, {
  generatePaidInstallments: ({ body }, context) => generatePaidInstallments(body, context),
  generateLiquidatedCredits: ({ body }, context) => generateLiquidatedCredits(body, context),
  generateNonLiquidatedCredits: ({ body }, context) => generateNonLiquidatedCredits(body, context),
  generateCancelledRejectedCredits: ({ body }, context) =>
    generateCancelledRejectedCredits(body, context),
  generateMovementVoucher: ({ body }, context) => generateMovementVoucher(body, context),
  generateSettledCredits: ({ body }, context) => generateSettledCredits(body, context),
  generateSuperintendencia: ({ body }, context) => generateSuperintendencia(body, context),
  generateMinutesPdf: ({ body }, context) => generateMinutesPdf(body, context),
  generateCreditClearancePdf: ({ body }, context) => generateCreditClearancePdf(body, context),
  generateThirdPartyClearancePdf: ({ body }, context) =>
    generateThirdPartyClearancePdf(body, context),
});
