import { randomInt } from 'node:crypto';
import type { DbOrTx } from '@/server/db/connection';
import {
  agreements,
  creditProductCategories,
  creditProductDocuments,
  creditProducts,
  creditsSettings,
  db,
  insuranceCompanies,
  loanApplications,
  thirdParties,
} from '@/server/db';
import { env } from '@/env';
import { throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { normalizeDocumentNumber } from '@/server/utils/string-utils';
import { formatDateOnly, toNumber } from '@/server/utils/value-utils';
import {
  findInsuranceRateRange,
  resolveInsuranceFactorFromRange,
} from '@/utils/credit-simulation';
import { and, eq, gte, inArray, lte } from 'drizzle-orm';

export async function resolveCategoryAndFinancingFactor(args: {
  creditProductId: number;
  categoryCode: string;
  installments: number;
}) {
  const category = await db.query.creditProductCategories.findFirst({
    where: and(
      eq(creditProductCategories.creditProductId, args.creditProductId),
      eq(
        creditProductCategories.categoryCode,
        args.categoryCode as typeof creditProductCategories.$inferSelect.categoryCode
      ),
      lte(creditProductCategories.installmentsFrom, args.installments),
      gte(creditProductCategories.installmentsTo, args.installments)
    ),
  });

  if (!category) {
    throwHttpError({
      status: 404,
      message: 'No existe categoria configurada para la linea y el rango de cuotas seleccionado',
      code: 'NOT_FOUND',
    });
  }

  return {
    category,
    financingFactor: toNumber(category.financingFactor),
  };
}

export async function resolveInsuranceFactor(args: {
  creditProductId: number;
  insuranceCompanyId: number | null | undefined;
  installments: number;
  requestedAmount: number;
  product?: typeof creditProducts.$inferSelect | null;
}) {
  const product =
    args.product ??
    (await db.query.creditProducts.findFirst({
      where: and(eq(creditProducts.id, args.creditProductId), eq(creditProducts.isActive, true)),
    }));

  if (!product) {
    throwHttpError({
      status: 404,
      message: 'Linea de credito no encontrada',
      code: 'NOT_FOUND',
    });
  }

  if (!product.paysInsurance) {
    return {
      product,
      insuranceFactor: 0,
      insuranceCompanyId: null,
      insuranceRateType: null,
      insuranceRatePercent: 0,
      insuranceFixedAmount: 0,
      insuranceMinimumAmount: 0,
    };
  }

  if (!args.insuranceCompanyId) {
    throwHttpError({
      status: 400,
      message: 'Debe seleccionar una aseguradora para esta linea de credito',
      code: 'BAD_REQUEST',
    });
  }

  const insurer = await db.query.insuranceCompanies.findFirst({
    where: and(
      eq(insuranceCompanies.id, args.insuranceCompanyId),
      eq(insuranceCompanies.isActive, true)
    ),
    with: {
      insuranceRateRanges: true,
    },
  });

  if (!insurer) {
    throwHttpError({
      status: 404,
      message: 'Aseguradora no encontrada',
      code: 'NOT_FOUND',
    });
  }

  const metricValue =
    product.insuranceRangeMetric === 'INSTALLMENT_COUNT' ? args.installments : args.requestedAmount;

  const insuranceRange = findInsuranceRateRange({
    ranges: insurer.insuranceRateRanges,
    rangeMetric: product.insuranceRangeMetric,
    metricValue,
  });

  if (!insuranceRange) {
    throwHttpError({
      status: 400,
      message: 'La aseguradora no tiene un rango de tasa aplicable para esta solicitud',
      code: 'BAD_REQUEST',
    });
  }

  const insuranceResolved = resolveInsuranceFactorFromRange({
    range: insuranceRange,
    minimumValue: insurer.minimumValue,
  });

  return {
    product,
    insuranceFactor: insuranceResolved.insuranceFactor,
    insuranceCompanyId: insurer.id,
    insuranceRateType: insuranceResolved.insuranceRateType,
    insuranceRatePercent: insuranceResolved.insuranceRatePercent,
    insuranceFixedAmount: insuranceResolved.insuranceFixedAmount,
    insuranceMinimumAmount: insuranceResolved.insuranceMinimumAmount,
  };
}

export async function validateRequiredDocuments(args: {
  creditProductId: number;
  documents: {
    documentTypeId: number;
    isDelivered: boolean;
    fileKey?: string | null;
  }[];
}) {
  const requiredDocs = await db.query.creditProductDocuments.findMany({
    where: and(
      eq(creditProductDocuments.creditProductId, args.creditProductId),
      eq(creditProductDocuments.isRequired, true)
    ),
  });

  if (!requiredDocs.length) return;

  const submittedByType = new Map<number, { isDelivered: boolean; fileKey?: string | null }>();
  for (const doc of args.documents) {
    submittedByType.set(doc.documentTypeId, doc);
  }

  for (const requiredDoc of requiredDocs) {
    const submitted = submittedByType.get(requiredDoc.documentTypeId);
    if (!submitted || !submitted.isDelivered || !submitted.fileKey) {
      throwHttpError({
        status: 400,
        message: `Debe adjuntar todos los documentos obligatorios del tipo de credito`,
        code: 'BAD_REQUEST',
      });
    }
  }
}

export async function ensureThirdPartiesAreUpToDate(args: { thirdPartyIds: number[] }) {
  const ids = [...new Set(args.thirdPartyIds)];
  if (!ids.length) return;

  const existing = await db.query.thirdParties.findMany({
    where: inArray(thirdParties.id, ids),
    columns: { id: true, updatedAt: true },
  });

  if (existing.length !== ids.length) {
    throwHttpError({
      status: 400,
      message: 'Uno o más terceros asociados no existen',
      code: 'BAD_REQUEST',
    });
  }

  const today = formatDateOnly(new Date());
  const staleRecords = existing.filter(
    (thirdParty) => formatDateOnly(thirdParty.updatedAt) !== today
  );

  if (staleRecords.length) {
    throwHttpError({
      status: 400,
      message: 'Debe actualizar hoy la informacion del solicitante y codeudores antes de guardar',
      code: 'BAD_REQUEST',
    });
  }
}

export async function validateLoanApplicationAgreement(args: {
  agreementId: number;
  thirdPartyId: number;
  referenceDate: string;
}) {
  const [agreement, applicant] = await Promise.all([
    db.query.agreements.findFirst({
      where: and(eq(agreements.id, args.agreementId), eq(agreements.isActive, true)),
      columns: {
        id: true,
        agreementCode: true,
        businessName: true,
        documentNumber: true,
        startDate: true,
        endDate: true,
      },
    }),
    db.query.thirdParties.findFirst({
      where: eq(thirdParties.id, args.thirdPartyId),
      columns: {
        id: true,
        employerDocumentNumber: true,
        employerBusinessName: true,
      },
    }),
  ]);

  if (!agreement) {
    throwHttpError({
      status: 404,
      message: 'Convenio no encontrado o inactivo',
      code: 'NOT_FOUND',
    });
  }

  if (agreement.startDate && agreement.startDate > args.referenceDate) {
    throwHttpError({
      status: 400,
      message: 'El convenio seleccionado aun no esta vigente para la fecha de la solicitud',
      code: 'BAD_REQUEST',
    });
  }

  if (agreement.endDate && agreement.endDate < args.referenceDate) {
    throwHttpError({
      status: 400,
      message: 'El convenio seleccionado ya no esta vigente para la fecha de la solicitud',
      code: 'BAD_REQUEST',
    });
  }

  if (!applicant) {
    throwHttpError({
      status: 404,
      message: 'Solicitante no encontrado',
      code: 'NOT_FOUND',
    });
  }

  const employerDocument = normalizeDocumentNumber(applicant.employerDocumentNumber ?? '');
  const agreementDocument = normalizeDocumentNumber(agreement.documentNumber ?? '');

  if (!employerDocument) {
    throwHttpError({
      status: 400,
      message:
        'El solicitante no tiene empresa empleadora configurada. Actualice el tercero antes de asignar convenio',
      code: 'BAD_REQUEST',
    });
  }

  if (!agreementDocument || employerDocument !== agreementDocument) {
    throwHttpError({
      status: 400,
      message: `El solicitante no pertenece a la empresa del convenio ${agreement.agreementCode} - ${agreement.businessName}`,
      code: 'BAD_REQUEST',
    });
  }

  return agreement;
}

export async function getPledgeSubsidyCodeSetting() {
  const settings = await db.query.creditsSettings.findFirst({
    where: eq(creditsSettings.appSlug, env.IAM_APP_SLUG),
    columns: {
      pledgeSubsidyCode: true,
    },
  });

  const pledgeCode = settings?.pledgeSubsidyCode?.trim() || null;
  if (!pledgeCode) {
    throwHttpError({
      status: 400,
      message:
        'No existe codigo de pignoracion configurado en créditos. Actualice credit settings antes de guardar',
      code: 'BAD_REQUEST',
    });
  }

  return pledgeCode;
}

export function buildFallbackBeneficiaryCode(params: {
  documentNumber: string | null;
  spouseDocumentNumber: string | null;
  fullName: string;
  index: number;
}) {
  if (params.documentNumber) return params.documentNumber;
  return `BEN-${params.spouseDocumentNumber ?? 'SINCONYUGE'}-${params.index + 1}-${params.fullName
    .trim()
    .replace(/\s+/g, '-')
    .toUpperCase()}`;
}

function generateCreditNumber(prefix: string): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const rnd = randomInt(100, 1000);
  const normalizedPrefix = prefix.trim().toUpperCase().slice(0, 5);
  return `${normalizedPrefix}${yy}${mm}${dd}${hh}${mi}${ss}${rnd}`;
}

export async function ensureUniqueCreditNumber(prefix: string, dbOrTx: DbOrTx = db) {
  for (let i = 0; i < 5; i += 1) {
    const creditNumber = generateCreditNumber(prefix);
    const exists = await dbOrTx.query.loanApplications.findFirst({
      where: eq(loanApplications.creditNumber, creditNumber),
      columns: { id: true },
    });
    if (!exists) {
      return creditNumber;
    }
  }

  throwHttpError({
    status: 500,
    message: 'No fue posible generar consecutivo para la solicitud',
    code: 'INTERNAL_SERVER_ERROR',
  });
}
