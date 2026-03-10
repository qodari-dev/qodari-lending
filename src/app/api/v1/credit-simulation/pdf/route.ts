import { CalculateCreditSimulationResponseSchema } from '@/schemas/credit-simulation';
import type { TsRestMetaData } from '@/schemas/ts-rest';
import { renderTemplate } from '@/server/pdf/render';
import {
  creditSimulationReportTemplate,
  type CreditSimulationPdfData,
} from '@/server/pdf/templates/credit-simulation-report';
import { getReportCompanyName } from '@/server/utils/credits-settings-helpers';
import { genericTsRestErrorResponse } from '@/server/utils/generic-ts-rest-error';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const metadata: TsRestMetaData = {
  auth: 'required',
  permissionKey: {
    resourceKey: 'credit-simulation',
    actionKey: 'read',
  },
};

export async function POST(request: NextRequest) {
  try {
    await getAuthContextAndValidatePermission(request, metadata);

    const [raw, companyName] = await Promise.all([
      request.json(),
      getReportCompanyName(),
    ]);
    const parsed = CalculateCreditSimulationResponseSchema.parse(raw);

    const pdfData: CreditSimulationPdfData = {
      ...parsed,
      printDate: new Date().toISOString(),
      companyName,
    };

    return await renderTemplate(pdfData, creditSimulationReportTemplate, 'simulacion-de-credito');
  } catch (e) {
    const error = genericTsRestErrorResponse(e, {
      genericMsg: 'Error al generar PDF de simulacion',
    });
    return NextResponse.json(error.body, { status: error.status });
  }
}
