// ============================================
// Error handling helpers (server-side)
// ============================================

/**
 * Safely extract a message from an unknown error value.
 * Returns `fallback` when no usable message can be found.
 */
export function extractUnknownErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message.trim();
    }
  }

  return fallback;
}
