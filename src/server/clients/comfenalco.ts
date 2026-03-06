import { env } from '@/env';

type ComfenalcoTokenResponse = {
  exito: boolean;
  mensaje: string;
  data: {
    token: string;
    tiempoExpiracion: number;
  };
};

type ComfenalcoApiEnvelope<T> = {
  exito: boolean;
  mensaje: string;
  data: T;
};

export type ComfenalcoBeneficiaryRecord = {
  parentesco: string;
  tdAfiliado: string;
  ndAfiliado: string;
  nombre1: string;
  nombre2: string;
  apellido1: string;
  apellido2: string;
  edad: string;
  fallecimiento: string;
};

export type ComfenalcoEmployerRecord = {
  razonSocialEmp: string;
  nroNitEmp: string;
  estadoEmp: string;
  salarioTrab: number;
  fecIngEmpr: string;
  fechaHasta: string;
  fecIngCaja: string;
  empPrincipal: string;
};

export type ComfenalcoWorkerRecord = {
  tdAfiliado: string;
  ndAfiliado: string;
  nombre1: string;
  nombre2: string;
  apellido1: string;
  apellido2: string;
  salarioTrab: number;
  razonSocial: string;
  fecIngEmpr: string;
  fechaHasta: string;
  fecIngCaja: string;
  beneficiarios: ComfenalcoBeneficiaryRecord[];
  empleadores: ComfenalcoEmployerRecord[];
};

type CachedToken = {
  token: string;
  expiresAtMs: number;
};

const TOKEN_REFRESH_MARGIN_MS = 60 * 1000;
const DEFAULT_TOKEN_TTL_MS = 5 * 60 * 1000;

function normalizeDocumentNumber(value: string): string {
  return value.trim().replace(/\D/g, '');
}

function resolveTokenExpirationMs(rawExpiration: number): number {
  if (!Number.isFinite(rawExpiration) || rawExpiration <= 0) {
    return Date.now() + DEFAULT_TOKEN_TTL_MS;
  }

  if (rawExpiration > 1_000_000_000_000) {
    return rawExpiration;
  }

  if (rawExpiration > 1_000_000_000) {
    return rawExpiration * 1000;
  }

  return Date.now() + rawExpiration * 1000;
}

class ComfenalcoClient {
  private tokenCache: CachedToken | null = null;

  private get baseUrl(): string {
    return env.COMFENALCO_URL ?? '';
  }

  private assertConfig() {
    if (
      !env.COMFENALCO_URL ||
      !env.COMFENALCO_APP_LLAVE ||
      !env.COMFENALCO_APP_APPTOKEN ||
      !env.COMFENALCO_APP_IDENTIFICADOR ||
      !env.COMFENALCO_APP_CLAVE
    ) {
      throw new Error('Comfenalco no esta configurado en variables de entorno');
    }
  }

  private isTokenValid() {
    if (!this.tokenCache) return false;
    return Date.now() < this.tokenCache.expiresAtMs - TOKEN_REFRESH_MARGIN_MS;
  }

  private async fetchNewToken(): Promise<string> {
    this.assertConfig();

    const response = await fetch(`${this.baseUrl}/seguridad/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appLlave: env.COMFENALCO_APP_LLAVE,
        appToken: env.COMFENALCO_APP_APPTOKEN,
        identificador: env.COMFENALCO_APP_IDENTIFICADOR,
        clave: env.COMFENALCO_APP_CLAVE,
      }),
    });

    const payload = (await response.json().catch(() => null)) as ComfenalcoTokenResponse | null;

    if (!response.ok || !payload?.exito || !payload?.data?.token) {
      const detail = payload?.mensaje || `HTTP ${response.status}`;
      throw new Error(`No fue posible autenticar con Comfenalco: ${detail}`);
    }

    const expiresAtMs = resolveTokenExpirationMs(payload.data.tiempoExpiracion);
    this.tokenCache = {
      token: payload.data.token,
      expiresAtMs: expiresAtMs > Date.now() ? expiresAtMs : Date.now() + DEFAULT_TOKEN_TTL_MS,
    };

    return this.tokenCache.token;
  }

  private async getAccessToken() {
    if (this.isTokenValid()) return this.tokenCache!.token;
    return this.fetchNewToken();
  }

  private async request<T>(
    path: string,
    options?: { method?: 'GET' | 'POST'; body?: unknown; skipAuthRetry?: boolean }
  ): Promise<T> {
    this.assertConfig();
    const token = await this.getAccessToken();

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: options?.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      ...(options?.body ? { body: JSON.stringify(options.body) } : {}),
    });

    if (response.status === 401 && !options?.skipAuthRetry) {
      this.tokenCache = null;
      return this.request<T>(path, { ...options, skipAuthRetry: true });
    }

    const payload = (await response.json().catch(() => null)) as ComfenalcoApiEnvelope<T> | null;

    if (!response.ok || !payload?.exito) {
      const detail = payload?.mensaje || `HTTP ${response.status}`;
      throw new Error(`Error en Comfenalco (${path}): ${detail}`);
    }

    return payload.data;
  }

  async getWorkerByDocument(documentNumber: string): Promise<ComfenalcoWorkerRecord | null> {
    const cleanDocumentNumber = normalizeDocumentNumber(documentNumber);
    const data = await this.request<ComfenalcoWorkerRecord[]>(
      `/consulta/afiliados/titular?numeroDocumento=${cleanDocumentNumber}`
    );
    return data[0] ?? null;
  }

  async getBeneficiariesByDocument(
    documentNumber: string
  ): Promise<ComfenalcoBeneficiaryRecord[]> {
    const cleanDocumentNumber = normalizeDocumentNumber(documentNumber);
    const data = await this.request<ComfenalcoWorkerRecord[]>(
      `/consulta/afiliados/pac?numeroDocumento=${cleanDocumentNumber}`
    );

    if (!data.length) return [];
    return data.flatMap((item) => item.beneficiarios ?? []);
  }
}

export const comfenalcoClient = new ComfenalcoClient();
