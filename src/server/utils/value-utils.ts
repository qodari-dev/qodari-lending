function normalizeDecimalInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const sign = trimmed.startsWith('-') ? '-' : trimmed.startsWith('+') ? '+' : '';
  const unsigned = trimmed.slice(sign.length).replace(/\s+/g, '');
  if (!unsigned || !/^\d[\d.,]*$/.test(unsigned)) return null;

  const lastDot = unsigned.lastIndexOf('.');
  const lastComma = unsigned.lastIndexOf(',');

  if (lastDot === -1 && lastComma === -1) {
    return `${sign}${unsigned}`;
  }

  if (lastDot !== -1 && lastComma !== -1) {
    const decimalIndex = Math.max(lastDot, lastComma);
    const integerPart = unsigned.slice(0, decimalIndex).replace(/[.,]/g, '');
    const decimalPart = unsigned.slice(decimalIndex + 1).replace(/[.,]/g, '');
    if (!integerPart || !decimalPart) return null;
    return `${sign}${integerPart}.${decimalPart}`;
  }

  const separator = lastComma !== -1 ? ',' : '.';
  const parts = unsigned.split(separator);
  if (parts.some((part) => part.length === 0)) return null;

  if (parts.length === 2) {
    const [left, right] = parts;
    if (right.length === 3 && left.length <= 3) {
      return `${sign}${left}${right}`;
    }
    return `${sign}${left}.${right}`;
  }

  const allThousands = parts.slice(1).every((part) => part.length === 3);
  if (allThousands) {
    return `${sign}${parts.join('')}`;
  }

  const integerPart = parts.slice(0, -1).join('');
  const decimalPart = parts.at(-1);
  if (!integerPart || !decimalPart) return null;

  return `${sign}${integerPart}.${decimalPart}`;
}

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

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
