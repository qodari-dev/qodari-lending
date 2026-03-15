import { env } from '@/env';
import { accountingEntries, creditsSettings, db, glAccounts, loans } from '@/server/db';
import { throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { formatDateOnly, roundMoney, toNumber } from '@/server/utils/value-utils';
import { getThirdPartyLabel } from '@/utils/third-party';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { and, asc, eq, lte } from 'drizzle-orm';
import type { CreditBalanceCertificateData } from '@/server/pdf/templates/credit-balance-certificate';

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

export async function buildCreditBalanceCertificateData(
  creditNumberRaw: string,
  cutoffDateRaw: Date
): Promise<CreditBalanceCertificateData> {
  const creditNumber = creditNumberRaw.trim().toUpperCase();
  const cutoffDate = formatDateOnly(cutoffDateRaw);

  const loan = await db.query.loans.findFirst({
    where: eq(loans.creditNumber, creditNumber),
    columns: {
      id: true,
      creditNumber: true,
      creditStartDate: true,
      status: true,
    },
    with: {
      borrower: {
        columns: {
          documentNumber: true,
          personType: true,
          businessName: true,
          firstName: true,
          secondName: true,
          firstLastName: true,
          secondLastName: true,
        },
      },
      affiliationOffice: {
        columns: {
          code: true,
          name: true,
        },
        with: {
          city: {
            columns: {
              name: true,
            },
          },
        },
      },
      loanApplication: {
        with: {
          creditProduct: {
            columns: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!loan) {
    throwHttpError({
      status: 404,
      code: 'NOT_FOUND',
      message: `No existe un credito con numero ${creditNumber}`,
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
  const balanceAtCutoff = roundMoney(
    positions.reduce((sum, position) => sum + position.balance, 0)
  );
  const oldestOverdueDate = positions
    .filter((position) => position.dueDate && position.dueDate < cutoffDate)
    .sort((left, right) => (left.dueDate ?? '').localeCompare(right.dueDate ?? ''))[0]?.dueDate;

  const daysPastDue = oldestOverdueDate
    ? differenceInCalendarDays(parseDateOnly(cutoffDate), parseDateOnly(oldestOverdueDate))
    : 0;

  const statusLabel =
    balanceAtCutoff <= 0.01 ? 'SALDADO' : daysPastDue <= 0 ? 'AL DIA' : `MOROSO a ${daysPastDue} dias`;

  return {
    companyName: settings.companyName?.trim() || env.IAM_APP_SLUG,
    companyDocumentNumber: settings.companyDocumentNumber?.trim() || null,
    city: loan.affiliationOffice?.city?.name || 'Ciudad',
    generatedAt: new Date().toISOString(),
    borrowerName: getThirdPartyLabel(loan.borrower),
    borrowerDocumentNumber: loan.borrower?.documentNumber ?? null,
    creditNumber: loan.creditNumber,
    obligationNumber: loan.affiliationOffice?.code
      ? `${loan.affiliationOffice.code} - ${loan.creditNumber}`
      : loan.creditNumber,
    affiliationOfficeName: loan.affiliationOffice?.name ?? null,
    creditLineName: loan.loanApplication.creditProduct?.name ?? 'Credito',
    cutoffDate,
    balanceAtCutoff: toNumber(String(balanceAtCutoff)),
    statusLabel,
    creditStartDate: loan.creditStartDate,
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
