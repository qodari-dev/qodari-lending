import {
  cancelledRejectedCreditsReportTypeLabels,
  CreditExtractReportResponse,
  CancelledRejectedCreditsReportRow,
  GenerateCancelledRejectedCreditsReportBodySchema,
  GenerateCreditClearancePdfBodySchema,
  GenerateLiquidatedCreditsReportBodySchema,
  GenerateLiquidatedNotDisbursedCreditsReportBodySchema,
  GenerateMinutesPdfBodySchema,
  GenerateNonLiquidatedCreditsReportBodySchema,
  GeneratePaidInstallmentsReportBodySchema,
  GenerateSettledCreditsReportBodySchema,
  GenerateThirdPartyClearancePdfBodySchema,
  GetCreditExtractReportQuerySchema,
  LiquidatedCreditsReportRow,
  LiquidatedNotDisbursedCreditsReportRow,
  MinutesReportOption,
  NonLiquidatedCreditsReportRow,
  SettledCreditsReportRow,
} from '@/schemas/credit-report';
import { accountingEntries, db, loanApplicationActNumbers, loanApplications, loans } from '@/server/db';
import { genericTsRestErrorResponse, throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { getLoanBalanceSummary, getLoanStatement } from '@/server/utils/loan-statement';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { buildCreditExtractClientStatement } from '@/server/utils/credit-extract-client';
import { getThirdPartyLabel } from '@/utils/third-party';
import { formatDateOnly, roundMoney, toNumber } from '@/server/utils/value-utils';
import { renderTemplateToBase64 } from '@/server/pdf/render';
import { creditClearanceTemplate } from '@/server/pdf/templates/credit-clearance';
import { minutesReportTemplate } from '@/server/pdf/templates/minutes-report';
import { paidInstallmentsReportTemplate } from '@/server/pdf/templates/paid-installments-report';
import { thirdPartyClearanceTemplate } from '@/server/pdf/templates/third-party-clearance';
import { buildCreditClearanceData } from '@/server/utils/credit-clearance-data';
import { buildMinutesReportData } from '@/server/utils/minutes-report-data';
import { buildPaidInstallmentsReportData } from '@/server/utils/paid-installments-report-data';
import { buildThirdPartyClearanceData } from '@/server/utils/third-party-clearance-data';
import { tsr } from '@ts-rest/serverless/next';
import { differenceInCalendarDays } from 'date-fns';
import { and, count, desc, eq, gte, inArray, isNotNull, isNull, lte, or } from 'drizzle-orm';
import { z } from 'zod';
import { contract } from '../contracts';
import { loanDisbursementStatusLabels, loanStatusLabels } from '@/schemas/loan';

type GeneratePaidInstallmentsReportBody = z.infer<typeof GeneratePaidInstallmentsReportBodySchema>;
type GenerateLiquidatedCreditsReportBody = z.infer<typeof GenerateLiquidatedCreditsReportBodySchema>;
type GenerateLiquidatedNotDisbursedCreditsReportBody = z.infer<
  typeof GenerateLiquidatedNotDisbursedCreditsReportBodySchema
>;
type GenerateNonLiquidatedCreditsReportBody = z.infer<
  typeof GenerateNonLiquidatedCreditsReportBodySchema
>;
type GenerateCancelledRejectedCreditsReportBody = z.infer<
  typeof GenerateCancelledRejectedCreditsReportBodySchema
>;
type GenerateSettledCreditsReportBody = z.infer<typeof GenerateSettledCreditsReportBodySchema>;
type GenerateMinutesPdfBody = z.infer<typeof GenerateMinutesPdfBodySchema>;
type GenerateCreditClearancePdfBody = z.infer<typeof GenerateCreditClearancePdfBodySchema>;
type GenerateThirdPartyClearancePdfBody = z.infer<typeof GenerateThirdPartyClearancePdfBodySchema>;
type GetExtractQuery = z.infer<typeof GetCreditExtractReportQuerySchema>;

type PermissionRequest = Parameters<typeof getAuthContextAndValidatePermission>[0];
type PermissionMetadata = Parameters<typeof getAuthContextAndValidatePermission>[1];

type HandlerContext = {
  request: PermissionRequest;
  appRoute: { metadata: PermissionMetadata };
};

function buildRangeMeta(startDate: Date, endDate: Date, base: number) {
  const spanDays = Math.max(1, differenceInCalendarDays(endDate, startDate) + 1);
  const reviewedCredits = base + spanDays * 4;
  const reportedCredits = Math.max(10, Math.floor(reviewedCredits * 0.74));
  return { reviewedCredits, reportedCredits };
}

const EXTRACT_LOAN_COLUMNS = {
  id: true,
  creditNumber: true,
  status: true,
  recordDate: true,
  creditStartDate: true,
  maturityDate: true,
  firstCollectionDate: true,
} as const;

const EXTRACT_LOAN_WITH = {
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
} as const;

async function buildExtractResponse(
  loan: NonNullable<
    Awaited<
      ReturnType<
        typeof db.query.loans.findFirst<{
          columns: typeof EXTRACT_LOAN_COLUMNS;
          with: typeof EXTRACT_LOAN_WITH;
        }>
      >
    >
  >
): Promise<CreditExtractReportResponse> {
  const [balanceSummary, statement] = await Promise.all([
    getLoanBalanceSummary(loan.id),
    getLoanStatement(loan.id, {}),
  ]);
  const clientStatement = buildCreditExtractClientStatement(statement);

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
      borrowerName: getThirdPartyLabel(loan.borrower),
      affiliationOfficeName: loan.affiliationOffice?.name ?? null,
      agreementLabel: loan.agreement
        ? `${loan.agreement.agreementCode} - ${loan.agreement.businessName}`
        : null,
    },
    balanceSummary,
    statement,
    clientStatement,
    generatedAt: new Date().toISOString(),
  };
}

