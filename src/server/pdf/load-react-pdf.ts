import { throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { ReactPdfModule } from './types';

let cached: ReactPdfModule | null = null;

export async function loadReactPdf(): Promise<ReactPdfModule> {
  if (cached) return cached;

  try {
    const moduleName = '@react-pdf/renderer';
    const mod = (await import(moduleName)) as unknown as ReactPdfModule;
    cached = mod;
    return mod;
  } catch {
    throwHttpError({
      status: 500,
      message: 'Falta dependencia @react-pdf/renderer. Ejecute: npm install @react-pdf/renderer',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
}
