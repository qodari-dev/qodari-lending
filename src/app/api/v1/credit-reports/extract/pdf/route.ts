import { TsRestMetaData } from '@/schemas/ts-rest';
import { genericTsRestErrorResponse, throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { getReportCompanyName } from '@/server/utils/credits-settings-helpers';
import { getCreditExtractReportData } from '@/server/api/handlers/credit-report';
import { renderTemplate } from '@/server/pdf/render';
import { creditExtractTemplate } from '@/server/pdf/templates/credit-extract';
import { CreditExtractPdfData } from '@/server/pdf/templates/credit-extract';
import { sanitizeFilename } from '@/server/pdf/format';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const metadata: TsRestMetaData = {
  auth: 'required',
  permissionKey: {
    resourceKey: 'report-credits',
    actionKey: 'read',
  },
};

export async function GET(request: NextRequest) {
  try {
    await getAuthContextAndValidatePermission(request, metadata);

    const creditNumber = new URL(request.url).searchParams.get('creditNumber')?.trim();
    if (!creditNumber) {
      throwHttpError({
        status: 400,
        message: 'creditNumber es requerido',
        code: 'BAD_REQUEST',
      });
    }

    const [report, companyName] = await Promise.all([
      getCreditExtractReportData(creditNumber),
      getReportCompanyName(),
    ]);

    const pdfData: CreditExtractPdfData = {
      ...report,
      companyName,
    };

    return await renderTemplate(
      pdfData,
      creditExtractTemplate,
      `extracto-${sanitizeFilename(report.loan.creditNumber)}`,
    );
  } catch (e) {
    const error = genericTsRestErrorResponse(e, {
      genericMsg: 'Error al generar PDF de extracto',
    });
    return NextResponse.json(error.body, { status: error.status });
  }
}