export async function getCreditExtractReportData(
  creditNumberRaw: string
): Promise<CreditExtractReportResponse> {
  const creditNumber = creditNumberRaw.trim();

  const loan = await db.query.loans.findFirst({
    where: eq(loans.creditNumber, creditNumber),
    columns: EXTRACT_LOAN_COLUMNS,
    with: EXTRACT_LOAN_WITH,
  });

  if (!loan) {
    throwHttpError({
      status: 404,
      message: `No se encontro credito con numero ${creditNumber}`,
      code: 'NOT_FOUND',
    });
  }

  return buildExtractResponse(loan);
}

async function getCreditExtractReportDataByLoanId(loanId: number): Promise<CreditExtractReportResponse> {
  const loan = await db.query.loans.findFirst({
    where: eq(loans.id, loanId),
    columns: EXTRACT_LOAN_COLUMNS,
    with: EXTRACT_LOAN_WITH,
  });

  if (!loan) {
    throwHttpError({
      status: 404,
      message: `No se encontro credito con ID ${loanId}`,
      code: 'NOT_FOUND',
    });
  }

  return buildExtractResponse(loan);
}

async function generatePaidInstallments(
  body: GeneratePaidInstallmentsReportBody,
  context: HandlerContext
) {
  const { request, appRoute } = context;
  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);
    const normalizedCreditNumber = body.creditNumber.trim().toUpperCase();
    const data = await buildPaidInstallmentsReportData(normalizedCreditNumber);
    const pdfBase64 = await renderTemplateToBase64(data, paidInstallmentsReportTemplate);

    return {
      status: 200 as const,
      body: {
        reportType: 'PAID_INSTALLMENTS_PDF' as const,
        creditNumber: normalizedCreditNumber,
        fileName: `cuotas-pagadas-${normalizedCreditNumber.toLowerCase()}.pdf`,
        pdfBase64,
        message: 'PDF de cuotas pagadas generado correctamente.',
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, { genericMsg: 'Error al generar reporte de cuotas pagadas' });
  }
}

