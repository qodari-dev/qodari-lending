import { WorkerStudyResponseSchema } from '@/schemas/credit-simulation';
import type { TsRestMetaData } from '@/schemas/ts-rest';
import { renderTemplate } from '@/server/pdf/render';
import { sanitizeFilename } from '@/server/pdf/format';
import { workerStudyReportTemplate } from '@/server/pdf/templates/worker-study-report';
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

    const raw = await request.json();
    const parsed = WorkerStudyResponseSchema.parse(raw);

    const filename = `estudio-trabajador-${sanitizeFilename(parsed.worker.documentNumber)}`;

    return await renderTemplate(parsed, workerStudyReportTemplate, filename);
  } catch (e) {
    const error = genericTsRestErrorResponse(e, {
      genericMsg: 'Error al generar PDF de estudio de trabajador',
    });
    return NextResponse.json(error.body, { status: error.status });
  }
}
