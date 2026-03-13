import type {
  ComfenalcoBeneficiaryRecord,
  ComfenalcoEmployerRecord,
  ComfenalcoWorkerRecord,
} from '@/server/clients/comfenalco';
import { comfenalcoClient } from '@/server/clients/comfenalco';
import { buildFullName, normalizeDigitsOnly, parseDateToISO } from '@/server/utils/string-utils';
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

function mapEmploymentFromEmployer(item: ComfenalcoEmployerRecord) {
  return {
    companyName: item.razonSocialEmp?.trim() || 'Empresa sin nombre',
    companyDocumentNumber: normalizeDigitsOnly(item.nroNitEmp),
    currentSalary: toNumber(item.salarioTrab),
    joinedCompanyAt: parseDateToISO(item.fecIngEmpr),
    leftCompanyAt: parseDateToISO(item.fechaHasta),
    joinedSubsidyAt: parseDateToISO(item.fecIngCaja),
    isPrimary: String(item.empPrincipal).trim().toUpperCase() === 'X',
  };
}

function mapWorker(record: ComfenalcoWorkerRecord): SubsidyWorker {
  const employments = (record.empleadores ?? []).map(mapEmploymentFromEmployer);
  const primaryEmployment = employments.find((item) => item.isPrimary) ?? employments[0];

  return {
    fullName: buildFullName([record.nombre1, record.nombre2, record.apellido1, record.apellido2]),
    firstName: record.nombre1?.trim() || null,
    secondName: record.nombre2?.trim() || null,
    firstLastName: record.apellido1?.trim() || null,
    secondLastName: record.apellido2?.trim() || null,
    documentNumber: normalizeDigitsOnly(record.ndAfiliado) ?? record.ndAfiliado,
    identificationTypeCode: record.tdAfiliado?.trim() || null,
    currentSalary: toNumber(record.salarioTrab),
    categoryCode: null, // Comfenalco no devuelve categoría
    sex: null, // Comfenalco no devuelve sexo
    address: null, // Comfenalco no devuelve dirección
    phone: null, // Comfenalco no devuelve teléfono
    email: null, // Comfenalco no devuelve email
    companyName: primaryEmployment?.companyName ?? (record.razonSocial?.trim() || null),
    joinedCompanyAt: primaryEmployment?.joinedCompanyAt ?? parseDateToISO(record.fecIngEmpr),
    leftCompanyAt: primaryEmployment?.leftCompanyAt ?? parseDateToISO(record.fechaHasta),
    joinedSubsidyAt: primaryEmployment?.joinedSubsidyAt ?? parseDateToISO(record.fecIngCaja),
    employments,
  };
}

function mapBeneficiary(record: ComfenalcoBeneficiaryRecord): SubsidyBeneficiary {
  const fallecimiento = String(record.fallecimiento ?? '')
    .trim()
    .toUpperCase();
  const documentNumber = normalizeDigitsOnly(record.ndAfiliado);

  return {
    beneficiaryCode: documentNumber,
    fullName: buildFullName([record.nombre1, record.nombre2, record.apellido1, record.apellido2]),
    documentNumber,
    identificationTypeCode: record.tdAfiliado?.trim() || null,
    relationship: record.parentesco?.trim() || null,
    relatedSpouseDocumentNumber: null,
    birthDate: null, // Comfenalco no devuelve fecha de nacimiento
    age: Number.isFinite(Number(record.edad)) ? Number(record.edad) : null,
    isDeceased: fallecimiento === 'X' || fallecimiento === '1' || fallecimiento === 'SI',
  };
}

function mapSpouse(record: ComfenalcoBeneficiaryRecord): SubsidySpouse {
  return {
    fullName: buildFullName([record.nombre1, record.nombre2, record.apellido1, record.apellido2]),
    documentNumber: normalizeDigitsOnly(record.ndAfiliado),
    identificationTypeCode: record.tdAfiliado?.trim() || null,
    relationship: record.parentesco?.trim() || null,
    birthDate: null,
    isPermanentPartner: false,
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

  async getSpouses(input: SubsidyLookupInput): Promise<SubsidySpouse[]> {
    const beneficiaries = await this.getBeneficiaries(input);
    return beneficiaries
      .filter((item) => {
        const normalized = String(item.relationship ?? '').trim().toUpperCase();
        return (
          normalized.includes('CONYUGE') ||
          normalized.includes('COMPANER') ||
          normalized.includes('ESPOS') ||
          normalized.includes('PAREJA')
        );
      })
      .map((item) =>
        mapSpouse({
          parentesco: item.relationship ?? '',
          tdAfiliado: item.identificationTypeCode ?? '',
          ndAfiliado: item.documentNumber ?? '',
          nombre1: item.fullName,
          nombre2: '',
          apellido1: '',
          apellido2: '',
          edad: item.age != null ? String(item.age) : '',
          fallecimiento: item.isDeceased ? 'SI' : 'NO',
        })
      );
  }

  async getSalaryHistory(_input: SubsidyLookupInput): Promise<SubsidySalaryHistory[]> {
    return [];
  }

  async getContributions(_input: SubsidyLookupInput): Promise<SubsidyContribution[]> {
    // Comfenalco no devuelve historial de aportes todavía
    return [];
  }

  async getSubsidyPayments(_input: SubsidyLookupInput): Promise<SubsidyPayment[]> {
    // Comfenalco no devuelve historial de giro de subsidio todavía
    return [];
  }

  async getPledges(_input: SubsidyLookupInput): Promise<SubsidyPledge[]> {
    // Comfenalco no devuelve pignoraciones todavía
    return [];
  }

  async getCurrentPeriod(): Promise<SubsidyCurrentPeriod | null> {
    return null;
  }
}

export const comfenalcoSubsidyProvider = new ComfenalcoSubsidyProvider();