async function generateLiquidatedCredits(
  body: GenerateLiquidatedCreditsReportBody,
  context: HandlerContext
) {
  const { request, appRoute } = context;
  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);
    const startDate = formatDateOnly(body.startDate);
    const endDate = formatDateOnly(body.endDate);

    const liquidatedEntries = await db.query.accountingEntries.findMany({
      where: and(
        eq(accountingEntries.processType, 'CREDIT'),
        inArray(accountingEntries.status, ['DRAFT', 'ACCOUNTED']),
        gte(accountingEntries.entryDate, startDate),
        lte(accountingEntries.entryDate, endDate)
      ),
      columns: {
        loanId: true,
        entryDate: true,
      },
      orderBy: [desc(accountingEntries.entryDate)],
    });

    const liquidationDatesByLoanId = new Map<number, string>();
    for (const entry of liquidatedEntries) {
      if (typeof entry.loanId !== 'number' || liquidationDatesByLoanId.has(entry.loanId)) continue;
      liquidationDatesByLoanId.set(entry.loanId, entry.entryDate);
    }

    const loanIds = Array.from(liquidationDatesByLoanId.keys());

    const liquidatedLoans = loanIds.length
      ? await db.query.loans.findMany({
          where: inArray(loans.id, loanIds),
          columns: {
            id: true,
            creditNumber: true,
            disbursementAmount: true,
            principalAmount: true,
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
          },
        })
      : [];

    const rows: LiquidatedCreditsReportRow[] = liquidatedLoans
      .map((loan) => ({
        creditNumber: loan.creditNumber,
        thirdPartyDocumentNumber: loan.borrower?.documentNumber ?? null,
        thirdPartyName: getThirdPartyLabel(loan.borrower),
        liquidatedAt: liquidationDatesByLoanId.get(loan.id) ?? startDate,
        liquidatedAmount: roundMoney(
          toNumber(loan.disbursementAmount) || toNumber(loan.principalAmount)
        ),
      }))
      .sort((a, b) => b.liquidatedAt.localeCompare(a.liquidatedAt) || b.creditNumber.localeCompare(a.creditNumber));

    return {
      status: 200 as const,
      body: {
        reportType: 'LIQUIDATED_CREDITS' as const,
        startDate,
        endDate,
        reviewedCredits: loanIds.length,
        reportedCredits: rows.length,
        rows,
        message: 'Reporte de creditos liquidados generado correctamente.',
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, { genericMsg: 'Error al generar reporte de creditos liquidados' });
  }
}

async function generateNonLiquidatedCredits(
  _body: GenerateNonLiquidatedCreditsReportBody,
  context: HandlerContext
) {
  const { request, appRoute } = context;
  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);
    const liquidatedLoanEntries = await db.query.accountingEntries.findMany({
      where: and(eq(accountingEntries.processType, 'CREDIT'), inArray(accountingEntries.status, ['DRAFT', 'ACCOUNTED'])),
      columns: {
        loanId: true,
      },
    });

    const liquidatedLoanIds = new Set(
      liquidatedLoanEntries.map((entry) => entry.loanId).filter((loanId): loanId is number => typeof loanId === 'number')
    );

    const generatedLoans = await db.query.loans.findMany({
      where: eq(loans.status, 'GENERATED'),
      columns: {
        creditNumber: true,
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
            name: true,
          },
        },
        loanApplication: {
          columns: {
            id: true,
            creditNumber: true,
            applicationDate: true,
            requestedAmount: true,
            approvedAmount: true,
            status: true,
          },
          with: {
            creditProduct: {
              columns: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: [desc(loans.creditNumber)],
    });

    const rows: NonLiquidatedCreditsReportRow[] = generatedLoans
      .filter((loan) => !liquidatedLoanIds.has(loan.loanApplication.id))
      .map((loan) => ({
        creditNumber: loan.creditNumber,
        requestNumber: loan.loanApplication.creditNumber,
        thirdPartyDocumentNumber: loan.borrower?.documentNumber ?? null,
        thirdPartyName: getThirdPartyLabel(loan.borrower),
        creditProductName: loan.loanApplication.creditProduct?.name ?? null,
        affiliationOfficeName: loan.affiliationOffice?.name ?? null,
        applicationDate: loan.loanApplication.applicationDate,
        status: 'GENERADO',
        requestedAmount: roundMoney(toNumber(loan.loanApplication.requestedAmount)),
        approvedAmount: roundMoney(toNumber(loan.loanApplication.approvedAmount)),
      }));

    return {
      status: 200 as const,
      body: {
        reportType: 'NON_LIQUIDATED_CREDITS' as const,
        reviewedCredits: generatedLoans.length,
        reportedCredits: rows.length,
        rows,
        message: 'Reporte de creditos no liquidados generado correctamente.',
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al generar reporte de creditos no liquidados',
    });
  }
}

