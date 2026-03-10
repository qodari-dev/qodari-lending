import { ZodError } from 'zod';
import type { TsRestError } from '@/schemas/ts-rest';
import { env } from '@/env';

export type TsRestErrorStatus = 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500;

type GenericErrorOptions = {
  genericMsg: string;
  logPrefix?: string;
};

type DatabaseErrorResponse = { status: TsRestErrorStatus; body: TsRestError };
type DatabaseErrorNormalizer = (error: unknown) => DatabaseErrorResponse | null;

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

type PostgresErrorLike = {
  code: string;
  constraint?: string;
  detail?: string;
  column?: string;
  table?: string;
};

function isPostgresErrorLike(error: unknown): error is PostgresErrorLike {
  if (typeof error !== 'object' || error === null) return false;
  const candidate = error as { code?: unknown };
  return typeof candidate.code === 'string' && /^[0-9A-Z]{5}$/i.test(candidate.code);
}

function humanizeIdentifier(value: string): string {
  return value
    .trim()
    .replace(/^(uniq|chk|fk|idx)_/i, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ');
}

function formatConstraintHint(constraint?: string): string {
  if (!constraint) return '';
  return ` (${humanizeIdentifier(constraint)})`;
}

function buildDuplicateValueMessage(detail?: string, constraint?: string): string {
  const match = detail?.match(/^Key \((.+)\)=\((.+)\) already exists\.$/i);
  if (!match) {
    return `Ya existe un registro con un valor único ya registrado${formatConstraintHint(constraint)}.`;
  }

  const fields = match[1]
    .split(',')
    .map((item) => humanizeIdentifier(item))
    .filter(Boolean);
  const values = match[2]
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const pairs = fields.map((field, index) => `${field} = ${values[index] ?? '?'}`);
  if (!pairs.length) {
    return `Ya existe un registro con un valor único ya registrado${formatConstraintHint(constraint)}.`;
  }

  return `Ya existe un registro con ${pairs.join(', ')}.`;
}

function normalizePostgresError(error: unknown): DatabaseErrorResponse | null {
  if (!isPostgresErrorLike(error)) return null;

  switch (error.code.toUpperCase()) {
    case '23502':
      return {
        status: 400,
        body: {
          message: error.column
            ? `El campo ${humanizeIdentifier(error.column)} es obligatorio.`
            : 'Falta un valor obligatorio para guardar el registro.',
          code: 'BAD_REQUEST',
        },
      };
    case '23503':
      return {
        status: 409,
        body: {
          message: `No se puede completar la operación por una referencia relacionada inválida${formatConstraintHint(error.constraint)}.`,
          code: 'CONFLICT',
        },
      };
    case '23505':
      return {
        status: 409,
        body: {
          message: buildDuplicateValueMessage(error.detail, error.constraint),
          code: 'CONFLICT',
        },
      };
    case '23514':
      return {
        status: 400,
        body: {
          message: `No se puede guardar porque no se cumple una validación de datos${formatConstraintHint(error.constraint)}.`,
          code: 'BAD_REQUEST',
        },
      };
    case '22001':
      return {
        status: 400,
        body: {
          message: 'Uno de los campos supera la longitud permitida.',
          code: 'BAD_REQUEST',
        },
      };
    case '22003':
      return {
        status: 400,
        body: {
          message: 'Uno de los valores numéricos está fuera del rango permitido.',
          code: 'BAD_REQUEST',
        },
      };
    case '22P02':
      return {
        status: 400,
        body: {
          message: 'Uno de los valores tiene un formato inválido.',
          code: 'BAD_REQUEST',
        },
      };
    default:
      return null;
  }
}

const DATABASE_ERROR_NORMALIZERS: DatabaseErrorNormalizer[] = [normalizePostgresError];

function getErrorChain(error: unknown, maxDepth = 8): unknown[] {
  const chain: unknown[] = [];
  let current: unknown = error;
  let depth = 0;

  while (current !== undefined && current !== null && depth < maxDepth) {
    chain.push(current);

    if (typeof current !== 'object' || current === null || !('cause' in current)) {
      break;
    }

    current = (current as { cause?: unknown }).cause;
    depth += 1;
  }

  return chain;
}

function normalizeDatabaseError(error: unknown): DatabaseErrorResponse | null {
  for (const candidate of getErrorChain(error)) {
    for (const normalizer of DATABASE_ERROR_NORMALIZERS) {
      const result = normalizer(candidate);
      if (result) return result;
    }
  }

  return null;
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

  // 1.5) Errores de base de datos (ej. PostgreSQL), sanitizados y centralizados
  const databaseError = normalizeDatabaseError(error);
  if (databaseError) {
    return databaseError;
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
