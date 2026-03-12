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
 * Remove non-digit chars. Returns null if result is empty.
 * For documents that only contain digits (CC, NIT, etc.).
 */
export function normalizeDigitsOnly(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().replace(/\D/g, '');
  return normalized.length ? normalized : null;
}

/**
 * Remove non-alphanumeric chars + uppercase. Returns null if empty.
 * For documents that may contain letters (passports, etc.).
 */
export function normalizeAlphanumericDocument(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().replace(/[^\dA-Za-z]/g, '').toUpperCase();
  return normalized.length ? normalized : null;
}

/**
 * Trim + uppercase. For credit numbers, period codes, etc.
 */
export function normalizeUpperCase(value: string): string {
  return value.trim().toUpperCase();
}

/**
 * Build a full name from name parts, filtering nulls/empty and collapsing spaces.
 * Returns fallback if all parts are empty.
 */
export function buildFullName(
  parts: Array<string | null | undefined>,
  fallback = 'Afiliado'
): string {
  const value = parts
    .map((part) => (part ?? '').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  return value || fallback;
}

/**
 * Parse various date string formats to YYYY-MM-DD.
 * Supports: YYYY-MM-DD, YYYYMMDD, ISO 8601.
 * Returns null for invalid/empty input.
 */
export function parseDateToISO(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  if (/^\d{8}$/.test(trimmed)) {
    return `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}`;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

/**
 * Calculate age in years from a birth date string.
 * Returns null for invalid/empty input or negative age.
 */
export function calculateAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;

  const parsed = new Date(birthDate);
  if (Number.isNaN(parsed.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - parsed.getFullYear();
  const monthDiff = now.getMonth() - parsed.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < parsed.getDate())) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

/**
 * Calculate the number of months between two dates (inclusive).
 * If fromDate is null, returns 0. If toDate is null, uses current date.
 */
export function monthsDiff(fromDate: string | null, toDate: string | null): number {
  if (!fromDate) return 0;
  const from = new Date(fromDate);
  const to = toDate ? new Date(toDate) : new Date();

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) {
    return 0;
  }

  const years = to.getFullYear() - from.getFullYear();
  const months = to.getMonth() - from.getMonth();
  return Math.max(0, years * 12 + months + 1);
}
