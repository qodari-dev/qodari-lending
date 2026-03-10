import { WorkerStudyResponseSchema } from '@/schemas/credit-simulation';
import type { TsRestMetaData } from '@/schemas/ts-rest';
import { renderTemplate } from '@/server/pdf/render';
import { sanitizeFilename } from '@/server/pdf/format';
import {
  workerStudyReportTemplate,
  type WorkerStudyPdfData,
} from '@/server/pdf/templates/worker-study-report';
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
    const parsed = WorkerStudyResponseSchema.parse(raw);

    const pdfData: WorkerStudyPdfData = {
      ...parsed,
      companyName,
    };

    const filename = `estudio-trabajador-${sanitizeFilename(parsed.worker.documentNumber)}`;

    return await renderTemplate(pdfData, workerStudyReportTemplate, filename);
  } catch (e) {
    const error = genericTsRestErrorResponse(e, {
      genericMsg: 'Error al generar PDF de estudio de trabajador',
    });
    return NextResponse.json(error.body, { status: error.status });
  }
}
