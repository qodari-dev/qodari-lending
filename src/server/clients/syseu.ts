import { env } from '@/env';

function assertSyseuConfig() {
  if (!env.SYSEU_URL || !env.SYSEU_API_KEY) {
    throw new Error('Syseu no esta configurado en variables de entorno');
  }
}

type SyseuEnvelope<T> = {
  flag: boolean;
  msg: string;
  data: T;
};

type SyseuRequestOptions<T> = {
  allowNoData?: boolean;
  emptyValue?: T;
};

export type SyseuFamilyMemberRecord = {
  codigo_beneficiario?: string;
  beneficiary_code?: string;
  beneficiaryCode?: string;
  tipo_identificacion?: string;
  numero_identificacion?: string;
  conyuge_relacionada?: string;
  primer_apellido?: string;
  segundo_apellido?: string;
  primer_nombre?: string;
  segundo_nombre?: string;
  fecha_nacimiento?: string;
  parentesco?: string;
  companera_permanente?: string;
  compañera_permanente?: string;
  estado?: string;
};

export type SyseuWorkerRecord = SyseuFamilyMemberRecord & {
  nit_empresa?: string;
  razon_social?: string;
  categoria?: string;
  ciudad?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
};

export type SyseuFamilyGroupRecord = {
  trabajador?: SyseuWorkerRecord | null;
  conyuges?: SyseuFamilyMemberRecord | SyseuFamilyMemberRecord[] | null;
  beneficiarios?: SyseuFamilyMemberRecord[] | null;
};

export type SyseuSalaryHistoryRecord = {
  fecha_salario?: string;
  salario?: string | number;
};

export type SyseuAffiliationHistoryRecord = {
  nit_empresa?: string;
  razon_social?: string;
  codigo_sucursal?: string;
  codigo_lista?: string;
  fecha_afiliacion?: string;
  fecha_retiro?: string;
  codigo_estado?: string;
  fecha_sistema?: string;
};

export type SyseuSubsidyPaymentRecord = {
  oficina_afiliacion?: string;
  periodo?: string;
  nit_empresa?: string;
  codigo_sucursal?: string;
  codigo_lista?: string;
  codigo_beneficiario?: string;
  parentesco_beneficiario?: string;
  capacidad_trabajo?: string;
  cedula_trabajador?: string;
  cedula_conyuge?: string;
  cedula_responsable?: string;
  tipo_pago?: string;
  codigo_cuenta?: string;
  numero_cuenta?: string;
  tipo_cuenta?: string;
  numero_cuota?: string;
  valor_cuota?: string | number;
  periodo_giro?: string;
  propag?: string;
  muerte_trabajador?: string;
  pagtes?: string;
  pago?: string;
  usuario?: string;
  tipo_giro?: string;
  valcre?: string | number;
  marca?: string;
  documento?: string;
  valaju?: string | number;
  anulado?: string;
  codigo_anulacion?: string;
  periodo_anulacion?: string;
  estado_anulacion?: string;
  fecha_anulacion?: string;
  carnov?: string;
  fecha_asignacion?: string;
  fecha_entrega?: string;
  tipo_subsidio?: string;
  reemplazo?: string;
  subsi43?: SyseuPledgeRecord | null;
};

export type SyseuContributionHeaderRecord = {
  numero?: string;
  nitcaj?: string;
  nitver?: string;
  razpla?: string;
  coddoc?: string;
  nitpla?: string;
  digver?: string;
  nit?: string;
  tipapo?: string;
  direccion?: string;
  codciu?: string;
  coddep?: string;
  telefono?: string;
  fax?: string;
  email?: string;
  perapo?: string;
  periodo?: string;
  tippla?: string;
  fecpagpa?: string;
  fecrec?: string;
  fecsis?: string;
  numplaas?: string;
  numrad?: string;
  forpre?: string;
  codsuc?: string;
  nomsuc?: string;
  totemp?: string;
  admtra?: string;
  codope?: string;
  modpla?: string;
  diamor?: string;
  tottra?: string;
  fecmat?: string;
  coddepdp?: string;
  ley1429?: string;
  claapo?: string;
  natjur?: string;
  tipper?: string;
  valnom?: string | number;
  valcon?: string | number;
  valint?: string | number;
  nota?: string;
  estado?: string;
  codest?: string;
  tipdev?: string;
  estapo?: string;
  estnom?: string;
  nomarc?: string;
  marca?: string;
  documento?: string;
  genrec?: string;
  estcon?: string;
  aplica?: string;
  estint?: string;
  feccon?: string;
  fecapl?: string;
  prescrito?: string;
  fecpre?: string;
  geninc?: string;
};

