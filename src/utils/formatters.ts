import { format, formatDistanceToNow, formatRelative, isValid, parseISO } from 'date-fns';

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_LOCALE = 'en-US';
const DEFAULT_CURRENCY = 'USD';

// ============================================================================
// Date Formatters (date-fns)
// ============================================================================

type DateInput = Date | string | number | null | undefined;

/**
 * Parsea cualquier input a Date
 */
function toDate(value: DateInput): Date | null {
  if (!value) return null;
  const date = typeof value === 'string' ? parseISO(value) : new Date(value);
  return isValid(date) ? date : null;
}

/**
 * Fecha corta: Jan 15, 2025
 */
export function formatDate(value: DateInput): string {
  const date = toDate(value);
  if (!date) return '—';
  return format(date, 'PP'); // Jan 15, 2025
}

/**
 * Fecha larga: January 15, 2025
 */
export function formatDateLong(value: DateInput): string {
  const date = toDate(value);
  if (!date) return '—';
  return format(date, 'PPPP'); // Wednesday, January 15th, 2025
}

/**
 * Fecha con hora: Jan 15, 2025, 3:30 PM
 */
export function formatDateTime(value: DateInput): string {
  const date = toDate(value);
  if (!date) return '—';
  return format(date, 'PPp'); // Jan 15, 2025, 3:30 PM
}

/**
 * Solo hora: 3:30 PM
 */
export function formatTime(value: DateInput): string {
  const date = toDate(value);
  if (!date) return '—';
  return format(date, 'p'); // 3:30 PM
}

/**
 * Fecha relativa: 2 hours ago, in 3 days
 */
export function formatRelativeTime(value: DateInput): string {
  const date = toDate(value);
  if (!date) return '—';
  return formatDistanceToNow(date, { addSuffix: true }); // 2 hours ago
}

/**
 * Fecha relativa con contexto: yesterday at 3:30 PM, last Friday
 */
export function formatRelativeDate(value: DateInput): string {
  const date = toDate(value);
  if (!date) return '—';
  return formatRelative(date, new Date()); // yesterday at 3:30 PM
}

/**
 * ISO format: 2025-01-15
 */
export function formatDateISO(value: DateInput): string {
  const date = toDate(value);
  if (!date) return '';
  return format(date, 'yyyy-MM-dd');
}

/**
 * Custom format
 */
export function formatDateCustom(value: DateInput, formatStr: string): string {
  const date = toDate(value);
  if (!date) return '—';
  return format(date, formatStr);
}

/**
 * Format expiry
 */
export const formatExpiry = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes === 0) return `${secs} seconds`;
  if (secs === 0) return `${minutes} minutes`;
  return `${minutes} minutes ${secs} seconds`;
};

// ============================================================================
// Currency / Number Formatters (Intl)
// ============================================================================

type NumberInput = number | string | null | undefined;

interface CurrencyOptions {
  currency?: string;
  locale?: string;
  decimals?: number;
}

function toNumber(value: NumberInput): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(num) ? null : num;
}

/**
 * Moneda: $1,234.56
 */
export function formatCurrency(value: NumberInput, options: CurrencyOptions = {}): string {
  const num = toNumber(value);
  if (num === null) return '—';

  return new Intl.NumberFormat(options.locale ?? DEFAULT_LOCALE, {
    style: 'currency',
    currency: options.currency ?? DEFAULT_CURRENCY,
    minimumFractionDigits: options.decimals ?? 2,
    maximumFractionDigits: options.decimals ?? 2,
  }).format(num);
}

/**
 * Moneda compacta: $1.2K, $3.5M
 */
export function formatCurrencyCompact(value: NumberInput, options: CurrencyOptions = {}): string {
  const num = toNumber(value);
  if (num === null) return '—';

  return new Intl.NumberFormat(options.locale ?? DEFAULT_LOCALE, {
    style: 'currency',
    currency: options.currency ?? DEFAULT_CURRENCY,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(num);
}

/**
 * Número con separadores: 1,234,567
 */
export function formatNumber(value: NumberInput, decimals = 0): string {
  const num = toNumber(value);
  if (num === null) return '—';

  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Porcentaje: 45.5%
 */
export function formatPercent(value: NumberInput, decimals = 0): string {
  const num = toNumber(value);
  if (num === null) return '—';

  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num / 100);
}

/**
 * Número compacto: 1.2K, 3.5M
 */
export function formatCompact(value: NumberInput): string {
  const num = toNumber(value);
  if (num === null) return '—';

  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(num);
}

/**
 * Bytes: 1.5 GB
 */
export function formatBytes(bytes: NumberInput, decimals = 1): string {
  const num = toNumber(bytes);
  if (num === null || num === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(num) / Math.log(k));

  return `${(num / Math.pow(k, i)).toFixed(decimals)} ${sizes[i]}`;
}
