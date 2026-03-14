import { env } from '@/env';
import { creditsSettings, db, loans, thirdParties } from '@/server/db';
import { getLoanBalanceSummary } from '@/server/utils/loan-statement';
import { throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { toNumber } from '@/server/utils/value-utils';
import { getThirdPartyLabel } from '@/utils/third-party';
import { and, eq, ne } from 'drizzle-orm';
import type { ThirdPartyClearanceData } from '@/server/pdf/templates/third-party-clearance';

export async function buildThirdPartyClearanceData(
  thirdPartyDocumentNumber: string
): Promise<ThirdPartyClearanceData> {
  const normalizedDocumentNumber = thirdPartyDocumentNumber.trim();

  const thirdParty = await db.query.thirdParties.findFirst({
    where: eq(thirdParties.documentNumber, normalizedDocumentNumber),
    with: {
      homeCity: true,
      workCity: true,
    },
  });

  if (!thirdParty) {
    throwHttpError({
      status: 404,
      code: 'NOT_FOUND',
      message: `No existe tercero con documento ${normalizedDocumentNumber}`,
    });
  }

  const thirdPartyLoans = await db.query.loans.findMany({
    where: and(eq(loans.thirdPartyId, thirdParty.id), ne(loans.status, 'VOID')),
    with: {
      loanApplication: {
        with: {
          creditProduct: true,
        },
      },
      repaymentMethod: true,
    },
    orderBy: (table, { desc }) => [desc(table.creditStartDate), desc(table.creditNumber)],
  });

  const balances = await Promise.all(
    thirdPartyLoans.map(async (loan) => ({
      loan,
      summary: await getLoanBalanceSummary(loan.id),
    }))
  );

  const loanWithBalance = balances.find((entry) => toNumber(entry.summary.currentBalance) > 0.01);
  if (loanWithBalance) {
    throwHttpError({
      status: 400,
      code: 'BAD_REQUEST',
      message: `El tercero ${normalizedDocumentNumber} tiene obligaciones con saldo pendiente`,
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
    city: thirdParty.homeCity?.name ?? thirdParty.workCity?.name ?? 'Ciudad',
    generatedAt: new Date().toISOString(),
    thirdPartyName: getThirdPartyLabel(thirdParty),
    thirdPartyDocumentNumber: thirdParty.documentNumber,
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
    loans: balances.map(({ loan }) => ({
      lineName:
        loan.loanApplication?.creditProduct?.name ??
        loan.repaymentMethod?.name ??
        'CREDITO',
      creditNumber: loan.creditNumber,
      creditStartDate: loan.creditStartDate,
      maturityDate: loan.maturityDate,
      creditValue: toNumber(loan.principalAmount),
    })),
  };
}
