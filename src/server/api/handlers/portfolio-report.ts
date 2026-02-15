import {
  GenerateCreditBalanceCertificateBodySchema,
  GenerateCreditsForCollectionBodySchema,
  GenerateCurrentPortfolioBodySchema,
  GenerateHistoricalPortfolioByPeriodBodySchema,
  GeneratePortfolioIndicatorsBodySchema,
  GeneratePayrollPortfolioByAgreementBodySchema,
  GeneratePortfolioByCreditTypeBodySchema,
  GenerateThirdPartyBalanceCertificateBodySchema,
  PortfolioIndicatorsReportRow,
} from '@/schemas/portfolio-report';
import { genericTsRestErrorResponse } from '@/server/utils/generic-ts-rest-error';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { roundMoney } from '@/server/utils/value-utils';
import { tsr } from '@ts-rest/serverless/next';
import { format } from 'date-fns';
import { z } from 'zod';
import { contract } from '../contracts';

type GenerateCurrentPortfolioBody = z.infer<typeof GenerateCurrentPortfolioBodySchema>;
type GenerateHistoricalPortfolioByPeriodBody = z.infer<
  typeof GenerateHistoricalPortfolioByPeriodBodySchema
>;
type GenerateCreditsForCollectionBody = z.infer<typeof GenerateCreditsForCollectionBodySchema>;
type GeneratePayrollPortfolioByAgreementBody = z.infer<
  typeof GeneratePayrollPortfolioByAgreementBodySchema
>;
type GeneratePortfolioByCreditTypeBody = z.infer<typeof GeneratePortfolioByCreditTypeBodySchema>;
type GeneratePortfolioIndicatorsBody = z.infer<typeof GeneratePortfolioIndicatorsBodySchema>;
type GenerateCreditBalanceCertificateBody = z.infer<
  typeof GenerateCreditBalanceCertificateBodySchema
>;
type GenerateThirdPartyBalanceCertificateBody = z.infer<
  typeof GenerateThirdPartyBalanceCertificateBodySchema
>;

type PermissionRequest = Parameters<typeof getAuthContextAndValidatePermission>[0];
type PermissionMetadata = Parameters<typeof getAuthContextAndValidatePermission>[1];

type HandlerContext = {
  request: PermissionRequest;
  appRoute: { metadata: PermissionMetadata };
};

type PortfolioReportType =
  | 'CURRENT_PORTFOLIO'
  | 'HISTORICAL_PORTFOLIO_BY_PERIOD'
  | 'CREDITS_FOR_COLLECTION'
  | 'PAYROLL_PORTFOLIO_BY_AGREEMENT'
  | 'PORTFOLIO_BY_CREDIT_TYPE'
  | 'CREDIT_BALANCE_CERTIFICATE'
  | 'THIRD_PARTY_BALANCE_CERTIFICATE';

type PortfolioReportRow = {
  creditNumber: string;
  thirdPartyDocumentNumber: string | null;
  thirdPartyName: string;
  agreementName: string | null;
  creditProductName: string | null;
  status: string;
  outstandingBalance: number;
  overdueBalance: number;
  note: string | null;
};

function toDateOnly(value: Date) {
  return format(value, 'yyyy-MM-dd');
}

