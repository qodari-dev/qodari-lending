import { env } from '@/env';
import { creditsSettings, db, loans } from '@/server/db';
import { categoryCodeLabels } from '@/schemas/category';
import { throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { roundMoney, toNumber } from '@/server/utils/value-utils';
import type {
  PaidInstallmentsReportAuxiliary,
  PaidInstallmentsReportData,
  PaidInstallmentsReportRow,
} from '@/server/pdf/templates/paid-installments-report';
import { getThirdPartyLabel } from '@/utils/third-party';
import { eq } from 'drizzle-orm';

function buildAuxiliaryLabel(code: string | null | undefined, name: string | null | undefined) {
  const trimmedCode = code?.trim();
  const trimmedName = name?.trim();

  if (trimmedCode && trimmedName) return `${trimmedCode} - ${trimmedName}`;
  return trimmedCode || trimmedName || 'Auxiliar';
}

export async function buildPaidInstallmentsReportData(
  creditNumberRaw: string
): Promise<PaidInstallmentsReportData> {
  const creditNumber = creditNumberRaw.trim().toUpperCase();

  const loan = await db.query.loans.findFirst({
    where: eq(loans.creditNumber, creditNumber),
    columns: {
      creditNumber: true,
      creditStartDate: true,
      installments: true,
      principalAmount: true,
      initialTotalAmount: true,
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
          homeAddress: true,
          homePhone: true,
          mobilePhone: true,
          employerBusinessName: true,
        },
        with: {
          homeCity: {
            columns: {
              name: true,
            },
          },
        },
      },
      loanApplication: {
        columns: {
          categoryCode: true,
          financingFactor: true,
          insuranceFactor: true,
        },
        with: {
          creditProduct: {
            columns: {
              name: true,
            },
          },
        },
      },
      paymentGuaranteeType: {
        columns: {
          name: true,
        },
      },
      portfolioEntries: {
        columns: {
          installmentNumber: true,
          dueDate: true,
          chargeAmount: true,
          paymentAmount: true,
          balance: true,
          lastMovementDate: true,
          status: true,
        },
        with: {
          glAccount: {
            columns: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
        orderBy: (table, { asc }) => [asc(table.installmentNumber)],
      },
    },
  });

  if (!loan) {
    throwHttpError({
      status: 404,
      code: 'NOT_FOUND',
      message: `No se encontro credito con numero ${creditNumber}`,
    });
  }

  const settings = await db.query.creditsSettings.findFirst({
    where: eq(creditsSettings.appSlug, env.IAM_APP_SLUG),
    columns: {
      companyName: true,
    },
  });

  const auxiliaryMap = new Map<number, PaidInstallmentsReportAuxiliary>();

  for (const entry of loan.portfolioEntries) {
    if (entry.installmentNumber <= 0 || entry.status === 'VOID' || !entry.glAccount) continue;

    const accountId = entry.glAccount.id;
    const current =
      auxiliaryMap.get(accountId) ??
      ({
        auxiliaryLabel: buildAuxiliaryLabel(entry.glAccount.code, entry.glAccount.name),
        rows: [],
        totalInstallmentAmount: 0,
        totalPaidAmount: 0,
        totalBalance: 0,
      } satisfies PaidInstallmentsReportAuxiliary);

    const row: PaidInstallmentsReportRow = {
      installmentNumber: entry.installmentNumber,
      dueDate: entry.dueDate,
      installmentAmount: roundMoney(toNumber(entry.chargeAmount)),
      paidAmount: roundMoney(toNumber(entry.paymentAmount)),
      balance: roundMoney(toNumber(entry.balance)),
      movementDate: entry.lastMovementDate ?? null,
    };

    current.rows.push(row);
    current.totalInstallmentAmount += row.installmentAmount;
    current.totalPaidAmount += row.paidAmount;
    current.totalBalance += row.balance;
    auxiliaryMap.set(accountId, current);
  }

  const auxiliaries = Array.from(auxiliaryMap.values()).sort((a, b) =>
    a.auxiliaryLabel.localeCompare(b.auxiliaryLabel)
  );

  return {
    companyName: settings?.companyName?.trim() || env.IAM_APP_SLUG,
    creditNumber: loan.creditNumber,
    creditStartDate: loan.creditStartDate,
    borrowerName: getThirdPartyLabel(loan.borrower),
    borrowerDocumentNumber: loan.borrower?.documentNumber ?? null,
    creditLineName: loan.loanApplication.creditProduct?.name ?? 'Credito',
    financingFactor: toNumber(loan.loanApplication.financingFactor),
    installments: loan.installments,
    borrowerAddress: loan.borrower?.homeAddress ?? null,
    installmentValue:
      loan.installments > 0
        ? roundMoney(toNumber(loan.initialTotalAmount) / loan.installments)
        : roundMoney(toNumber(loan.initialTotalAmount)),
    borrowerCity: loan.borrower?.homeCity?.name ?? null,
    employerName: loan.borrower?.employerBusinessName ?? null,
    categoryLabel: categoryCodeLabels[loan.loanApplication.categoryCode],
    insuranceFactor: toNumber(loan.loanApplication.insuranceFactor),
    creditValue: roundMoney(toNumber(loan.principalAmount)),
    borrowerPhone: loan.borrower?.mobilePhone ?? loan.borrower?.homePhone ?? null,
    paymentGuaranteeName: loan.paymentGuaranteeType?.name ?? null,
    auxiliaries,
    totalInstallmentAmount: roundMoney(
      auxiliaries.reduce((sum, item) => sum + item.totalInstallmentAmount, 0)
    ),
    totalPaidAmount: roundMoney(auxiliaries.reduce((sum, item) => sum + item.totalPaidAmount, 0)),
    totalBalance: roundMoney(auxiliaries.reduce((sum, item) => sum + item.totalBalance, 0)),
  };
}