async function generateLiquidatedNotDisbursedCredits(
  _body: GenerateLiquidatedNotDisbursedCreditsReportBody,
  context: HandlerContext
) {
  const { request, appRoute } = context;
  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);

    const liquidatedLoanEntries = await db.query.accountingEntries.findMany({
      where: and(
        eq(accountingEntries.processType, 'CREDIT'),
        inArray(accountingEntries.status, ['DRAFT', 'ACCOUNTED'])
      ),
      columns: {
        loanId: true,
        entryDate: true,
      },
      orderBy: [desc(accountingEntries.entryDate)],
    });

    const liquidatedDatesByLoanId = new Map<number, string>();
    for (const entry of liquidatedLoanEntries) {
      if (typeof entry.loanId !== 'number' || liquidatedDatesByLoanId.has(entry.loanId)) continue;
      liquidatedDatesByLoanId.set(entry.loanId, entry.entryDate);
    }

    const loansPendingDisbursement = await db.query.loans.findMany({
      where: and(
        inArray(loans.status, ['GENERATED', 'ACCOUNTED']),
        inArray(loans.disbursementStatus, ['LIQUIDATED', 'SENT_TO_ACCOUNTING', 'SENT_TO_BANK', 'REJECTED'])
      ),
      columns: {
        id: true,
        creditNumber: true,
        status: true,
        disbursementStatus: true,
        disbursementAmount: true,
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
            name: true,
          },
        },
        loanApplication: {
          columns: {
            creditNumber: true,
            applicationDate: true,
            requestedAmount: true,
            approvedAmount: true,
          },
          with: {
            creditProduct: {
              columns: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: [desc(loans.creditNumber)],
    });

    const rows: LiquidatedNotDisbursedCreditsReportRow[] = loansPendingDisbursement
      .filter((loan) => liquidatedDatesByLoanId.has(loan.id))
      .map((loan) => ({
        creditNumber: loan.creditNumber,
        requestNumber: loan.loanApplication.creditNumber,
        thirdPartyDocumentNumber: loan.borrower?.documentNumber ?? null,
        thirdPartyName: getThirdPartyLabel(loan.borrower),
        creditProductName: loan.loanApplication.creditProduct?.name ?? null,
        affiliationOfficeName: loan.affiliationOffice?.name ?? null,
        applicationDate: loan.loanApplication.applicationDate,
        liquidatedDate: liquidatedDatesByLoanId.get(loan.id) ?? null,
        status: loanStatusLabels[loan.status],
        disbursementStatus: loanDisbursementStatusLabels[loan.disbursementStatus],
        requestedAmount: roundMoney(toNumber(loan.loanApplication.requestedAmount)),
        approvedAmount: roundMoney(toNumber(loan.loanApplication.approvedAmount)),
        disbursementAmount: roundMoney(toNumber(loan.disbursementAmount)),
      }));

    return {
      status: 200 as const,
      body: {
        reportType: 'LIQUIDATED_NOT_DISBURSED_CREDITS' as const,
        reviewedCredits: loansPendingDisbursement.length,
        reportedCredits: rows.length,
        rows,
        message: 'Reporte de creditos liquidados no desembolsados generado correctamente.',
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al generar reporte de creditos liquidados no desembolsados',
    });
  }
}

