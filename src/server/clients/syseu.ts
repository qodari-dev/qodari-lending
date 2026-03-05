import { env } from '@/env';

function assertSyseuConfig() {
  if (!env.SYSEU_URL || !env.SYSEU_API_KEY) {
    throw new Error('Syseu no esta configurado en variables de entorno');
  }
}

class SyseuClient {
  async getWorkerByDocument(_documentNumber: string) {
    assertSyseuConfig();
    throw new Error('Syseu client pendiente por implementar');
  }

  async getBeneficiariesByDocument(_documentNumber: string) {
    assertSyseuConfig();
    return [] as const;
  }

  async getTransfersByDocument(_documentNumber: string) {
    assertSyseuConfig();
    return [] as const;
  }
}

export const syseuClient = new SyseuClient();
