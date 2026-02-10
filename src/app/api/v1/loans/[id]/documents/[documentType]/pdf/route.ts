import { TsRestMetaData } from '@/schemas/ts-rest';
import { genericTsRestErrorResponse, throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { db, loans, loanInstallments } from '@/server/db';
import { eq, asc } from 'drizzle-orm';
import { renderTemplate } from '@/server/pdf/render';
import { sanitizeFilename } from '@/server/pdf/format';
import {
  LOAN_DOCUMENT_TYPES,
  LoanDocumentType,
  getLoanDocumentTemplate,
} from '@/server/pdf/templates/loan-document-types';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const metadata: TsRestMetaData = {
  auth: 'required',
  permissionKey: {
    resourceKey: 'loans',
    actionKey: 'read',
  },
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentType: string }> },
) {
  try {
    await getAuthContextAndValidatePermission(request, metadata);

    const { id: idStr, documentType } = await params;
    const loanId = Number(idStr);

    if (!Number.isFinite(loanId) || loanId <= 0) {
      throwHttpError({ status: 400, message: 'ID de credito invalido', code: 'BAD_REQUEST' });
    }

    if (!LOAN_DOCUMENT_TYPES.includes(documentType as LoanDocumentType)) {
      throwHttpError({
        status: 400,
        message: `Tipo de documento invalido: ${documentType}`,
        code: 'BAD_REQUEST',
      });
    }

    const printDate =
      new URL(request.url).searchParams.get('printDate')?.trim() ||
      new Date().toISOString().slice(0, 10);

    const loan = await db.query.loans.findFirst({
      where: eq(loans.id, loanId),
      with: {
        borrower: true,
        agreement: true,
        affiliationOffice: true,
        loanApplication: {
          with: {
            creditProduct: true,
          },
        },
        loanInstallments: {
          orderBy: [asc(loanInstallments.installmentNumber)],
        },
      },
    });

    if (!loan) {
      throwHttpError({ status: 404, message: 'Credito no encontrado', code: 'NOT_FOUND' });
    }

    const docType = documentType as LoanDocumentType;
    const template = await getLoanDocumentTemplate(docType);

    return await renderTemplate(
      { loan, printDate },
      template,
      `${docType}-${sanitizeFilename(loan.creditNumber)}`,
    );
  } catch (e) {
    const error = genericTsRestErrorResponse(e, {
      genericMsg: 'Error al generar documento PDF',
    });
    return NextResponse.json(error.body, { status: error.status });
  }
}
