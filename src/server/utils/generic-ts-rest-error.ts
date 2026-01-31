import { ZodError } from 'zod';
import type { TsRestError } from '@/schemas/ts-rest';
import { env } from '@/env';

export type TsRestErrorStatus = 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500;

type GenericErrorOptions = {
  genericMsg: string;
  logPrefix?: string;
};

// ---- TYPE GUARDS ----
export function isError(e: unknown): e is Error {
  return e instanceof Error;
}

type HttpError = {
  status: number;
  message?: unknown;
  code?: unknown;
};

function isHttpError(e: unknown): e is HttpError {
  if (typeof e !== 'object' || e === null) return false;
  const candidate = e as { status?: unknown };
  return typeof candidate.status === 'number';
}

export function throwHttpError(err: HttpError): never {
  throw err;
}

// ---- MAIN HELPER ----

/**
 * Helper genérico para manejar errores en handlers ts-rest.
 * Devuelve { status, body } en el shape de TsRestError.
 */
export function genericTsRestErrorResponse(
  error: unknown,
  { genericMsg, logPrefix = '[ts-rest]' }: GenericErrorOptions
): { status: TsRestErrorStatus; body: TsRestError } {
  const isProd = env.NODE_ENV === 'production';

  // ---- LOGGING ----
  if (!isProd) {
    console.error(logPrefix, error);
  }

  // 1) Errores de validación Zod (body/query)
  if (error instanceof ZodError) {
    return {
      status: 400,
      body: {
        message: 'Invalid request payload',
        code: 'BAD_REQUEST',
        details: error.flatten(),
      },
    };
  }

  // 2) Objeto con status explícito (HTTP-like error)
  if (isHttpError(error)) {
    const status = normalizeStatus(error.status);

    const message =
      typeof error.message === 'string' && error.message.length > 0 ? error.message : genericMsg;

    const code = typeof error.code === 'string' && error.code.length > 0 ? error.code : undefined;

    return {
      status,
      body: {
        message,
        code,
      },
    };
  }

  // 3) Error normal (Error)
  if (isError(error)) {
    return {
      status: 500,
      body: {
        message: genericMsg,
        code: 'INTERNAL_ERROR',
      },
    };
  }

  // 4) Fallback: error inesperado → 500
  const originalMessage = error instanceof Error ? error.message : String(error ?? '');

  const message = !isProd && originalMessage ? `${genericMsg} (${originalMessage})` : genericMsg;

  return {
    status: 500,
    body: {
      message,
      code: 'INTERNAL_ERROR',
    },
  };
}

function normalizeStatus(status: number): TsRestErrorStatus {
  if (
    status === 400 ||
    status === 401 ||
    status === 403 ||
    status === 404 ||
    status === 409 ||
    status === 422 ||
    status === 429
  ) {
    return status;
  }
  return 500;
}
