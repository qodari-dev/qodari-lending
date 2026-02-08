export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === 'number' ? value : Number(value);
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

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
