import { env } from '@/env';
import { creditsSettings, db, loans } from '@/server/db';
import { throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { getLoanBalanceSummary } from '@/server/utils/loan-statement';
import { toNumber } from '@/server/utils/value-utils';
import { getThirdPartyLabel } from '@/utils/third-party';
import { eq } from 'drizzle-orm';
import type { CreditClearanceData } from '@/server/pdf/templates/credit-clearance';

export async function buildCreditClearanceData(creditNumber: string): Promise<CreditClearanceData> {
  const normalizedCreditNumber = creditNumber.trim().toUpperCase();

  const loan = await db.query.loans.findFirst({
    where: eq(loans.creditNumber, normalizedCreditNumber),
    with: {
      borrower: {
        with: {
          homeCity: true,
          workCity: true,
        },
      },
      affiliationOffice: {
        with: {
          city: true,
        },
      },
    },
  });

  if (!loan) {
    throwHttpError({
      status: 404,
      code: 'NOT_FOUND',
      message: `No existe un credito con numero ${normalizedCreditNumber}`,
    });
  }

  const balanceSummary = await getLoanBalanceSummary(loan.id);
  const currentBalance = toNumber(balanceSummary.currentBalance);

  if (loan.status !== 'PAID' || currentBalance > 0.01) {
    throwHttpError({
      status: 400,
      code: 'BAD_REQUEST',
      message: `El credito ${normalizedCreditNumber} no se encuentra saldado`,
    });
  }

  const settings = await db.query.creditsSettings.findFirst({
    where: eq(creditsSettings.appSlug, env.IAM_APP_SLUG),
  });

  if (!settings) {
    throwHttpError({
      status: 400,
      code: 'BAD_REQUEST',
      message: 'No existe configuracion de creditos para generar el paz y salvo',
    });
  }

  return {
    companyName: settings.companyName?.trim() || env.IAM_APP_SLUG,
    companyDocumentNumber: settings.companyDocumentNumber?.trim() || null,
    city: loan.affiliationOffice?.city?.name || 'Ciudad',
    generatedAt: new Date().toISOString(),
    borrowerName: getThirdPartyLabel(loan.borrower),
    borrowerDocumentNumber: loan.borrower?.documentNumber ?? null,
    borrowerAddress: loan.borrower?.homeAddress ?? loan.borrower?.workAddress ?? null,
    borrowerCity: loan.borrower?.homeCity?.name ?? loan.borrower?.workCity?.name ?? null,
    creditNumber: loan.creditNumber,
    creditValue: toNumber(loan.principalAmount),
    creditStartDate: loan.creditStartDate,
    lastPaymentDate: loan.lastPaymentDate ?? loan.statusDate,
    clearanceDate: loan.statusDate,
    signerName:
      settings.creditManagerName?.trim() ||
      settings.adminManagerName?.trim() ||
      settings.adminDirectorName?.trim() ||
      'Area de Creditos',
    signerTitle:
      settings.creditManagerTitle?.trim() ||
      settings.adminManagerTitle?.trim() ||
      settings.adminDirectorTitle?.trim() ||
      'Responsable de cartera',
  };
}
