// ============================================
// CSV / flat-file parsing helpers
// ============================================

export type CsvDelimiter = ';' | ',' | '\t' | ' - ';

/**
 * Detect the delimiter of a CSV line by checking for common separators.
 */
export function detectDelimiter(firstLine: string): CsvDelimiter {
  if (firstLine.includes(';')) return ';';
  if (firstLine.includes('\t')) return '\t';
  if (firstLine.includes(',')) return ',';
  return ' - ';
}

/**
 * Split a line using the given delimiter.
 */
export function splitLine(line: string, delimiter: CsvDelimiter): string[] {
  if (delimiter === ' - ') {
    return line.split(/\s+-\s+/g);
  }
  return line.split(delimiter);
}

/**
 * Parse a flexible date string into `yyyy-mm-dd`.
 * Accepts: yyyy-mm-dd, dd/mm/yyyy, dd-mm-yyyy.
 * Returns null if invalid.
 */
export function parsePaymentDate(input: string): string | null {
  const value = input.trim();
  let yyyy = '';
  let mm = '';
  let dd = '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    [yyyy, mm, dd] = value.split('-');
  } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    [dd, mm, yyyy] = value.split('/');
  } else if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
    [dd, mm, yyyy] = value.split('-');
  } else {
    return null;
  }

  const asNumberYear = Number(yyyy);
  const asNumberMonth = Number(mm);
  const asNumberDay = Number(dd);
  const date = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== asNumberYear ||
    date.getMonth() + 1 !== asNumberMonth ||
    date.getDate() !== asNumberDay
  ) {
    return null;
  }

  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Parse a currency/amount string with flexible decimal/thousand separators.
 * Returns null if the value is invalid or <= 0.
 */
export function parsePaymentAmount(input: string): number | null {
  const raw = input.trim().replace(/[^\d,.-]/g, '');
  if (!raw) return null;

  let normalized = raw;
  const lastComma = normalized.lastIndexOf(',');
  const lastDot = normalized.lastIndexOf('.');

  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = normalized.replace(/,/g, '');
    }
  } else if (lastComma !== -1) {
    normalized = normalized.replace(',', '.');
  }

  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}
