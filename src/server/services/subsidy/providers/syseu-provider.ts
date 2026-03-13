import type {
  SyseuAffiliationHistoryRecord,
  SyseuContributionRecord,
  SyseuFamilyMemberRecord,
  SyseuPledgeRecord,
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
  SubsidyCurrentPeriod,
  SubsidyContribution,
  SubsidyPayment,
  SubsidyPledge,
  SubsidySalaryHistory,
  SubsidySpouse,
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
  const documentNumber = normalizeAlphanumericDocument(record.numero_identificacion);
  const beneficiaryCode =
    record.codigo_beneficiario?.trim() ||
    record.beneficiary_code?.trim() ||
    record.beneficiaryCode?.trim() ||
    documentNumber;

  return {
    beneficiaryCode: beneficiaryCode || null,
    fullName: buildFullName([
      record.primer_nombre,
      record.segundo_nombre,
      record.primer_apellido,
      record.segundo_apellido,
    ]),
    documentNumber,
    identificationTypeCode: record.tipo_identificacion?.trim() || null,
    relationship: record.parentesco?.trim() || null,
    relatedSpouseDocumentNumber: normalizeAlphanumericDocument(record.conyuge_relacionada),
    birthDate,
    age: calculateAge(birthDate),
    isDeceased: String(record.estado ?? '')
      .trim()
      .toUpperCase()
      .includes('FALLE'),
  };
}

function mapSpouse(record: SyseuFamilyMemberRecord): SubsidySpouse {
  const birthDate = parseDateToISO(record.fecha_nacimiento);
  const permanentPartnerFlag = String(
    record.companera_permanente ?? record['compañera_permanente'] ?? ''
  )
    .trim()
    .toUpperCase();

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
    isPermanentPartner:
      permanentPartnerFlag === 'SI' || permanentPartnerFlag === 'S' || permanentPartnerFlag === '1',
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

function mapSalaryHistory(record: SyseuSalaryHistoryRecord): SubsidySalaryHistory | null {
  const effectiveDate = parseDateToISO(record.fecha_salario);
  const salary = toNumber(record.salario);

  if (!effectiveDate || !Number.isFinite(salary) || salary < 0) {
    return null;
  }

  return {
    effectiveDate,
    salary,
  };
}

function mapPledge(record: SyseuPledgeRecord): SubsidyPledge {
  const isIndexed = String(record.indice ?? '')
    .trim()
    .toUpperCase();

  return {
    mark: record.marca?.trim() || null,
    documentNumber: normalizeAlphanumericDocument(record.documento),
    workerDocumentNumber: normalizeAlphanumericDocument(record.cedula_trabajador),
    spouseDocumentNumber: normalizeAlphanumericDocument(record.cedula_conyuge),
    requestedValue: toNumber(record.valor_solicitado),
    creditValue: toNumber(record.valor_credito),
    paymentValue: toNumber(record.valor_abono),
    discountValue: toNumber(record.valor_descuento),
    accountingCode: record.codigo_contable?.trim() || null,
    crossDocumentNumber: normalizeAlphanumericDocument(record.documento_cruce),
    effectiveDate: parseDateToISO(record.fecha),
    status: record.estado?.trim() || null,
    statusDate: parseDateToISO(record.fecha_estado),
    isIndexed: isIndexed === 'SI' || isIndexed === 'S' || isIndexed === '1',
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

  async getSpouses(input: SubsidyLookupInput): Promise<SubsidySpouse[]> {
    const records = await syseuClient.getSpousesByDocument(input.documentNumber);
    return records.map(mapSpouse);
  }

  async getSalaryHistory(input: SubsidyLookupInput): Promise<SubsidySalaryHistory[]> {
    const records = await syseuClient.getSalaryHistoryByDocument(input.documentNumber);
    return records
      .map(mapSalaryHistory)
      .filter((item): item is SubsidySalaryHistory => item !== null)
      .sort((left, right) => right.effectiveDate.localeCompare(left.effectiveDate));
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

  async getPledges(input: SubsidyLookupInput): Promise<SubsidyPledge[]> {
    const records = await syseuClient.getPledgesByDocument(input.documentNumber);
    return records.map(mapPledge);
  }

  async getCurrentPeriod(): Promise<SubsidyCurrentPeriod | null> {
    const currentPeriod = await syseuClient.getCurrentPeriod();

    if (!currentPeriod?.periodo?.trim()) {
      return null;
    }

    return {
      period: currentPeriod.periodo.trim(),
      subsidyValue: toNumber(currentPeriod.valor_subsidio),
    };
  }
}

export const syseuSubsidyProvider = new SyseuSubsidyProvider();