function reportTypeSeed(reportType: PortfolioReportType) {
  return reportType.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

function buildMockRows(
  reportType: PortfolioReportType,
  cutoffDate: string,
  reportedCredits: number
): PortfolioReportRow[] {
  const seed = reportTypeSeed(reportType);
  const cutoffCompact = cutoffDate.replace(/-/g, '').slice(2);

  return Array.from({ length: reportedCredits }).map((_, index) => {
    const sequence = index + 1;
    const baseBalance = 1_200_000 + (seed % 11) * 85_000 + sequence * 47_000;
    const overdueBalance = roundMoney(baseBalance * (0.08 + (seed % 5) * 0.02));

    return {
      creditNumber: `CR${cutoffCompact}${String(sequence).padStart(5, '0')}`,
      thirdPartyDocumentNumber: `10${String(20000000 + sequence)}`,
      thirdPartyName: `Tercero ${sequence}`,
      agreementName: sequence % 2 === 0 ? `Convenio ${((seed + sequence) % 7) + 1}` : null,
      creditProductName: `Producto ${((seed + sequence) % 5) + 1}`,
      status: sequence % 3 === 0 ? 'EN MORA' : 'AL DIA',
      outstandingBalance: baseBalance,
      overdueBalance,
      note: sequence % 4 === 0 ? 'Revision manual sugerida' : null,
    };
  });
}

function buildMockReport<TReportType extends PortfolioReportType>(
  reportType: TReportType,
  cutoffDateValue: Date
): {
  reportType: TReportType;
  cutoffDate: string;
  reviewedCredits: number;
  reportedCredits: number;
  rows: PortfolioReportRow[];
  message: string;
} {
  const cutoffDate = toDateOnly(cutoffDateValue);
  const seed = reportTypeSeed(reportType);
  const reviewedCredits = 70 + (seed % 30);
  const reportedCredits = Math.max(10, Math.floor(reviewedCredits * (0.62 + (seed % 4) * 0.07)));
  const rows = buildMockRows(reportType, cutoffDate, reportedCredits);

  return {
    reportType,
    cutoffDate,
    reviewedCredits,
    reportedCredits,
    rows,
    message: 'Reporte de cartera generado (demo).',
  };
}

async function generateCurrentPortfolio(body: GenerateCurrentPortfolioBody, context: HandlerContext) {
  const { request, appRoute } = context;
  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);

    // TODO(portfolio-report-current): consultar cartera vigente a fecha de corte y consolidar saldos por credito.
    return {
      status: 200 as const,
      body: buildMockReport('CURRENT_PORTFOLIO', body.cutoffDate),
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al generar reporte cartera de creditos actual',
    });
  }
}

async function generateHistoricalPortfolioByPeriod(
  body: GenerateHistoricalPortfolioByPeriodBody,
  context: HandlerContext
) {
  const { request, appRoute } = context;
  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);

    // TODO(portfolio-report-historical-period): consultar snapshot historico del periodo de corte y generar reporte.
    return {
      status: 200 as const,
      body: buildMockReport('HISTORICAL_PORTFOLIO_BY_PERIOD', body.cutoffDate),
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al generar reporte historico de cartera por periodo',
    });
  }
}

async function generateCreditsForCollection(
  body: GenerateCreditsForCollectionBody,
  context: HandlerContext
) {
  const { request, appRoute } = context;
  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);

    // TODO(portfolio-report-credits-collection): listar creditos para cobro segun reglas de mora y etapa de recaudo.
    return {
      status: 200 as const,
      body: buildMockReport('CREDITS_FOR_COLLECTION', body.cutoffDate),
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al generar reporte de creditos para cobro',
    });
  }
}

async function generatePayrollPortfolioByAgreement(
  body: GeneratePayrollPortfolioByAgreementBody,
  context: HandlerContext
) {
  const { request, appRoute } = context;
  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);

    // TODO(portfolio-report-payroll-agreement): consolidar cartera de libranza agrupada por convenio/empresa.
    return {
      status: 200 as const,
      body: buildMockReport('PAYROLL_PORTFOLIO_BY_AGREEMENT', body.cutoffDate),
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al generar reporte de cartera de libranza por convenio',
    });
  }
}

async function generatePortfolioByCreditType(
  body: GeneratePortfolioByCreditTypeBody,
  context: HandlerContext
) {
  const { request, appRoute } = context;
  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);

    // TODO(portfolio-report-credit-type): consolidar cartera por tipo de credito y saldos asociados a la fecha de corte.
    return {
      status: 200 as const,
      body: buildMockReport('PORTFOLIO_BY_CREDIT_TYPE', body.cutoffDate),
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al generar reporte de cartera por tipo de credito',
    });
  }
}