export type SyseuContributionDetailRecord = {
  numero?: string;
  sec?: string;
  coddoc?: string;
  cedtra?: string;
  tipcot?: string;
  subtip?: string;
  extpen?: string;
  colext?: string;
  coddep?: string;
  codciu?: string;
  priape?: string;
  segape?: string;
  prinom?: string;
  segnom?: string;
  ingtra?: string;
  novret?: string;
  novvps?: string;
  novvts?: string;
  novstc?: string;
  novitg?: string;
  licnom?: string;
  vacnom?: string;
  incnom?: string;
  diatra?: string;
  salbas?: string | number;
  valnom?: string | number;
  tarapo?: string | number;
  valapo?: string | number;
  correc?: string;
  salint?: string;
  fecing?: string;
  fecret?: string;
  fecinivsp?: string;
  fecinisln?: string;
  fecfinsln?: string;
  feciniige?: string;
  fecfinige?: string;
  fecinilma?: string;
  fecfinlma?: string;
  fecinivaclr?: string;
  fecfinvaclr?: string;
  fecinivct?: string;
  fecfinvct?: string;
  feciniirl?: string;
  fecfinirl?: string;
  numhor?: string;
};

export type SyseuContributionRecord = {
  subsi64?: SyseuContributionHeaderRecord | null;
  subsi65?: SyseuContributionDetailRecord[] | null;
};

export type SyseuCurrentPeriodRecord = {
  periodo?: string;
  valor_subsidio?: string | number;
};

export type SyseuPledgeRecord = {
  marca?: string;
  documento?: string;
  cedula_trabajador?: string;
  cedula_conyuge?: string;
  valor_solicitado?: string | number;
  valor_credito?: string | number;
  valor_abono?: string | number;
  valor_descuento?: string | number;
  codigo_contable?: string;
  documento_cruce?: string;
  fecha?: string;
  estado?: string;
  fecha_estado?: string;
  indice?: string;
};

export type SyseuCreatePledgeInput = {
  workerDocumentNumber: string;
  spouseDocumentNumber: string | null;
  requestedValue: string | number;
  creditValue: string | number;
  paymentValue: string | number;
  discountValue: string | number;
  accountingCode: string;
  crossDocumentNumber: string;
  effectiveDate: string;
  status: string;
  isApplied: string;
};

function normalizeDocumentNumber(value: string): string {
  return value
    .trim()
    .replace(/[^\dA-Za-z]/g, '')
    .toUpperCase();
}

