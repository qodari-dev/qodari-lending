import { env } from '@/env';
import { accountingEntries, creditsSettings, db, glAccounts, loans, thirdParties } from '@/server/db';
import { throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { formatDateOnly, roundMoney } from '@/server/utils/value-utils';
import { getThirdPartyLabel } from '@/utils/third-party';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { and, asc, eq, lte, ne } from 'drizzle-orm';
import type {
  ThirdPartyBalanceCertificateData,
  ThirdPartyBalanceCertificateLoanRow,
} from '@/server/pdf/templates/third-party-balance-certificate';

function parseDateOnly(value: string) {
  return parseISO(`${value}T00:00:00`);
}

type ReceivableEntry = {
  installmentNumber: number | null;
  glAccountId: number;
  dueDate: string | null;
  nature: 'DEBIT' | 'CREDIT';
  amount: string;
};

function buildReceivablePositions(entries: ReceivableEntry[]) {
  const positions = new Map<
    string,
    {
      dueDate: string | null;
      chargeAmount: number;
      paymentAmount: number;
    }
  >();

  for (const entry of entries) {
    const amount = roundMoney(Number(entry.amount));
    const key = [entry.glAccountId, entry.installmentNumber ?? 0, entry.dueDate ?? ''].join(':');
    const current = positions.get(key) ?? {
      dueDate: entry.dueDate,
      chargeAmount: 0,
      paymentAmount: 0,
    };

    if (entry.nature === 'DEBIT') {
      current.chargeAmount = roundMoney(current.chargeAmount + amount);
    } else {
      current.paymentAmount = roundMoney(current.paymentAmount + amount);
    }

    positions.set(key, current);
  }

  return [...positions.values()]
    .map((position) => ({
      dueDate: position.dueDate,
      balance: roundMoney(position.chargeAmount - position.paymentAmount),
    }))
    .filter((position) => position.balance > 0.01);
}

function resolveLoanStatusLabel(cutoffDate: string, balanceAtCutoff: number, oldestOverdueDate?: string | null) {
  if (balanceAtCutoff <= 0.01) return 'SALDADO';
  if (!oldestOverdueDate) return 'AL DIA';
  const daysPastDue = differenceInCalendarDays(
    parseDateOnly(cutoffDate),
    parseDateOnly(oldestOverdueDate)
  );
  return daysPastDue <= 0 ? 'AL DIA' : `MOROSO a ${daysPastDue} dias`;
}

export async function buildThirdPartyBalanceCertificateData(
  thirdPartyDocumentNumberRaw: string,
  cutoffDateRaw: Date
): Promise<ThirdPartyBalanceCertificateData> {
  const thirdPartyDocumentNumber = thirdPartyDocumentNumberRaw.trim();
  const cutoffDate = formatDateOnly(cutoffDateRaw);

  const thirdParty = await db.query.thirdParties.findFirst({
    where: eq(thirdParties.documentNumber, thirdPartyDocumentNumber),
    with: {
      homeCity: true,
      workCity: true,
    },
  });

  if (!thirdParty) {
    throwHttpError({
      status: 404,
      code: 'NOT_FOUND',
      message: `No existe tercero con documento ${thirdPartyDocumentNumber}`,
    });
  }

  const settings = await db.query.creditsSettings.findFirst({
    where: eq(creditsSettings.appSlug, env.IAM_APP_SLUG),
  });

  if (!settings) {
    throwHttpError({
      status: 400,
      code: 'BAD_REQUEST',
      message: 'No existe configuracion de creditos para generar el certificado',
    });
  }

  const thirdPartyLoans = await db.query.loans.findMany({
    where: and(eq(loans.thirdPartyId, thirdParty.id), ne(loans.status, 'VOID')),
    columns: {
      id: true,
      creditNumber: true,
      creditStartDate: true,
      maturityDate: true,
      status: true,
    },
    with: {
      loanApplication: {
        with: {
          creditProduct: {
            columns: {
              name: true,
            },
          },
        },
      },
      repaymentMethod: {
        columns: {
          name: true,
        },
      },
    },
    orderBy: [asc(loans.creditStartDate), asc(loans.creditNumber)],
  });

  const loanRows: ThirdPartyBalanceCertificateLoanRow[] = [];

  for (const loan of thirdPartyLoans) {
    const accountingRows = await db
      .select({
        installmentNumber: accountingEntries.installmentNumber,
        glAccountId: accountingEntries.glAccountId,
        dueDate: accountingEntries.dueDate,
        nature: accountingEntries.nature,
        amount: accountingEntries.amount,
      })
      .from(accountingEntries)
      .innerJoin(glAccounts, eq(accountingEntries.glAccountId, glAccounts.id))
      .where(
        and(
          eq(accountingEntries.loanId, loan.id),
          eq(accountingEntries.status, 'ACCOUNTED'),
          lte(accountingEntries.entryDate, cutoffDate),
          eq(glAccounts.detailType, 'RECEIVABLE')
        )
      )
      .orderBy(
        asc(accountingEntries.dueDate),
        asc(accountingEntries.installmentNumber),
        asc(accountingEntries.id)
      );

    const positions = buildReceivablePositions(accountingRows);
    const balanceAtCutoff = roundMoney(positions.reduce((sum, position) => sum + position.balance, 0));
    if (balanceAtCutoff <= 0.01) continue;

    const oldestOverdueDate = positions
      .filter((position) => position.dueDate && position.dueDate < cutoffDate)
      .sort((left, right) => (left.dueDate ?? '').localeCompare(right.dueDate ?? ''))[0]?.dueDate;

    loanRows.push({
      creditNumber: loan.creditNumber,
      lineName:
        loan.loanApplication?.creditProduct?.name ?? loan.repaymentMethod?.name ?? 'CREDITO',
      creditStartDate: loan.creditStartDate,
      maturityDate: loan.maturityDate,
      balanceAtCutoff,
      statusLabel: resolveLoanStatusLabel(cutoffDate, balanceAtCutoff, oldestOverdueDate),
    });
  }

  const totalBalanceAtCutoff = roundMoney(
    loanRows.reduce((sum, row) => sum + row.balanceAtCutoff, 0)
  );

  return {
    companyName: settings.companyName?.trim() || env.IAM_APP_SLUG,
    companyDocumentNumber: settings.companyDocumentNumber?.trim() || null,
    city: thirdParty.homeCity?.name ?? thirdParty.workCity?.name ?? 'Ciudad',
    generatedAt: new Date().toISOString(),
    cutoffDate,
    thirdPartyName: getThirdPartyLabel(thirdParty),
    thirdPartyDocumentNumber: thirdParty.documentNumber,
    totalBalanceAtCutoff,
    loans: loanRows,
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