async function generateCancelledRejectedCredits(
  body: GenerateCancelledRejectedCreditsReportBody,
  context: HandlerContext
) {
  const { request, appRoute } = context;
  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);
    const startDate = formatDateOnly(body.startDate);
    const endDate = formatDateOnly(body.endDate);

    let rows: CancelledRejectedCreditsReportRow[] = [];

    if (body.reportType === 'VOID') {
      const voidedLoans = await db.query.loans.findMany({
        where: and(
          eq(loans.status, 'VOID'),
          gte(loans.statusDate, startDate),
          lte(loans.statusDate, endDate)
        ),
        columns: {
          creditNumber: true,
          statusDate: true,
          note: true,
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
          loanApplication: {
            columns: {
              creditNumber: true,
              applicationDate: true,
              requestedAmount: true,
              approvedAmount: true,
            },
            with: {
              creditProduct: {
                columns: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: [desc(loans.statusDate), desc(loans.creditNumber)],
      });

      rows = voidedLoans.map((loan) => ({
          requestNumber: loan.loanApplication.creditNumber,
          creditNumber: loan.creditNumber,
          thirdPartyDocumentNumber: loan.borrower?.documentNumber ?? null,
          thirdPartyName: getThirdPartyLabel(loan.borrower),
          creditProductName: loan.loanApplication.creditProduct?.name ?? null,
          applicationDate: loan.loanApplication.applicationDate,
          status: cancelledRejectedCreditsReportTypeLabels.VOID,
          rejectionReason: loan.note ?? null,
          statusDate: loan.statusDate,
          requestedAmount: roundMoney(toNumber(loan.loanApplication.requestedAmount)),
          approvedAmount: roundMoney(toNumber(loan.loanApplication.approvedAmount)),
        }));
    } else {
      const applications = await db.query.loanApplications.findMany({
        where: and(
          eq(loanApplications.status, body.reportType),
          gte(loanApplications.statusDate, startDate),
          lte(loanApplications.statusDate, endDate)
        ),
        columns: {
          creditNumber: true,
          applicationDate: true,
          status: true,
          statusDate: true,
          requestedAmount: true,
          approvedAmount: true,
          statusNote: true,
        },
        with: {
          thirdParty: {
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
          creditProduct: {
            columns: {
              name: true,
            },
          },
          rejectionReason: {
            columns: {
              name: true,
            },
          },
        },
        orderBy: [desc(loanApplications.statusDate), desc(loanApplications.creditNumber)],
      });

      rows = applications.map((application) => ({
        requestNumber: application.creditNumber,
        creditNumber: null,
        thirdPartyDocumentNumber: application.thirdParty?.documentNumber ?? null,
        thirdPartyName: getThirdPartyLabel(application.thirdParty),
        creditProductName: application.creditProduct?.name ?? null,
        applicationDate: application.applicationDate,
        status: cancelledRejectedCreditsReportTypeLabels[body.reportType],
        rejectionReason: application.rejectionReason?.name ?? application.statusNote ?? null,
        statusDate: application.statusDate ?? application.applicationDate,
        requestedAmount: roundMoney(toNumber(application.requestedAmount)),
        approvedAmount: roundMoney(toNumber(application.approvedAmount)),
      }));
    }

    return {
      status: 200 as const,
      body: {
        reportType: 'CANCELLED_REJECTED_CREDITS' as const,
        filterType: body.reportType,
        startDate,
        endDate,
        reviewedCredits: rows.length,
        reportedCredits: rows.length,
        rows,
        message: `Reporte de ${cancelledRejectedCreditsReportTypeLabels[body.reportType].toLowerCase()} generado correctamente.`,
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al generar reporte de creditos anulados/rechazados',
    });
  }
}

async function generateSettledCredits(body: GenerateSettledCreditsReportBody, context: HandlerContext) {
  const { request, appRoute } = context;
  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);
    const startDate = formatDateOnly(body.startDate);
    const endDate = formatDateOnly(body.endDate);

    const settledLoans = await db.query.loans.findMany({
      where: or(
        and(eq(loans.status, 'PAID'), gte(loans.lastPaymentDate, startDate), lte(loans.lastPaymentDate, endDate)),
        and(
          eq(loans.status, 'PAID'),
          isNull(loans.lastPaymentDate),
          gte(loans.statusDate, startDate),
          lte(loans.statusDate, endDate)
        )
      ),
      columns: {
        creditNumber: true,
        principalAmount: true,
        lastPaymentDate: true,
        statusDate: true,
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
      },
      orderBy: [desc(loans.lastPaymentDate), desc(loans.statusDate), desc(loans.creditNumber)],
    });

    const rows: SettledCreditsReportRow[] = settledLoans.map((loan) => {
      const settledDate = loan.lastPaymentDate ?? loan.statusDate;

      return {
        creditNumber: loan.creditNumber,
        thirdPartyDocumentNumber: loan.borrower?.documentNumber ?? null,
        thirdPartyName: getThirdPartyLabel(loan.borrower),
        settledDate,
        lastPaymentDate: loan.lastPaymentDate ?? loan.statusDate,
        creditAmount: roundMoney(toNumber(loan.principalAmount)),
      };
    });

    return {
      status: 200 as const,
      body: {
        reportType: 'SETTLED_CREDITS' as const,
        startDate,
        endDate,
        reviewedCredits: rows.length,
        reportedCredits: rows.length,
        rows,
        message: 'Reporte de creditos saldados generado correctamente.',
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, { genericMsg: 'Error al generar reporte de creditos saldados' });
  }
}

async function generateMinutesPdf(body: GenerateMinutesPdfBody, context: HandlerContext) {
  const { request, appRoute } = context;
  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);
    const normalizedMinutesNumber = body.minutesNumber.trim().toUpperCase();
    const data = await buildMinutesReportData(normalizedMinutesNumber);
    const pdfBase64 = await renderTemplateToBase64(data, minutesReportTemplate);

    return {
      status: 200 as const,
      body: {
        reportType: 'MINUTES_PDF' as const,
        minutesNumber: normalizedMinutesNumber,
        fileName: `acta-${normalizedMinutesNumber.toLowerCase().replace(/\s+/g, '-')}.pdf`,
        pdfBase64,
        message: 'PDF de acta generado correctamente.',
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, { genericMsg: 'Error al generar PDF de acta' });
  }
}

async function listMinutesOptions(context: HandlerContext) {
  const { request, appRoute } = context;
  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);

    const rows = await db
      .select({
        minutesNumber: loanApplicationActNumbers.actNumber,
        actDate: loanApplicationActNumbers.actDate,
        reviewedApplicationsCount: count(loanApplications.id),
      })
      .from(loanApplicationActNumbers)
      .innerJoin(
        loanApplications,
        eq(loanApplications.actNumber, loanApplicationActNumbers.actNumber)
      )
      .where(isNotNull(loanApplications.actNumber))
      .groupBy(loanApplicationActNumbers.id)
      .orderBy(desc(loanApplicationActNumbers.actDate), desc(loanApplicationActNumbers.actNumber))
      .limit(200);

    const body: MinutesReportOption[] = rows.map((row) => ({
      minutesNumber: row.minutesNumber,
      actDate: row.actDate,
      reviewedApplicationsCount: row.reviewedApplicationsCount,
    }));

    return {
      status: 200 as const,
      body,
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, { genericMsg: 'Error al listar actas para el reporte' });
  }
}