function normalizeSyseuMessage(value: string | undefined) {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isSyseuNoDataMessage(value: string | undefined) {
  const normalized = normalizeSyseuMessage(value);
  return (
    normalized.includes('no existe informacion') ||
    normalized.includes('no se encontro informacion') ||
    normalized.includes('sin informacion')
  );
}

class SyseuClient {
  private get baseUrl(): string {
    return env.SYSEU_URL ?? '';
  }

  private async request<T>(
    path: string,
    body: Record<string, string>,
    options?: SyseuRequestOptions<T>
  ): Promise<T> {
    assertSyseuConfig();

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-api-key': env.SYSEU_API_KEY ?? '',
      }),
      body: new URLSearchParams(body).toString(),
      cache: 'no-store',
    });

    const payload = (await response.json().catch(() => null)) as SyseuEnvelope<T> | null;

    if (!response.ok) {
      const detail = payload?.msg || `HTTP ${response.status}`;
      throw new Error(`Error en Syseu (${path}): ${detail}`);
    }

    if (!payload) {
      throw new Error(`Error en Syseu (${path}): Respuesta inválida`);
    }

    if (!payload.flag) {
      if (options?.allowNoData && isSyseuNoDataMessage(payload.msg)) {
        return options.emptyValue as T;
      }

      const detail = payload.msg || 'Respuesta inválida';
      throw new Error(`Error en Syseu (${path}): ${detail}`);
    }

    return payload.data;
  }

  async getFamilyGroupByDocument(documentNumber: string): Promise<SyseuFamilyGroupRecord | null> {
    const cleanDocumentNumber = normalizeDocumentNumber(documentNumber);
    const data = await this.request<SyseuFamilyGroupRecord | null>('/nucleoFamiliar', {
      cedtra: cleanDocumentNumber,
    }, {
      allowNoData: true,
      emptyValue: null,
    });

    return data ?? null;
  }

  async getSalaryHistoryByDocument(documentNumber: string): Promise<SyseuSalaryHistoryRecord[]> {
    const cleanDocumentNumber = normalizeDocumentNumber(documentNumber);
    const data = await this.request<{ trasal?: SyseuSalaryHistoryRecord[] | null }>(
      '/trayectoriaSalarios',
      {
        cedtra: cleanDocumentNumber,
      },
      {
        allowNoData: true,
        emptyValue: { trasal: [] },
      }
    );

    return data?.trasal ?? [];
  }

  async getAffiliationHistoryByDocument(
    documentNumber: string
  ): Promise<SyseuAffiliationHistoryRecord[]> {
    const cleanDocumentNumber = normalizeDocumentNumber(documentNumber);
    const data = await this.request<{ traafi?: SyseuAffiliationHistoryRecord[] | null }>(
      '/trayectoriaAfiliacion',
      {
        cedtra: cleanDocumentNumber,
      },
      {
        allowNoData: true,
        emptyValue: { traafi: [] },
      }
    );

    return data?.traafi ?? [];
  }

  async getSubsidyPaymentsByDocument(documentNumber: string): Promise<SyseuSubsidyPaymentRecord[]> {
    const cleanDocumentNumber = normalizeDocumentNumber(documentNumber);
    const data = await this.request<SyseuSubsidyPaymentRecord[]>('/giroSubsidio', {
      cedtra: cleanDocumentNumber,
    }, {
      allowNoData: true,
      emptyValue: [],
    });

    return data ?? [];
  }

  async getSubsidyPaymentsByPeriod(period: string): Promise<SyseuSubsidyPaymentRecord[]> {
    const cleanPeriod = period.trim();
    const data = await this.request<SyseuSubsidyPaymentRecord[]>('/giroSubsidio', {
      periodo: cleanPeriod,
    }, {
      allowNoData: true,
      emptyValue: [],
    });

    return data ?? [];
  }

  async getContributionsByDocument(documentNumber: string): Promise<SyseuContributionRecord[]> {
    const cleanDocumentNumber = normalizeDocumentNumber(documentNumber);
    const data = await this.request<SyseuContributionRecord[]>('/getAportes', {
      cedtra: cleanDocumentNumber,
    }, {
      allowNoData: true,
      emptyValue: [],
    });

    return data ?? [];
  }

  async getCurrentPeriod(): Promise<SyseuCurrentPeriodRecord | null> {
    const data = await this.request<{ periodo?: SyseuCurrentPeriodRecord | null }>(
      '/traerPeriodo',
      {}
    );
    return data?.periodo ?? null;
  }

  async getPledgesByDocument(documentNumber: string): Promise<SyseuPledgeRecord[]> {
    const cleanDocumentNumber = normalizeDocumentNumber(documentNumber);
    const data = await this.request<{ subsi43?: SyseuPledgeRecord[] | null }>(
      '/traerSubsi43',
      {
        cedtra: cleanDocumentNumber,
      },
      {
        allowNoData: true,
        emptyValue: { subsi43: [] },
      }
    );

    return data?.subsi43 ?? [];
  }

  async getPledgeByMarkDocument(mark: string, documentNumber: string): Promise<SyseuPledgeRecord | null> {
    const cleanMark = mark.trim();
    const cleanDocumentNumber = normalizeDocumentNumber(documentNumber);
    const data = await this.request<SyseuPledgeRecord | null>(
      '/traerSubsi43Unique',
      {
        marca: cleanMark,
        documento: cleanDocumentNumber,
      },
      {
        allowNoData: true,
        emptyValue: null,
      }
    );

    return data ?? null;
  }

  async createPledge(input: SyseuCreatePledgeInput): Promise<void> {
    await this.request<unknown>('/llenarSubsi43', {
      cedtra: normalizeDocumentNumber(input.workerDocumentNumber),
      cedcon: input.spouseDocumentNumber ? normalizeDocumentNumber(input.spouseDocumentNumber) : '',
      valsol: String(input.requestedValue),
      valcre: String(input.creditValue),
      valabo: String(input.paymentValue),
      valdes: String(input.discountValue),
      codcon: input.accountingCode.trim(),
      doccru: normalizeDocumentNumber(input.crossDocumentNumber),
      fecha: input.effectiveDate.trim(),
      estado: input.status.trim(),
      indapl: input.isApplied.trim(),
    });
  }

  async getWorkerByDocument(documentNumber: string) {
    const familyGroup = await this.getFamilyGroupByDocument(documentNumber);
    return familyGroup?.trabajador ?? null;
  }

  async getBeneficiariesByDocument(documentNumber: string) {
    const familyGroup = await this.getFamilyGroupByDocument(documentNumber);
    return familyGroup?.beneficiarios ?? [];
  }

  async getSpousesByDocument(documentNumber: string) {
    const familyGroup = await this.getFamilyGroupByDocument(documentNumber);
    return Array.isArray(familyGroup?.conyuges)
      ? familyGroup.conyuges
      : familyGroup?.conyuges
        ? [familyGroup.conyuges]
        : [];
  }

  async getTransfersByDocument(documentNumber: string) {
    return this.getSubsidyPaymentsByDocument(documentNumber);
  }
}

export const syseuClient = new SyseuClient();
