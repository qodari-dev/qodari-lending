import {
  GenerateRiskCenterCifinBodySchema,
  GenerateRiskCenterDatacreditoBodySchema,
} from '@/schemas/risk-center-report';
import { db, riskCenterReportItems, riskCenterReportRuns } from '@/server/db';
import { generateDatacreditoReport } from '@/server/services/risk-center/datacredito-report-service';
import { genericTsRestErrorResponse, throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { generateCifinReport } from '@/server/services/risk-center/cifin-report-service';
import { persistRiskCenterReportRun } from '@/server/services/risk-center/risk-center-report-run-service';
import { getRequiredUserContext } from '@/server/utils/required-user-context';
import { formatDateOnly } from '@/server/utils/value-utils';
import { tsr } from '@ts-rest/serverless/next';
import { desc, eq } from 'drizzle-orm';
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

function normalizeMetadata(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

async function generateCifin(body: GenerateCifinBody, context: HandlerContext) {
  const { request, appRoute } = context;

  try {
    const session = await getAuthContextAndValidatePermission(request, appRoute.metadata);
    if (!session) {
      throwHttpError({
        status: 401,
        message: 'Unauthorized',
        code: 'UNAUTHORIZED',
      });
    }
    const user = getRequiredUserContext(session);

    const { reviewedCredits, reportedCredits, fileContent, items = [] } = await generateCifinReport({
      creditCutoffDate: body.creditCutoffDate,
      paymentCutoffDate: body.paymentCutoffDate,
    });
    const fileName = `cifin-${formatDateOnly(body.creditCutoffDate)}-${formatDateOnly(body.paymentCutoffDate)}.txt`;
    const message = 'Generacion de archivo CIFIN ejecutada con estructura legacy adaptada.';

    await persistRiskCenterReportRun({
      riskCenterType: 'CIFIN',
      creditCutoffDate: body.creditCutoffDate,
      paymentCutoffDate: body.paymentCutoffDate,
      reviewedCredits,
      reportedCredits,
      fileName,
      generatedByUserId: user.userId,
      generatedByUserName: user.userName,
      message,
      items,
    });

    return {
      status: 200 as const,
      body: {
        reportType: 'CIFIN' as const,
        creditCutoffDate: formatDateOnly(body.creditCutoffDate),
        paymentCutoffDate: formatDateOnly(body.paymentCutoffDate),
        reviewedCredits,
        reportedCredits,
        fileName,
        fileContent,
        message,
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
    const session = await getAuthContextAndValidatePermission(request, appRoute.metadata);
    if (!session) {
      throwHttpError({
        status: 401,
        message: 'Unauthorized',
        code: 'UNAUTHORIZED',
      });
    }
    const user = getRequiredUserContext(session);

    const { reviewedCredits, reportedCredits, fileContent, items = [] } =
      await generateDatacreditoReport({
        creditCutoffDate: body.creditCutoffDate,
        paymentCutoffDate: body.paymentCutoffDate,
      });
    const fileName = `datacredito-${formatDateOnly(body.creditCutoffDate)}-${formatDateOnly(body.paymentCutoffDate)}.txt`;
    const message = 'Generacion de archivo DATACREDITO ejecutada con estructura legacy adaptada.';

    await persistRiskCenterReportRun({
      riskCenterType: 'DATACREDITO',
      creditCutoffDate: body.creditCutoffDate,
      paymentCutoffDate: body.paymentCutoffDate,
      reviewedCredits,
      reportedCredits,
      fileName,
      generatedByUserId: user.userId,
      generatedByUserName: user.userName,
      message,
      items,
    });

    return {
      status: 200 as const,
      body: {
        reportType: 'DATACREDITO' as const,
        creditCutoffDate: formatDateOnly(body.creditCutoffDate),
        paymentCutoffDate: formatDateOnly(body.paymentCutoffDate),
        reviewedCredits,
        reportedCredits,
        fileName,
        fileContent,
        message,
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al generar reporte de centrales de riesgo (DATACREDITO)',
    });
  }
}

async function listRuns(
  query: { reportType?: 'CIFIN' | 'DATACREDITO' },
  context: HandlerContext
) {
  const { request, appRoute } = context;

  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);

    const runs = await db.query.riskCenterReportRuns.findMany({
      where: query.reportType ? eq(riskCenterReportRuns.riskCenterType, query.reportType) : undefined,
      orderBy: [desc(riskCenterReportRuns.generatedAt)],
      limit: 50,
    });

    const responseRuns = runs.map((run) => ({
      id: run.id,
      riskCenterType: run.riskCenterType,
      creditCutoffDate: run.creditCutoffDate,
      paymentCutoffDate: run.paymentCutoffDate,
      reviewedCredits: run.reviewedCredits,
      reportedCredits: run.reportedCredits,
      fileName: run.fileName,
      generatedByUserId: run.generatedByUserId,
      generatedByUserName: run.generatedByUserName,
      generatedAt: run.generatedAt,
      note: run.note,
    }));

    return {
      status: 200 as const,
      body: responseRuns,
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al consultar historial de reportes a centrales de riesgo',
    });
  }
}

async function getRunItems(id: number, context: HandlerContext) {
  const { request, appRoute } = context;

  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);

    const run = await db.query.riskCenterReportRuns.findFirst({
      where: eq(riskCenterReportRuns.id, id),
    });

    if (!run) {
      return {
        status: 404 as const,
        body: {
          code: 'NOT_FOUND',
          message: `Corrida de centrales con ID ${id} no encontrada`,
        },
      };
    }

    const items = await db.query.riskCenterReportItems.findMany({
      where: eq(riskCenterReportItems.riskCenterReportRunId, id),
      with: {
        loan: {
          with: {
            borrower: true,
          },
        },
      },
      orderBy: [desc(riskCenterReportItems.wasReported), desc(riskCenterReportItems.currentBalance)],
    });

    const responseRun = {
      id: run.id,
      riskCenterType: run.riskCenterType,
      creditCutoffDate: run.creditCutoffDate,
      paymentCutoffDate: run.paymentCutoffDate,
      reviewedCredits: run.reviewedCredits,
      reportedCredits: run.reportedCredits,
      fileName: run.fileName,
      generatedByUserId: run.generatedByUserId,
      generatedByUserName: run.generatedByUserName,
      generatedAt: run.generatedAt,
      note: run.note,
    };

    const responseItems = items.map((item) => ({
      id: item.id,
      riskCenterReportRunId: item.riskCenterReportRunId,
      loanId: item.loanId,
      riskCenterType: item.riskCenterType,
      reportDate: item.reportDate,
      wasReported: item.wasReported,
      reportedStatus: item.reportedStatus,
      daysPastDue: item.daysPastDue,
      currentBalance: item.currentBalance,
      overdueBalance: item.overdueBalance,
      reportedThirdPartiesCount: item.reportedThirdPartiesCount,
      note: item.note,
      metadata: normalizeMetadata(item.metadata),
      loan: item.loan
        ? {
            id: item.loan.id,
            creditNumber: item.loan.creditNumber,
            borrower: item.loan.borrower
              ? {
                  documentNumber: item.loan.borrower.documentNumber,
                  firstName: item.loan.borrower.firstName,
                  secondName: item.loan.borrower.secondName,
                  firstLastName: item.loan.borrower.firstLastName,
                  secondLastName: item.loan.borrower.secondLastName,
                  businessName: item.loan.borrower.businessName,
                }
              : null,
          }
        : null,
    }));

    return {
      status: 200 as const,
      body: {
        run: responseRun,
        items: responseItems,
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al consultar detalle de corrida a centrales de riesgo',
    });
  }
}

export const riskCenterReport = tsr.router(contract.riskCenterReport, {
  generateCifin: ({ body }, context) => generateCifin(body, context),
  generateDatacredito: ({ body }, context) => generateDatacredito(body, context),
  listRuns: ({ query }, context) => listRuns(query, context),
  getRunItems: ({ params }, context) => getRunItems(params.id, context),
});