async function generateCreditClearancePdf(
  body: GenerateCreditClearancePdfBody,
  context: HandlerContext
) {
  const { request, appRoute } = context;
  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);

    const normalizedCreditNumber = body.creditNumber.trim().toUpperCase();
    const data = await buildCreditClearanceData(normalizedCreditNumber);
    const pdfBase64 = await renderTemplateToBase64(data, creditClearanceTemplate);

    return {
      status: 200 as const,
      body: {
        reportType: 'CREDIT_CLEARANCE_PDF' as const,
        creditNumber: normalizedCreditNumber,
        fileName: `paz-y-salvo-credito-${normalizedCreditNumber.toLowerCase().replace(/\s+/g, '-')}.pdf`,
        pdfBase64,
        message: 'PDF de paz y salvo de credito generado correctamente.',
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, { genericMsg: 'Error al generar PDF de paz y salvo de credito' });
  }
}

async function generateThirdPartyClearancePdf(
  body: GenerateThirdPartyClearancePdfBody,
  context: HandlerContext
) {
  const { request, appRoute } = context;
  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);

    const normalizedDocumentNumber = body.thirdPartyDocumentNumber.trim();
    const data = await buildThirdPartyClearanceData(normalizedDocumentNumber);
    const pdfBase64 = await renderTemplateToBase64(data, thirdPartyClearanceTemplate);

    return {
      status: 200 as const,
      body: {
        reportType: 'THIRD_PARTY_CLEARANCE_PDF' as const,
        thirdPartyDocumentNumber: normalizedDocumentNumber,
        fileName: `paz-y-salvo-tercero-${normalizedDocumentNumber.toLowerCase().replace(/\s+/g, '-')}.pdf`,
        pdfBase64,
        message: 'PDF de paz y salvo de tercero generado correctamente.',
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, { genericMsg: 'Error al generar PDF de paz y salvo de tercero' });
  }
}

