import type {
  SyseuAffiliationHistoryRecord,
  SyseuContributionRecord,
  SyseuFamilyMemberRecord,
  SyseuSalaryHistoryRecord,
  SyseuSubsidyPaymentRecord,
} from '@/server/clients/syseu';
import { syseuClient } from '@/server/clients/syseu';
import {
  buildFullName,
  calculateAge,
  normalizeAlphanumericDocument,
  parseDateToISO,
} from '@/server/utils/string-utils';
import { toNumber } from '@/server/utils/value-utils';
import type { SubsidyProvider, SubsidyLookupInput } from '../subsidy-provider';
import type {
  SubsidyBeneficiary,
  SubsidyContribution,
  SubsidyPayment,
  SubsidyWorker,
} from '../subsidy.types';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getLatestSalaryValue(records: SyseuSalaryHistoryRecord[]) {
  const sorted = [...records].sort((left, right) =>
    String(right.fecha_salario ?? '').localeCompare(String(left.fecha_salario ?? ''))
  );

  for (const item of sorted) {
    const salary = toNumber(item.salario);
    if (Number.isFinite(salary) && salary > 0) return salary;
  }

  return 0;
}

function buildCompanyNameMap(contributions: SyseuContributionRecord[]) {
  const entries = new Map<string, string>();

  contributions.forEach((item) => {
    const companyDocument =
      normalizeAlphanumericDocument(item.subsi64?.nitpla) ??
      normalizeAlphanumericDocument(item.subsi64?.nit);
    const companyName = item.subsi64?.razpla?.trim();

    if (companyDocument && companyName) {
      entries.set(companyDocument, companyName);
    }
  });

  return entries;
}