function buildPortfolioIndicatorsRows(cutoffDate: string): PortfolioIndicatorsReportRow[] {
  const seed = cutoffDate.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const grossPortfolio = roundMoney(65_000_000 + (seed % 20) * 1_200_000);
  const overduePortfolio = roundMoney(grossPortfolio * (0.11 + (seed % 6) * 0.008));
  const delinquencyRate = Number(((overduePortfolio / grossPortfolio) * 100).toFixed(2));
  const activeCredits = 180 + (seed % 60);
  const averageBalance = roundMoney(grossPortfolio / activeCredits);

  return [
    {
      indicatorCode: 'ICM',
      indicatorName: 'Indice de cartera en mora',
      indicatorValue: delinquencyRate,
      unit: 'PERCENTAGE',
    },
    {
      indicatorCode: 'CT',
      indicatorName: 'Cartera total vigente',
      indicatorValue: grossPortfolio,
      unit: 'CURRENCY',
    },
    {
      indicatorCode: 'CM',
      indicatorName: 'Cartera vencida',
      indicatorValue: overduePortfolio,
      unit: 'CURRENCY',
    },
    {
      indicatorCode: 'CA',
      indicatorName: 'Creditos activos',
      indicatorValue: activeCredits,
      unit: 'COUNT',
    },
    {
      indicatorCode: 'PS',
      indicatorName: 'Promedio saldo por credito',
      indicatorValue: averageBalance,
      unit: 'CURRENCY',
    },
  ];
}

async function generatePortfolioIndicators(
  body: GeneratePortfolioIndicatorsBody,
  context: HandlerContext
) {
  const { request, appRoute } = context;
  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);
    const cutoffDate = toDateOnly(body.cutoffDate);
    const rows = buildPortfolioIndicatorsRows(cutoffDate);

    // TODO(portfolio-report-indicators): calcular indicadores de cartera oficiales con reglas contables vigentes.
    return {
      status: 200 as const,
      body: {
        reportType: 'PORTFOLIO_INDICATORS' as const,
        cutoffDate,
        reviewedCredits: 100 + rows.length * 12,
        reportedCredits: rows.length,
        rows,
        message: 'Indicadores de cartera generados (demo).',
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al generar indicadores de cartera',
    });
  }
}

async function generateCreditBalanceCertificate(
  body: GenerateCreditBalanceCertificateBody,
  context: HandlerContext
) {
  const { request, appRoute } = context;
  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);

    // TODO(portfolio-report-credit-balance-certificate): emitir certificado de saldo por credito con corte.
    return {
      status: 200 as const,
      body: buildMockReport('CREDIT_BALANCE_CERTIFICATE', body.cutoffDate),
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al generar certificado de saldo del credito',
    });
  }
}

async function generateThirdPartyBalanceCertificate(
  body: GenerateThirdPartyBalanceCertificateBody,
  context: HandlerContext
) {
  const { request, appRoute } = context;
  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);

    // TODO(portfolio-report-third-party-balance-certificate): emitir certificado de saldo consolidado por tercero.
    return {
      status: 200 as const,
      body: buildMockReport('THIRD_PARTY_BALANCE_CERTIFICATE', body.cutoffDate),
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al generar certificado de saldo del tercero',
    });
  }
}

export const portfolioReport = tsr.router(contract.portfolioReport, {
  generateCurrentPortfolio: ({ body }, context) => generateCurrentPortfolio(body, context),
  generateHistoricalPortfolioByPeriod: ({ body }, context) =>
    generateHistoricalPortfolioByPeriod(body, context),
  generateCreditsForCollection: ({ body }, context) => generateCreditsForCollection(body, context),
  generatePayrollPortfolioByAgreement: ({ body }, context) =>
    generatePayrollPortfolioByAgreement(body, context),
  generatePortfolioByCreditType: ({ body }, context) => generatePortfolioByCreditType(body, context),
  generatePortfolioIndicators: ({ body }, context) => generatePortfolioIndicators(body, context),
  generateCreditBalanceCertificate: ({ body }, context) =>
    generateCreditBalanceCertificate(body, context),
  generateThirdPartyBalanceCertificate: ({ body }, context) =>
    generateThirdPartyBalanceCertificate(body, context),
});
