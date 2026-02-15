import { db, insuranceCompanies } from '@/server/db';
import { genericTsRestErrorResponse, throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { tsr } from '@ts-rest/serverless/next';
import { differenceInCalendarDays, format } from 'date-fns';
import { and, eq } from 'drizzle-orm';
import { contract } from '../contracts';

function toDateOnly(value: Date) {
  return format(value, 'yyyy-MM-dd');
}

function buildMockCounts(startDate: Date, endDate: Date) {
  const spanDays = Math.max(1, differenceInCalendarDays(endDate, startDate) + 1);
  const reviewedCredits = Math.max(10, spanDays * 6);
  const reportedCredits = Math.max(3, Math.floor(reviewedCredits * 0.68));

  return {
    reviewedCredits,
    reportedCredits,
  };
}

function buildMockRows(
  reportedCredits: number,
  startDate: Date
): Array<{
  creditNumber: string;
  borrowerDocumentNumber: string;
  borrowerName: string;
  liquidationDate: string;
  principalAmount: number;
  insuredAmount: number;
}> {
  return Array.from({ length: reportedCredits }).map((_, index) => {
    const sequence = index + 1;
    const principalAmount = 1_500_000 + sequence * 120_000;
    return {
      creditNumber: `CR2502${String(sequence).padStart(6, '0')}`,
      borrowerDocumentNumber: `10${String(10000000 + sequence)}`,
      borrowerName: `Titular ${sequence}`,
      liquidationDate: toDateOnly(startDate),
      principalAmount,
      insuredAmount: Math.round(principalAmount * 0.012),
    };
  });
}

export const insuranceReport = tsr.router(contract.insuranceReport, {
  generate: async ({ body }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const insuranceCompany = await db.query.insuranceCompanies.findFirst({
        where: and(
          eq(insuranceCompanies.id, body.insuranceCompanyId),
          eq(insuranceCompanies.isActive, true)
        ),
      });

      if (!insuranceCompany) {
        throwHttpError({
          status: 404,
          code: 'NOT_FOUND',
          message: 'Aseguradora no encontrada',
        });
      }

      // TODO(insurance-report): implementar la generacion real del reporte para aseguradoras:
      // - consultar creditos liquidados por aseguradora en el rango de fechas
      // - calcular valores asegurados con las reglas vigentes
      // - marcar filas efectivamente reportadas y persistir trazabilidad del lote
      const { reviewedCredits, reportedCredits } = buildMockCounts(
        body.liquidatedCreditsStartDate,
        body.liquidatedCreditsEndDate
      );
      const rows = buildMockRows(reportedCredits, body.liquidatedCreditsStartDate);

      return {
        status: 200 as const,
        body: {
          insuranceCompanyId: insuranceCompany.id,
          insuranceCompanyName: insuranceCompany.businessName,
          liquidatedCreditsStartDate: toDateOnly(body.liquidatedCreditsStartDate),
          liquidatedCreditsEndDate: toDateOnly(body.liquidatedCreditsEndDate),
          reviewedCredits,
          reportedCredits,
          rows,
          message: 'Reporte para aseguradora generado.',
        },
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: 'Error al generar reporte para aseguradora',
      });
    }
  },
});
