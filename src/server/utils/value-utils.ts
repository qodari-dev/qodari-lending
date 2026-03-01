import { normalizeDecimalInput, roundMoney } from '@/utils/number-utils';

export { roundMoney };

export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;

  const normalized = normalizeDecimalInput(value);
  if (!normalized) return Number.NaN;

  return Number(normalized);
}

export function toDecimalString(value: string | number | null | undefined): string {
  const n = toNumber(value);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

export function toRateString(value: number): string {
  return Number.isFinite(value) ? value.toString() : '0';
}

export function formatDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function toDbDate(value: Date | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return formatDateOnly(value);
}

// ============================================
// ISO / Date coercion
// ============================================

export function toIsoString(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return value.toISOString();
}

// ============================================
// Type coercion (unknown → primitive)
// ============================================

export function toInteger(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.trunc(value) : 0;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
  }
  return 0;
}

export function toNullableInteger(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.trunc(value) : null;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
  }
  return null;
}

export function toSafeString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

// ============================================
// Deterministic seed from string
// ============================================

export function stringToSeed(value: string): number {
  return value.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
}
