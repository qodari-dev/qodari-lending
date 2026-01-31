import { isErrorResponse } from '@ts-rest/core';

type ErrorBodyWithMessage = {
  message?: string;
};

export function getTsRestErrorMessage(error: unknown | null | undefined): string {
  if (!error) {
    return 'Ocurrió un error inesperado';
  }

  // Error de ts-rest (ErrorResponse)
  if (isErrorResponse(error)) {
    const body = error.body as ErrorBodyWithMessage;

    if (body.message && typeof body.message === 'string') {
      return body.message;
    }
  }

  // Error normal de JS/TS
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Ocurrió un error inesperado';
}
