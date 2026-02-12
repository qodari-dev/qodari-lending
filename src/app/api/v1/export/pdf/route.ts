import { TsRestMetaData } from '@/schemas/ts-rest';
import { genericTsRestErrorResponse } from '@/server/utils/generic-ts-rest-error';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { renderTemplate } from '@/server/pdf/render';
import { tableReportTemplate, TableReportData } from '@/server/pdf/templates/table-report';
import { sanitizeFilename } from '@/server/pdf/format';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';

const metadata: TsRestMetaData = {
  auth: 'required',
};

const bodySchema = z.object({
  title: z.string().min(1),
  filename: z.string().min(1),
  columns: z.array(
    z.object({
      header: z.string(),
      width: z.number().optional(),
      textAlign: z.string().optional(),
    }),
  ),
  rows: z.array(z.array(z.string())),
  totalCount: z.number(),
});

export async function POST(request: NextRequest) {
  try {
    await getAuthContextAndValidatePermission(request, metadata);

    const raw = await request.json();
    const parsed = bodySchema.parse(raw);

    const reportData: TableReportData = {
      title: parsed.title,
      columns: parsed.columns,
      rows: parsed.rows,
      totalCount: parsed.totalCount,
    };

    return await renderTemplate(
      reportData,
      tableReportTemplate,
      sanitizeFilename(parsed.filename),
    );
  } catch (e) {
    const error = genericTsRestErrorResponse(e, {
      genericMsg: 'Error al generar PDF de reporte',
    });
    return NextResponse.json(error.body, { status: error.status });
  }
}
