import type {
  ComfenalcoBeneficiaryRecord,
  ComfenalcoEmployerRecord,
  ComfenalcoWorkerRecord,
} from '@/server/clients/comfenalco';
import { comfenalcoClient } from '@/server/clients/comfenalco';
import { toNumber } from '@/server/utils/value-utils';
import type { SubsidyProvider, SubsidyLookupInput } from '../subsidy-provider';
import type { SubsidyBeneficiary, SubsidyWorker } from '../subsidy.types';

function normalizeDocument(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().replace(/\D/g, '');
  return normalized.length ? normalized : null;
}

function parseDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  if (/^\d{8}$/.test(trimmed)) {
    const yyyy = trimmed.slice(0, 4);
    const mm = trimmed.slice(4, 6);
    const dd = trimmed.slice(6, 8);
    return `${yyyy}-${mm}-${dd}`;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function buildFullName(parts: Array<string | null | undefined>) {
  const value = parts
    .map((part) => (part ?? '').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  return value || 'Afiliado';
}

function mapEmploymentFromEmployer(item: ComfenalcoEmployerRecord) {
  return {
    companyName: item.razonSocialEmp?.trim() || 'Empresa sin nombre',
    companyDocumentNumber: normalizeDocument(item.nroNitEmp),
    currentSalary: toNumber(item.salarioTrab),
    joinedCompanyAt: parseDate(item.fecIngEmpr),
    leftCompanyAt: parseDate(item.fechaHasta),
    joinedSubsidyAt: parseDate(item.fecIngCaja),
    isPrimary: String(item.empPrincipal).trim().toUpperCase() === 'X',
  };
}

function mapWorker(record: ComfenalcoWorkerRecord): SubsidyWorker {
  const employments = (record.empleadores ?? []).map(mapEmploymentFromEmployer);
  const primaryEmployment = employments.find((item) => item.isPrimary) ?? employments[0];

  return {
    fullName: buildFullName([record.nombre1, record.nombre2, record.apellido1, record.apellido2]),
    documentNumber: normalizeDocument(record.ndAfiliado) ?? record.ndAfiliado,
    identificationTypeCode: record.tdAfiliado?.trim() || null,
    currentSalary: toNumber(record.salarioTrab),
    companyName: primaryEmployment?.companyName ?? (record.razonSocial?.trim() || null),
    joinedCompanyAt: primaryEmployment?.joinedCompanyAt ?? parseDate(record.fecIngEmpr),
    leftCompanyAt: primaryEmployment?.leftCompanyAt ?? parseDate(record.fechaHasta),
    joinedSubsidyAt: primaryEmployment?.joinedSubsidyAt ?? parseDate(record.fecIngCaja),
    employments,
  };
}

function mapBeneficiary(record: ComfenalcoBeneficiaryRecord): SubsidyBeneficiary {
  const fallecimiento = String(record.fallecimiento ?? '')
    .trim()
    .toUpperCase();

  return {
    fullName: buildFullName([record.nombre1, record.nombre2, record.apellido1, record.apellido2]),
    documentNumber: normalizeDocument(record.ndAfiliado),
    identificationTypeCode: record.tdAfiliado?.trim() || null,
    relationship: record.parentesco?.trim() || null,
    age: Number.isFinite(Number(record.edad)) ? Number(record.edad) : null,
    isDeceased: fallecimiento === 'X' || fallecimiento === '1' || fallecimiento === 'SI',
  };
}

class ComfenalcoSubsidyProvider implements SubsidyProvider {
  readonly key = 'COMFENALCO' as const;

  async getWorker(input: SubsidyLookupInput): Promise<SubsidyWorker | null> {
    const record = await comfenalcoClient.getWorkerByDocument(input.documentNumber);
    if (!record) return null;
    return mapWorker(record);
  }

  async getBeneficiaries(input: SubsidyLookupInput): Promise<SubsidyBeneficiary[]> {
    const fromPac = await comfenalcoClient.getBeneficiariesByDocument(input.documentNumber);
    if (fromPac.length) return fromPac.map(mapBeneficiary);

    const worker = await comfenalcoClient.getWorkerByDocument(input.documentNumber);
    return (worker?.beneficiarios ?? []).map(mapBeneficiary);
  }
}

export const comfenalcoSubsidyProvider = new ComfenalcoSubsidyProvider();
