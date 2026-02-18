export type NumericInput = string | number | null | undefined;

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function toSafeNumber(value: NumericInput): number {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

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

export function parseDecimalString(value: string): number | null {
  const normalized = normalizeDecimalInput(value);
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}