function mapEmployment(
  item: SyseuAffiliationHistoryRecord,
  companyNames: Map<string, string>,
  currentSalary: number,
  index: number,
  total: number
) {
  const companyDocumentNumber = normalizeAlphanumericDocument(item.nit_empresa);
  const fallbackCompanyName =
    (companyDocumentNumber ? companyNames.get(companyDocumentNumber) : null) ??
    (companyDocumentNumber ? `Empresa ${companyDocumentNumber}` : `Empresa ${index + 1}`);
  const companyName = item.razon_social?.trim() || fallbackCompanyName;
  const leftCompanyAt = parseDateToISO(item.fecha_retiro);

  return {
    companyName,
    companyDocumentNumber,
    currentSalary,
    joinedCompanyAt: parseDateToISO(item.fecha_afiliacion),
    leftCompanyAt,
    joinedSubsidyAt: parseDateToISO(item.fecha_sistema) ?? parseDateToISO(item.fecha_afiliacion),
    isPrimary: !leftCompanyAt || index === total - 1,
  };
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function mapWorker(params: {
  worker: NonNullable<Awaited<ReturnType<typeof syseuClient.getWorkerByDocument>>>;
  salaries: SyseuSalaryHistoryRecord[];
  affiliations: SyseuAffiliationHistoryRecord[];
  contributions: SyseuContributionRecord[];
}): SubsidyWorker {
  const companyNames = buildCompanyNameMap(params.contributions);
  const currentSalary = getLatestSalaryValue(params.salaries);
  const employments = params.affiliations.map((item, index, list) =>
    mapEmployment(item, companyNames, currentSalary, index, list.length)
  );
  const primaryEmployment = employments.find((item) => item.isPrimary) ?? employments[0];

  return {
    fullName: buildFullName([
      params.worker.primer_nombre,
      params.worker.segundo_nombre,
      params.worker.primer_apellido,
      params.worker.segundo_apellido,
    ]),
    firstName: params.worker.primer_nombre?.trim() || null,
    secondName: params.worker.segundo_nombre?.trim() || null,
    firstLastName: params.worker.primer_apellido?.trim() || null,
    secondLastName: params.worker.segundo_apellido?.trim() || null,
    documentNumber:
      normalizeAlphanumericDocument(params.worker.numero_identificacion) ??
      params.worker.numero_identificacion ??
      '',
    identificationTypeCode: params.worker.tipo_identificacion?.trim() || null,
    currentSalary,
    categoryCode: params.worker.categoria?.trim() || null,
    sex: null,
    address: params.worker.direccion?.trim() || null,
    phone: params.worker.telefono?.trim() || null,
    email: params.worker.email?.trim() || null,
    companyName: params.worker.razon_social?.trim() || primaryEmployment?.companyName || null,
    joinedCompanyAt: primaryEmployment?.joinedCompanyAt ?? null,
    leftCompanyAt: primaryEmployment?.leftCompanyAt ?? null,
    joinedSubsidyAt: primaryEmployment?.joinedSubsidyAt ?? null,
    employments,
  };
}

function mapBeneficiary(record: SyseuFamilyMemberRecord): SubsidyBeneficiary {
  const birthDate = parseDateToISO(record.fecha_nacimiento);

  return {
    fullName: buildFullName([
      record.primer_nombre,
      record.segundo_nombre,
      record.primer_apellido,
      record.segundo_apellido,
    ]),
    documentNumber: normalizeAlphanumericDocument(record.numero_identificacion),
    identificationTypeCode: record.tipo_identificacion?.trim() || null,
    relationship: record.parentesco?.trim() || null,
    birthDate,
    age: calculateAge(birthDate),
    isDeceased: String(record.estado ?? '')
      .trim()
      .toUpperCase()
      .includes('FALLE'),
  };
}

function mapContribution(
  record: SyseuContributionRecord,
  companyNames: Map<string, string>
): SubsidyContribution[] {
  const header = record.subsi64;
  const details = record.subsi65 ?? [];
  const companyDoc =
    normalizeAlphanumericDocument(header?.nitpla) ??
    normalizeAlphanumericDocument(header?.nit);
  const companyName =
    (companyDoc ? companyNames.get(companyDoc) : null) ??
    header?.razpla?.trim() ??
    'Empresa sin nombre';
  const period = header?.periodo?.trim() ?? header?.perapo?.trim() ?? '';

  return details.map((detail) => ({
    period,
    companyName,
    companyDocumentNumber: companyDoc,
    workerDocumentNumber: normalizeAlphanumericDocument(detail.cedtra),
    baseSalary: toNumber(detail.salbas),
    contributionValue: toNumber(detail.valapo),
  }));
}

function mapSubsidyPayment(record: SyseuSubsidyPaymentRecord): SubsidyPayment {
  return {
    period: record.periodo?.trim() ?? '',
    beneficiaryRelationship: record.parentesco_beneficiario?.trim() || null,
    paymentType: record.tipo_pago?.trim() || null,
    installmentNumber: record.numero_cuota?.trim() || null,
    installmentValue: toNumber(record.valor_cuota),
    transferPeriod: record.periodo_giro?.trim() || null,
    isVoided: String(record.anulado ?? '').trim().toUpperCase() === 'S',
  };
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

class SyseuSubsidyProvider implements SubsidyProvider {
  readonly key = 'SYSEU' as const;

  async getWorker(input: SubsidyLookupInput): Promise<SubsidyWorker | null> {
    const [worker, salaries, affiliations, contributions] = await Promise.all([
      syseuClient.getWorkerByDocument(input.documentNumber),
      syseuClient.getSalaryHistoryByDocument(input.documentNumber),
      syseuClient.getAffiliationHistoryByDocument(input.documentNumber),
      syseuClient.getContributionsByDocument(input.documentNumber),
    ]);

    if (!worker) return null;

    return mapWorker({
      worker,
      salaries,
      affiliations,
      contributions,
    });
  }

  async getBeneficiaries(input: SubsidyLookupInput): Promise<SubsidyBeneficiary[]> {
    const records = await syseuClient.getBeneficiariesByDocument(input.documentNumber);
    return records.map(mapBeneficiary);
  }

  async getContributions(input: SubsidyLookupInput): Promise<SubsidyContribution[]> {
    const contributions = await syseuClient.getContributionsByDocument(input.documentNumber);
    const companyNames = buildCompanyNameMap(contributions);
    return contributions.flatMap((record) => mapContribution(record, companyNames));
  }

  async getSubsidyPayments(input: SubsidyLookupInput): Promise<SubsidyPayment[]> {
    const payments = await syseuClient.getSubsidyPaymentsByDocument(input.documentNumber);
    return payments.map(mapSubsidyPayment);
  }
}

export const syseuSubsidyProvider = new SyseuSubsidyProvider();
