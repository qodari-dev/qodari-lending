import {
  GenerateNotPerformedPledgesReportBodySchema,
  GeneratePerformedPledgesReportBodySchema,
  GeneratePledgePaymentVoucherBodySchema,
} from '@/schemas/subsidy';
import { genericTsRestErrorResponse } from '@/server/utils/generic-ts-rest-error';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { normalizeUpperCase } from '@/server/utils/string-utils';
import { formatDateOnly, stringToSeed } from '@/server/utils/value-utils';
import { tsr } from '@ts-rest/serverless/next';
import { z } from 'zod';
import { contract } from '../contracts';

type GeneratePledgePaymentVoucherBody = z.infer<typeof GeneratePledgePaymentVoucherBodySchema>;
type GeneratePerformedPledgesReportBody = z.infer<typeof GeneratePerformedPledgesReportBodySchema>;
type GenerateNotPerformedPledgesReportBody = z.infer<
  typeof GenerateNotPerformedPledgesReportBodySchema
>;

type PermissionRequest = Parameters<typeof getAuthContextAndValidatePermission>[0];
type PermissionMetadata = Parameters<typeof getAuthContextAndValidatePermission>[1];

type HandlerContext = {
  request: PermissionRequest;
  appRoute: { metadata: PermissionMetadata };
};

async function generatePledgePaymentVoucher(
  body: GeneratePledgePaymentVoucherBody,
  context: HandlerContext
) {
  const { request, appRoute } = context;

  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);

    const period = normalizeUpperCase(body.period);
    const seed = stringToSeed(period);
    const processedCredits = 35 + (seed % 14);
    const processedPayments = processedCredits + (seed % 9) + 4;
    const totalDiscountedAmount = processedPayments * 138_000;
    const totalAppliedAmount = totalDiscountedAmount;

    // TODO(subsidy-pledge-payment-voucher): implementar integracion real con modulo de subsidio:
    // - consultar giros del periodo desde subsidio
    // - identificar descuentos por beneficiario/credito
    // - aplicar abonos y generar movimientos contables en creditos
    // - registrar lote y trazabilidad de ejecucion
    return {
      status: 200 as const,
      body: {
        period,
        movementGenerationDate: formatDateOnly(body.movementGenerationDate),
        processedCredits,
        processedPayments,
        totalDiscountedAmount,
        totalAppliedAmount,
        message: 'Comprobante de abonos de pignoracion generado (demo).',
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al generar comprobante de abonos de pignoracion',
    });
  }
}

async function generatePerformedPledgesReport(
  body: GeneratePerformedPledgesReportBody,
  context: HandlerContext
) {
  const { request, appRoute } = context;

  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);

    const period = normalizeUpperCase(body.period);
    const seed = stringToSeed(period);
    const reviewedCredits = 70 + (seed % 20);
    const reportedCredits = Math.max(10, Math.floor(reviewedCredits * 0.78));
    const rows = Array.from({ length: reportedCredits }).map((_, index) => {
      const sequence = index + 1;
      return {
        creditNumber: `CRP${String(seed).slice(-3)}${String(sequence).padStart(5, '0')}`,
        borrowerDocumentNumber: `10${String(10000000 + sequence)}`,
        borrowerName: `Tercero ${sequence}`,
        discountedAmount: 95_000 + sequence * 2_500,
      };
    });

    // TODO(subsidy-performed-pledges-report): implementar reporte real de pignoraciones realizadas:
    // - consultar descuentos confirmados del periodo en subsidio
    // - cruzar beneficiario/credito para consolidar a quien se desconto
    // - construir archivo final con estructura oficial del area
    return {
      status: 200 as const,
      body: {
        reportType: 'PERFORMED' as const,
        period,
        reviewedCredits,
        reportedCredits,
        rows,
        message: 'Reporte de pignoraciones realizadas generado (demo).',
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al generar reporte de pignoraciones realizadas',
    });
  }
}

async function generateNotPerformedPledgesReport(
  body: GenerateNotPerformedPledgesReportBody,
  context: HandlerContext
) {
  const { request, appRoute } = context;

  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);

    const period = normalizeUpperCase(body.period);
    const seed = stringToSeed(period);
    const reviewedCredits = 70 + (seed % 20);
    const reportedCredits = Math.max(4, Math.floor(reviewedCredits * 0.22));
    const rows = Array.from({ length: reportedCredits }).map((_, index) => {
      const sequence = index + 1;
      return {
        creditNumber: `CRN${String(seed).slice(-3)}${String(sequence).padStart(5, '0')}`,
        borrowerDocumentNumber: `10${String(20000000 + sequence)}`,
        borrowerName: `Tercero pendiente ${sequence}`,
        expectedDiscountedAmount: 85_000 + sequence * 2_100,
        reason: sequence % 2 === 0 ? 'Sin giro aplicado en subsidio' : 'Novedad de afiliado',
      };
    });

    // TODO(subsidy-not-performed-pledges-report): implementar reporte real de pignoraciones no realizadas:
    // - identificar beneficiarios que debian descontar en el periodo
    // - detectar por que no se desconto y consolidar la novedad
    // - construir archivo final con estructura oficial del area
    return {
      status: 200 as const,
      body: {
        reportType: 'NOT_PERFORMED' as const,
        period,
        reviewedCredits,
        reportedCredits,
        rows,
        message: 'Reporte de pignoraciones no realizadas generado (demo).',
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al generar reporte de pignoraciones no realizadas',
    });
  }
}

export const subsidy = tsr.router(contract.subsidy, {
  generatePledgePaymentVoucher: ({ body }, context) => generatePledgePaymentVoucher(body, context),
  generatePerformedPledgesReport: ({ body }, context) => generatePerformedPledgesReport(body, context),
  generateNotPerformedPledgesReport: ({ body }, context) =>
    generateNotPerformedPledgesReport(body, context),
});
