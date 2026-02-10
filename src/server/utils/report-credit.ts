import { CreditExtractReportResponse } from '@/schemas/report-credit';
import { db, loans } from '@/server/db';
import { throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { ensureLoanExists, getLoanBalanceSummary, getLoanStatement } from '@/server/utils/loan-statement';
import { eq } from 'drizzle-orm';

function getBorrowerName(borrower: {
  personType: 'NATURAL' | 'LEGAL';
  businessName: string | null;
  firstName: string | null;
  secondName: string | null;
  firstLastName: string | null;
  secondLastName: string | null;
  documentNumber: string;
} | null): string {
  if (!borrower) return '-';
  if (borrower.personType === 'LEGAL') {
    return borrower.businessName ?? borrower.documentNumber;
  }

  const fullName = [borrower.firstName, borrower.secondName, borrower.firstLastName, borrower.secondLastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  return fullName || borrower.documentNumber;
}

export async function getCreditExtractReportData(
  creditNumberRaw: string
): Promise<CreditExtractReportResponse> {
  const creditNumber = creditNumberRaw.trim();

  const loan = await db.query.loans.findFirst({
    where: eq(loans.creditNumber, creditNumber),
    columns: {
      id: true,
      creditNumber: true,
      status: true,
      recordDate: true,
      creditStartDate: true,
      maturityDate: true,
      firstCollectionDate: true,
    },
    with: {
      borrower: {
        columns: {
          personType: true,
          businessName: true,
          firstName: true,
          secondName: true,
          firstLastName: true,
          secondLastName: true,
          documentNumber: true,
        },
      },
      affiliationOffice: {
        columns: {
          name: true,
        },
      },
      agreement: {
        columns: {
          agreementCode: true,
          businessName: true,
        },
      },
    },
  });

  if (!loan) {
    throwHttpError({
      status: 404,
      message: `No se encontro credito con numero ${creditNumber}`,
      code: 'NOT_FOUND',
    });
  }

  await ensureLoanExists(loan.id);
  const [balanceSummary, statement] = await Promise.all([
    getLoanBalanceSummary(loan.id),
    getLoanStatement(loan.id, {}),
  ]);

  return {
    loan: {
      id: loan.id,
      creditNumber: loan.creditNumber,
      status: loan.status,
      recordDate: loan.recordDate,
      creditStartDate: loan.creditStartDate,
      maturityDate: loan.maturityDate,
      firstCollectionDate: loan.firstCollectionDate,
      borrowerDocumentNumber: loan.borrower?.documentNumber ?? null,
      borrowerName: getBorrowerName(loan.borrower),
      affiliationOfficeName: loan.affiliationOffice?.name ?? null,
      agreementLabel: loan.agreement
        ? `${loan.agreement.agreementCode} - ${loan.agreement.businessName}`
        : null,
    },
    balanceSummary,
    statement,
    generatedAt: new Date().toISOString(),
  };
}
