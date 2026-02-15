import { TsRestMetaData } from '@/schemas/ts-rest';
import { sanitizeFilename } from '@/server/pdf/format';
import { renderTemplate } from '@/server/pdf/render';
import {
  buildAdministrativeCollectionLetterData,
  collectionLetterTemplate,
} from '@/server/pdf/templates/collection-letter';
import { genericTsRestErrorResponse, throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const metadata: TsRestMetaData = {
  auth: 'required',
  permissionKey: {
    resourceKey: 'loans',
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

    // TODO(collection-letter-administrative):
    // - consultar datos reales del credito por numero
    // - validar estado de cartera para aplicar formato administrativo
    // - completar datos reales de titular, saldo y recomendaciones de pago
    const report = buildAdministrativeCollectionLetterData(creditNumber);

    return await renderTemplate(
      report,
      collectionLetterTemplate,
      `oficio-cobro-administrativo-${sanitizeFilename(creditNumber)}`
    );
  } catch (e) {
    const error = genericTsRestErrorResponse(e, {
      genericMsg: 'Error al generar carta de cobro administrativo',
    });
    return NextResponse.json(error.body, { status: error.status });
  }
}
