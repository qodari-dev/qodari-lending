import {
  GenerateRiskCenterCifinBodySchema,
  GenerateRiskCenterDatacreditoBodySchema,
} from '@/schemas/risk-center-report';
import { genericTsRestErrorResponse } from '@/server/utils/generic-ts-rest-error';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { tsr } from '@ts-rest/serverless/next';
import { differenceInCalendarDays } from 'date-fns';
import { z } from 'zod';
import { contract } from '../contracts';

type GenerateCifinBody = z.infer<typeof GenerateRiskCenterCifinBodySchema>;
type GenerateDatacreditoBody = z.infer<typeof GenerateRiskCenterDatacreditoBodySchema>;

type PermissionRequest = Parameters<typeof getAuthContextAndValidatePermission>[0];
type PermissionMetadata = Parameters<typeof getAuthContextAndValidatePermission>[1];

type HandlerContext = {
  request: PermissionRequest;
  appRoute: { metadata: PermissionMetadata };
};

function toDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function buildMockCounts(creditCutoffDate: Date, paymentCutoffDate: Date) {
  const spanDays = Math.max(1, differenceInCalendarDays(paymentCutoffDate, creditCutoffDate) + 1);
  const reviewedCredits = Math.max(12, spanDays * 7);
  const reportedCredits = Math.max(4, Math.floor(reviewedCredits * 0.72));

  return {
    reviewedCredits,
    reportedCredits,
  };
}

function buildTxtContent(
  reportType: 'CIFIN' | 'DATACREDITO',
  reviewedCredits: number,
  reportedCredits: number
) {
  const lines = [
    `TIPO_REPORTE|${reportType}`,
    `CREDITOS_REVISADOS|${reviewedCredits}`,
    `CREDITOS_REPORTADOS|${reportedCredits}`,
    'CREDITO|TIPO_DOCUMENTO|DOCUMENTO|ESTADO|SALDO',
    'CR2501010001|CC|12345678|MORA|3500000',
    'CR2501010002|CC|87654321|VIGENTE|1200000',
  ];

  return lines.join('\n');
}

async function generateCifin(body: GenerateCifinBody, context: HandlerContext) {
  const { request, appRoute } = context;

  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);

    // TODO(risk-center-cifin): implementar generacion real de archivo para CIFIN:
    // - consultar cartera por fecha de corte de creditos y fecha de corte de pagos
    // - aplicar reglas de seleccion y formato oficial de CIFIN
    // - marcar creditos reportados y registrar trazabilidad del lote generado
    const { reviewedCredits, reportedCredits } = buildMockCounts(
      body.creditCutoffDate,
      body.paymentCutoffDate
    );
    const fileName = `cifin-${toDateOnly(body.creditCutoffDate)}-${toDateOnly(body.paymentCutoffDate)}.txt`;

    return {
      status: 200 as const,
      body: {
        reportType: 'CIFIN' as const,
        creditCutoffDate: toDateOnly(body.creditCutoffDate),
        paymentCutoffDate: toDateOnly(body.paymentCutoffDate),
        reviewedCredits,
        reportedCredits,
        fileName,
        fileContent: buildTxtContent('CIFIN', reviewedCredits, reportedCredits),
        message: 'Generacion de archivo CIFIN ejecutada.',
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al generar reporte de centrales de riesgo (CIFIN)',
    });
  }
}

async function generateDatacredito(body: GenerateDatacreditoBody, context: HandlerContext) {
  const { request, appRoute } = context;

  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);

    // TODO(risk-center-datacredito): implementar generacion real de archivo para DATACREDITO:
    // - consultar cartera por fecha de corte de creditos y fecha de corte de pagos
    // - aplicar reglas de seleccion y formato oficial de DATACREDITO
    // - marcar creditos reportados y registrar trazabilidad del lote generado
    const { reviewedCredits, reportedCredits } = buildMockCounts(
      body.creditCutoffDate,
      body.paymentCutoffDate
    );
    const fileName = `datacredito-${toDateOnly(body.creditCutoffDate)}-${toDateOnly(body.paymentCutoffDate)}.txt`;

    return {
      status: 200 as const,
      body: {
        reportType: 'DATACREDITO' as const,
        creditCutoffDate: toDateOnly(body.creditCutoffDate),
        paymentCutoffDate: toDateOnly(body.paymentCutoffDate),
        reviewedCredits,
        reportedCredits,
        fileName,
        fileContent: buildTxtContent('DATACREDITO', reviewedCredits, reportedCredits),
        message: 'Generacion de archivo DATACREDITO ejecutada.',
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al generar reporte de centrales de riesgo (DATACREDITO)',
    });
  }
}

export const riskCenterReport = tsr.router(contract.riskCenterReport, {
  generateCifin: ({ body }, context) => generateCifin(body, context),
  generateDatacredito: ({ body }, context) => generateDatacredito(body, context),
});
