// ============================================
// String normalization helpers (server-side)
// ============================================

/**
 * Trim string, convert empty → null. Useful for nullable DB text columns.
 */
export function toNullableString(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

/**
 * Remove non-alphanumeric chars and uppercase. For document numbers, IDs, etc.
 */
export function normalizeDocumentNumber(value: string): string {
  return value.trim().replace(/[^\dA-Za-z]/g, '').toUpperCase();
}

/**
 * Trim + uppercase. For credit numbers, period codes, etc.
 */
export function normalizeUpperCase(value: string): string {
  return value.trim().toUpperCase();
}