async function getExtract(query: GetExtractQuery, context: HandlerContext) {
  const { request, appRoute } = context;
  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);
    const report = await getCreditExtractReportData(query.creditNumber);

    return {
      status: 200 as const,
      body: report,
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al generar extracto de credito',
    });
  }
}

async function getExtractByLoanId(params: { id: number }, context: HandlerContext) {
  const { request, appRoute } = context;
  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);
    const report = await getCreditExtractReportDataByLoanId(params.id);

    return {
      status: 200 as const,
      body: report,
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: `Error al generar extracto para credito ${params.id}`,
    });
  }
}

export const creditReport = tsr.router(contract.creditReport, {
  generatePaidInstallments: ({ body }, context) => generatePaidInstallments(body, context),
  generateLiquidatedCredits: ({ body }, context) => generateLiquidatedCredits(body, context),
  generateNonLiquidatedCredits: ({ body }, context) => generateNonLiquidatedCredits(body, context),
  generateLiquidatedNotDisbursedCredits: ({ body }, context) =>
    generateLiquidatedNotDisbursedCredits(body, context),
  generateCancelledRejectedCredits: ({ body }, context) =>
    generateCancelledRejectedCredits(body, context),
  generateSettledCredits: ({ body }, context) => generateSettledCredits(body, context),
  generateMinutesPdf: ({ body }, context) => generateMinutesPdf(body, context),
  listMinutesOptions: (_, context) => listMinutesOptions(context),
  generateCreditClearancePdf: ({ body }, context) => generateCreditClearancePdf(body, context),
  generateThirdPartyClearancePdf: ({ body }, context) =>
    generateThirdPartyClearancePdf(body, context),
  getExtract: ({ query }, context) => getExtract(query, context),
  getExtractByLoanId: ({ params }, context) => getExtractByLoanId(params, context),
});
